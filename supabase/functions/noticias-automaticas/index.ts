// Edge function: notícias automáticas (pedido do Filipe em 28/10/2026: "não
// quero revisar as notícias, mandar direto").
//
// Chamada pelo pg_cron três vezes por dia (migration 20261028120000). Lê os
// feeds, pede à IA a triagem e o resumo de cada matéria nova, confere o resumo
// (tamanho, números que existem na matéria, frase copiada) e publica com foto
// de licença livre do Wikimedia Commons ou, sem foto, com a arte do GTORei
// (/api/capa no site). Resumo que não passa na checagem fica como rascunho
// em /admin → Notícias, com o motivo; descartada também fica registrada, para
// não ser lida de novo.
//
// Responde na hora e trabalha em segundo plano (EdgeRuntime.waitUntil): o
// pg_net não espera dois minutos. Quem chama com a chave pública só consegue
// processar matéria que ainda não foi lida, que é o que o agendamento já faria.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  AGENTE,
  FONTES,
  PROMPT_RESUMO,
  PROMPT_TRIAGEM,
  SITE,
  buscaNoCommons,
  checarResumo,
  escolherFotoDoCommons,
  lerJsonDaIa,
  lerRss,
  pedidoDeResumo,
  pedidoDeTriagem,
  slugDaNoticia,
  textoDaMateria,
  type ItemDaFonte,
} from './logica.ts';

// Matérias das últimas 36 h; no máximo 4 resumos por rodada (cabe no tempo da função)
const JANELA_MS = 36 * 60 * 60 * 1000;
const MAX_RESUMOS = 4;
const MODELO = 'google/gemini-3-flash-preview';

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

async function buscarTexto(url: string, ms = 10000): Promise<string> {
  const controle = new AbortController();
  const prazo = setTimeout(() => controle.abort(), ms);
  try {
    const r = await fetch(url, { signal: controle.signal, headers: { 'User-Agent': AGENTE } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(prazo);
  }
}

async function perguntar<T>(chave: string, sistema: string, usuario: string): Promise<T | null> {
  const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chave}` },
    body: JSON.stringify({
      model: MODELO,
      messages: [
        { role: 'system', content: sistema },
        { role: 'user', content: usuario },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!r.ok) {
    console.error('Gateway de IA', r.status, await r.text());
    return null;
  }
  const j = await r.json();
  return lerJsonDaIa<T>(j?.choices?.[0]?.message?.content ?? '');
}

/** Foto do Commons copiada para o bucket "noticias" (a página não depende do Wikimedia) */
async function fotoDoCommons(db: SupabaseClient, id: string, nome: string): Promise<{ url: string; credito: string } | null> {
  try {
    const busca = JSON.parse(await buscarTexto(buscaNoCommons(nome)));
    const foto = escolherFotoDoCommons(busca, nome);
    if (!foto?.url) return null;
    const r = await fetch(foto.url, { headers: { 'User-Agent': AGENTE } });
    if (!r.ok) return null;
    const tipo = r.headers.get('content-type')?.includes('png') ? 'image/png' : 'image/jpeg';
    const caminho = `${id}/commons.${tipo === 'image/png' ? 'png' : 'jpg'}`;
    const { error } = await db.storage.from('noticias').upload(caminho, await r.arrayBuffer(), { contentType: tipo, upsert: true });
    if (error) throw error;
    return { url: db.storage.from('noticias').getPublicUrl(caminho).data.publicUrl, credito: foto.credito };
  } catch (e) {
    console.warn('Sem foto do Commons para', nome, e);
    return null;
  }
}

async function rodar(db: SupabaseClient, chaveIa: string) {
  const relatorio = { novas: 0, publicadas: [] as string[], rascunhos: [] as string[], descartadas: 0 };

  // 1. Feeds
  const lidos = await Promise.allSettled(FONTES.map(async (f) => lerRss(await buscarTexto(f.url), f.nome)));
  const desde = Date.now() - JANELA_MS;
  const doFeed = lidos
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .filter((it) => it.data && Date.parse(it.data) >= desde);
  if (doFeed.length === 0) return relatorio;

  // 2. Só o que nunca passou por aqui (publicada, rascunho ou descartada)
  const { data: conhecidas, error: e1 } = await db.from('noticias').select('link').in('link', doFeed.map((i) => i.link));
  if (e1) throw e1;
  const jaVistos = new Set((conhecidas ?? []).map((n) => n.link));
  const novas = doFeed.filter((it) => !jaVistos.has(it.link));
  relatorio.novas = novas.length;
  if (novas.length === 0) return relatorio;

  const { data: recentes } = await db
    .from('noticias')
    .select('titulo')
    .eq('status', 'publicada')
    .gte('publicada_em', new Date(Date.now() - 4 * 86400000).toISOString());
  const publicadas = (recentes ?? []).map((n) => n.titulo as string).filter(Boolean);

  // 3. Triagem de todas de uma vez (uma chamada à IA)
  const triagem = await perguntar<{ itens?: { i: number; decisao: string; motivo?: string }[] }>(
    chaveIa,
    PROMPT_TRIAGEM,
    pedidoDeTriagem(novas, publicadas),
  );
  if (!triagem?.itens) throw new Error('triagem sem resposta');
  const decisao = new Map(triagem.itens.map((d) => [d.i, d]));

  const registrar = (it: ItemDaFonte, extra: Record<string, unknown>) =>
    db
      .from('noticias')
      .insert({ link: it.link, fonte: it.fonte, titulo_fonte: it.titulo, trecho_fonte: it.trecho, publicada_na_fonte: it.data, ...extra })
      .select('id')
      .maybeSingle();

  const paraResumir: ItemDaFonte[] = [];
  for (const [i, it] of novas.entries()) {
    const d = decisao.get(i);
    if (d?.decisao === 'resumir' && paraResumir.length < MAX_RESUMOS) paraResumir.push(it);
    else if (d?.decisao === 'descartar') {
      await registrar(it, { status: 'descartada', motivo: d.motivo ?? 'descartada na triagem' });
      relatorio.descartadas++;
    }
    // Sem decisão, ou além do limite da rodada: fica para a próxima
  }

  // 4. Resumo, checagem, foto e publicação, uma de cada vez
  for (const it of paraResumir) {
    // Reserva o link antes de gastar IA: duas rodadas juntas não fazem a mesma
    const { data: reserva } = await registrar(it, { status: 'rascunho', motivo: 'em processamento' });
    if (!reserva) continue;
    const id = reserva.id as string;

    let texto = '';
    try {
      texto = textoDaMateria(await buscarTexto(it.link));
    } catch (e) {
      console.warn('Matéria ilegível', it.link, e);
    }
    if (texto.length < 300) {
      await db.from('noticias').update({ status: 'descartada', motivo: 'não deu para ler o texto da matéria' }).eq('id', id);
      relatorio.descartadas++;
      continue;
    }

    type Resposta = { titulo?: string; resumo?: string; jogador_principal?: string | null; descartar?: string };
    const fonte = `${it.titulo}\n${it.trecho}\n${texto}`;
    let resposta = await perguntar<Resposta>(chaveIa, PROMPT_RESUMO, pedidoDeResumo(it, texto, publicadas));
    if (resposta?.descartar) {
      await db.from('noticias').update({ status: 'descartada', motivo: resposta.descartar }).eq('id', id);
      relatorio.descartadas++;
      continue;
    }
    let erros = resposta ? checarResumo(resposta.titulo ?? '', resposta.resumo ?? '', fonte) : ['a IA não respondeu'];
    // Uma segunda chance, mostrando o que estava errado
    if (erros.length && resposta) {
      const segunda = await perguntar<Resposta>(chaveIa, PROMPT_RESUMO, pedidoDeResumo(it, texto, publicadas, erros));
      if (segunda?.titulo && segunda.resumo) {
        resposta = segunda;
        erros = checarResumo(segunda.titulo, segunda.resumo, fonte);
      }
    }
    if (!resposta?.titulo || !resposta.resumo) {
      // Falha da IA: libera o link para a próxima rodada tentar de novo
      await db.from('noticias').delete().eq('id', id);
      continue;
    }

    const titulo = resposta.titulo.trim();
    const resumo = resposta.resumo.trim();
    if (erros.length) {
      await db.from('noticias').update({ titulo, resumo, motivo: `não passou na checagem: ${erros.join('; ')}` }).eq('id', id);
      relatorio.rascunhos.push(titulo);
      continue;
    }

    const slug = slugDaNoticia(titulo, id);
    const foto = resposta.jogador_principal ? await fotoDoCommons(db, id, resposta.jogador_principal) : null;
    const { error } = await db
      .from('noticias')
      .update({
        titulo,
        resumo,
        slug,
        status: 'publicada',
        publicada_em: new Date().toISOString(),
        motivo: null,
        imagem_url: foto?.url ?? `${SITE}/api/capa?slug=${slug}`,
        imagem_credito: foto?.credito ?? 'Arte: GTORei',
      })
      .eq('id', id);
    if (error) {
      console.error('Falha ao publicar', it.link, error);
      await db.from('noticias').update({ titulo, resumo, motivo: `erro ao publicar: ${error.message}` }).eq('id', id);
      relatorio.rascunhos.push(titulo);
      continue;
    }
    publicadas.push(titulo);
    relatorio.publicadas.push(titulo);
  }
  return relatorio;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 });
  const url = Deno.env.get('SUPABASE_URL');
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const chaveIa = Deno.env.get('LOVABLE_API_KEY');
  if (!url || !servico || !chaveIa) return new Response('Serviço indisponível', { status: 500 });

  const db = createClient(url, servico, { auth: { persistSession: false } });
  const trabalho = rodar(db, chaveIa)
    .then((r) => console.log('Notícias automáticas:', JSON.stringify(r)))
    .catch((e) => console.error('Notícias automáticas falharam:', e));

  if (typeof EdgeRuntime !== 'undefined') {
    EdgeRuntime.waitUntil(trabalho);
    return new Response(JSON.stringify({ ok: true, em: 'segundo plano' }), { status: 202, headers: { 'Content-Type': 'application/json' } });
  }
  await trabalho;
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
});
