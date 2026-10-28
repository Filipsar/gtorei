import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ExternalLink, FileUp, ImagePlus, Loader2, Newspaper, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { gerarImagemDaNoticia } from '@/lib/imagemDaNoticia';
import {
  MAXIMO_DA_IMAGEM,
  MINIMO_DO_RESUMO,
  ehImagemGerada,
  lerImportacao,
  slugDaNoticia,
  type ItemDoFeed,
  type Noticia,
} from '@/lib/noticias';
import { cn } from '@/lib/utils';

type Filtro = Noticia['status'];
interface Texto {
  titulo: string;
  resumo: string;
  imagem_url: string | null;
  imagem_credito: string;
  /** Título com que a imagem gerada foi feita: mudou o título, ela é refeita */
  tituloDaImagem: string | null;
}

const ROTULO: Record<Filtro, string> = { rascunho: 'Rascunhos', publicada: 'Publicadas', descartada: 'Descartadas' };
const TIPOS_DE_IMAGEM = ['image/png', 'image/jpeg', 'image/webp'];

const quando = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'sem data';

const pronto = (t: Texto | undefined) => !!t && t.titulo.trim().length >= 10 && t.resumo.trim().length >= MINIMO_DO_RESUMO;

/** Sobe a imagem para o bucket 'noticias' e devolve o endereço público */
async function enviarImagem(id: string, arquivo: Blob, tipo: string, origem: 'gerada' | 'enviada'): Promise<string> {
  const extensao = tipo === 'image/png' ? 'png' : tipo === 'image/webp' ? 'webp' : 'jpg';
  const caminho = `${id}/${origem}-${Date.now()}.${extensao}`;
  const { error } = await supabase.storage.from('noticias').upload(caminho, arquivo, { contentType: tipo });
  if (error) throw error;
  return supabase.storage.from('noticias').getPublicUrl(caminho).data.publicUrl;
}

/**
 * Os campos que publicar grava. Sem imagem própria, entra a do GTORei com o
 * título (gerada agora, ou refeita se o título mudou). O endereço (slug) não
 * muda depois de publicado.
 */
async function camposDePublicar(n: Noticia, t: Texto): Promise<Partial<Noticia>> {
  const agora = new Date().toISOString();
  const titulo = t.titulo.trim();
  let imagem = t.imagem_url;
  if (!imagem || (ehImagemGerada(imagem) && t.tituloDaImagem !== titulo)) {
    imagem = await enviarImagem(n.id, await gerarImagemDaNoticia(titulo), 'image/jpeg', 'gerada');
  }
  return {
    status: 'publicada',
    titulo,
    resumo: t.resumo.trim(),
    slug: n.slug ?? slugDaNoticia(titulo, n.id),
    publicada_em: n.publicada_em ?? agora,
    atualizada_em: agora,
    imagem_url: imagem,
    imagem_credito: ehImagemGerada(imagem) ? null : t.imagem_credito.trim() || null,
  };
}

/**
 * /admin → Notícias: as matérias dos feeds chegam como rascunho; o admin
 * escreve título e resumo com as próprias palavras e publica em /noticias.
 * Dá para marcar várias, escrever os resumos em sequência e publicar todas de
 * uma vez. O trecho do feed é só para decidir: a página nunca mostra o texto
 * da fonte, e a foto da fonte não é usada (sem imagem própria, entra a do
 * GTORei).
 */
export function AdminNoticias() {
  const [lista, setLista] = useState<Noticia[] | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('rascunho');
  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  // Editores abertos e o texto de cada notícia ficam aqui em cima: fechar um
  // editor ou publicar em lote não perde o que já foi escrito
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [textos, setTextos] = useState<Record<string, Texto>>({});

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('noticias').select('*').order('criada_em', { ascending: false }).limit(300);
    if (error) {
      setAviso('A tabela de notícias ainda não existe: aplique a migration 20261024160000_noticias.sql.');
      setLista([]);
      return;
    }
    setLista(data as Noticia[]);
  }, []);

  // Busca os feeds (api/rss.ts) e grava o que é novo como rascunho
  const buscarNovas = useCallback(async () => {
    setBuscando(true);
    try {
      const resposta = await fetch('/api/rss');
      if (!resposta.ok || !resposta.headers.get('content-type')?.includes('json')) throw new Error('sem coleta');
      const { itens, erros } = (await resposta.json()) as { itens: ItemDoFeed[]; erros: string[] };
      const linhas = itens.map((i) => ({
        link: i.link,
        fonte: i.fonte,
        titulo_fonte: i.titulo,
        trecho_fonte: i.trecho || null,
        publicada_na_fonte: i.data,
      }));
      const { data, error } = await supabase.from('noticias').upsert(linhas, { onConflict: 'link', ignoreDuplicates: true }).select('id');
      if (error) throw error;
      const novas = data?.length ?? 0;
      setAviso(
        `${novas === 0 ? 'Nenhuma notícia nova' : novas === 1 ? '1 notícia nova' : `${novas} notícias novas`} nos feeds.` +
          (erros.length ? ` Sem resposta: ${erros.join(', ')}.` : '')
      );
    } catch {
      setAviso('A busca nos feeds só funciona no site publicado (função /api/rss do Vercel).');
    } finally {
      setBuscando(false);
      void carregar();
    }
  }, [carregar]);

  useEffect(() => {
    void carregar().then(() => buscarNovas());
  }, [carregar, buscarNovas]);

  const [importando, setImportando] = useState(false);
  const [textoParaImportar, setTextoParaImportar] = useState('');

  /**
   * Resumos prontos: cria a notícia que o feed ainda não trouxe e preenche
   * título e resumo dos rascunhos. As importadas ficam marcadas, prontas para
   * "Publicar".
   */
  const importar = async (texto: string) => {
    const { itens, erros } = lerImportacao(texto);
    if (itens.length === 0) {
      toast.error(erros[0] ?? 'Nada para importar.');
      return;
    }
    setSalvando(true);
    const { error } = await supabase.from('noticias').upsert(
      itens.map((i) => ({ link: i.link, fonte: i.fonte, titulo_fonte: i.titulo_fonte, publicada_na_fonte: i.publicada_na_fonte })),
      { onConflict: 'link', ignoreDuplicates: true }
    );
    const resultados = error
      ? []
      : await Promise.all(
          itens.map((i) =>
            supabase.from('noticias').update({ titulo: i.titulo, resumo: i.resumo }).eq('link', i.link).eq('status', 'rascunho').select('id')
          )
        );
    const ids = resultados.flatMap((r) => r.data?.map((d) => d.id) ?? []);
    setSalvando(false);
    if (error) {
      toast.error('Não deu para importar agora. Tente de novo.');
      return;
    }
    // O texto que estava aberto no editor daria lugar ao importado
    setTextos((t) => Object.fromEntries(Object.entries(t).filter(([id]) => !ids.includes(id))));
    await carregar();
    setFiltro('rascunho');
    setMarcadas(new Set(ids));
    setImportando(false);
    setTextoParaImportar('');
    const intactas = itens.length - ids.length;
    toast.success(
      `${ids.length === 1 ? '1 resumo importado' : `${ids.length} resumos importados`} e marcados para publicar` +
        (intactas > 0 ? `; ${intactas} já publicadas ou descartadas ficaram como estavam` : '') +
        (erros.length ? `; ${erros.length} com problema (${erros[0]})` : '') +
        '.'
    );
  };

  const escolherArquivoDeResumos = (e: ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    void arquivo.text().then(setTextoParaImportar);
  };

  // O rascunho começa com o título em branco: o da fonte aparece só como
  // referência, para o título publicado ser em português e com as suas palavras
  const textoDe = (n: Noticia): Texto =>
    textos[n.id] ?? {
      titulo: n.titulo ?? '',
      resumo: n.resumo ?? '',
      imagem_url: n.imagem_url ?? null,
      imagem_credito: n.imagem_credito ?? '',
      tituloDaImagem: n.titulo,
    };
  const mudarTexto = (id: string, t: Texto) => setTextos((antes) => ({ ...antes, [id]: t }));
  const alternar = (conjunto: Set<string>, id: string) => {
    const novo = new Set(conjunto);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    return novo;
  };

  /** Aplica os campos em várias de uma vez; devolve quantas deram certo */
  const aplicar = async (alvos: { n: Noticia; campos: Partial<Noticia> }[]) => {
    const resultados = await Promise.all(alvos.map(({ n, campos }) => supabase.from('noticias').update(campos).eq('id', n.id)));
    const certas = alvos.filter((_, i) => !resultados[i].error);
    const ids = new Set(certas.map(({ n }) => n.id));
    setAbertas((a) => new Set([...a].filter((id) => !ids.has(id))));
    setMarcadas((m) => new Set([...m].filter((id) => !ids.has(id))));
    setTextos((t) => Object.fromEntries(Object.entries(t).filter(([id]) => !ids.has(id))));
    void carregar();
    return { certas: certas.length, falhas: alvos.length - certas.length };
  };

  const mudarUma = async (n: Noticia, campos: Partial<Noticia>, mensagem: string) => {
    setSalvando(true);
    const { falhas } = await aplicar([{ n, campos }]);
    setSalvando(false);
    if (falhas) toast.error('Não deu para salvar. Confira o título e o tamanho do resumo.');
    else toast.success(mensagem);
  };

  /** Publica (ou salva) as notícias dadas, gerando a imagem das que não têm */
  const publicar = async (alvos: Noticia[]) => {
    setSalvando(true);
    const prontos: { n: Noticia; campos: Partial<Noticia> }[] = [];
    let semImagem = 0;
    // Uma de cada vez: cada imagem gerada é um canvas de 1200x630
    for (const n of alvos) {
      try {
        prontos.push({ n, campos: await camposDePublicar(n, textoDe(n)) });
      } catch {
        semImagem += 1;
      }
    }
    const { certas, falhas } = await aplicar(prontos);
    setSalvando(false);
    return { certas, falhas: falhas + semImagem };
  };

  const publicarUma = async (n: Noticia) => {
    const { falhas } = await publicar([n]);
    if (falhas) toast.error('Não deu para publicar. Confira o título, o resumo e a imagem (aplique a migration 20261024170000 se ainda não aplicou).');
    else toast.success(n.status === 'publicada' ? 'Notícia atualizada.' : 'Notícia publicada.');
  };

  const visiveis = useMemo(() => lista?.filter((n) => n.status === filtro) ?? [], [lista, filtro]);
  const selecionadas = visiveis.filter((n) => marcadas.has(n.id));
  const prontas = selecionadas.filter((n) => pronto(textoDe(n)));
  const todasMarcadas = visiveis.length > 0 && selecionadas.length === visiveis.length;
  const contagem = (s: Filtro) => lista?.filter((n) => n.status === s).length ?? 0;

  const publicarSelecionadas = async () => {
    // Da mais antiga para a mais nova na fonte: a mais nova sai por último e fica no topo da lista
    const emOrdem = [...prontas].sort((a, b) => (a.publicada_na_fonte ?? '').localeCompare(b.publicada_na_fonte ?? ''));
    const { certas, falhas } = await publicar(emOrdem);
    const faltam = selecionadas.length - prontas.length;
    toast[falhas ? 'error' : 'success'](
      `${certas === 1 ? '1 publicada' : `${certas} publicadas`}` +
        (falhas ? `; ${falhas} com erro` : '') +
        (faltam > 0 ? `. ${faltam} ainda sem resumo completo.` : '.')
    );
  };

  const emLote = async (status: Filtro, mensagem: string) => {
    setSalvando(true);
    const { certas } = await aplicar(selecionadas.map((n) => ({ n, campos: { status } })));
    setSalvando(false);
    toast.success(`${certas} ${mensagem}`);
  };

  /** Imagem enviada pelo admin: sobe já e fica no texto até publicar */
  const receberImagem = async (n: Noticia, arquivo: File) => {
    if (!TIPOS_DE_IMAGEM.includes(arquivo.type)) {
      toast.error('Use PNG, JPEG ou WebP.');
      return;
    }
    if (arquivo.size > MAXIMO_DA_IMAGEM) {
      toast.error('A imagem precisa ter até 2 MB.');
      return;
    }
    try {
      const url = await enviarImagem(n.id, arquivo, arquivo.type, 'enviada');
      mudarTexto(n.id, { ...textoDe(n), imagem_url: url, tituloDaImagem: null });
    } catch {
      toast.error('Não deu para enviar a imagem (aplique a migration 20261024170000 se ainda não aplicou).');
    }
  };

  /** A imagem do GTORei agora, para ver antes de publicar */
  const gerarAgora = async (n: Noticia) => {
    const t = textoDe(n);
    const titulo = t.titulo.trim() || n.titulo_fonte;
    try {
      const url = await enviarImagem(n.id, await gerarImagemDaNoticia(titulo), 'image/jpeg', 'gerada');
      mudarTexto(n.id, { ...t, imagem_url: url, imagem_credito: '', tituloDaImagem: titulo });
    } catch {
      toast.error('Não deu para gerar a imagem (aplique a migration 20261024170000 se ainda não aplicou).');
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Newspaper className="h-5 w-5 text-primary" /> Notícias
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            As matérias de PokerNews Brasil, PokerNews e CardPlayer chegam aqui. Marque as que quer cobrir, escreva título e resumo em português, com as suas palavras (o que aconteceu e o que muda para quem joga), e publique: cada uma vira página em{' '}
            <a href="/noticias" target="_blank" rel="noopener" className="underline underline-offset-2">
              /noticias
            </a>
            , com imagem e link para a matéria original.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setImportando(true)}>
            <FileUp className="mr-2 h-4 w-4" /> Importar resumos
          </Button>
          <Button variant="outline" onClick={() => void buscarNovas()} disabled={buscando}>
            {buscando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Buscar novas
          </Button>
        </div>
      </div>

      {/* Resumos prontos (o arquivo do dia): colar o texto ou escolher o arquivo */}
      <Dialog open={importando} onOpenChange={setImportando}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar resumos prontos</DialogTitle>
            <DialogDescription>
              Cole o conteúdo do arquivo de resumos (ou escolha o arquivo). Cada notícia entra como rascunho com título e resumo
              preenchidos e já marcada: é revisar e publicar. Publicadas e descartadas não mudam.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            className="min-h-[220px] font-mono text-xs"
            value={textoParaImportar}
            onChange={(e) => setTextoParaImportar(e.target.value)}
            placeholder='{"gtorei_noticias": 1, "itens": [...]}'
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="cursor-pointer text-sm underline underline-offset-2">
              <input type="file" accept=".json,application/json" className="hidden" onChange={escolherArquivoDeResumos} />
              Escolher arquivo .json
            </label>
            <Button onClick={() => void importar(textoParaImportar)} disabled={salvando || !textoParaImportar.trim()}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Importar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {aviso && <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm">{aviso}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Situação das notícias">
          {(Object.keys(ROTULO) as Filtro[]).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={filtro === s}
              onClick={() => {
                // Cada aba tem as próprias ações: trocar limpa a seleção
                setFiltro(s);
                setMarcadas(new Set());
              }}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                filtro === s ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-primary/40'
              )}
            >
              {ROTULO[s]} ({contagem(s)})
            </button>
          ))}
        </div>
        {visiveis.length > 0 && (
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={todasMarcadas}
              onCheckedChange={(v) => setMarcadas(v ? new Set(visiveis.map((n) => n.id)) : new Set())}
              aria-label="Marcar todas desta aba"
            />
            Marcar todas
          </label>
        )}
      </div>

      {!lista ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : visiveis.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nada aqui.</p>
      ) : (
        <ul className="space-y-3">
          {visiveis.map((n) => (
            <ItemDaNoticia
              key={n.id}
              n={n}
              texto={textoDe(n)}
              aberto={abertas.has(n.id)}
              marcada={marcadas.has(n.id)}
              salvando={salvando}
              onMarcar={() => setMarcadas((m) => alternar(m, n.id))}
              onAbrir={() => setAbertas((a) => alternar(a, n.id))}
              onTexto={(t) => mudarTexto(n.id, t)}
              onMudar={mudarUma}
              onPublicar={() => publicarUma(n)}
              onEnviarImagem={(arquivo) => receberImagem(n, arquivo)}
              onGerarImagem={() => gerarAgora(n)}
            />
          ))}
        </ul>
      )}

      {/* Barra das selecionadas, presa embaixo enquanto houver alguma marcada */}
      {selecionadas.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
            <p className="mr-auto text-sm">
              <span className="font-semibold">{selecionadas.length === 1 ? '1 marcada' : `${selecionadas.length} marcadas`}</span>
              {filtro !== 'descartada' && (
                <span className="text-muted-foreground">
                  {' '}
                  · {prontas.length === 1 ? '1 pronta' : `${prontas.length} prontas`} para {filtro === 'publicada' ? 'salvar' : 'publicar'}
                </span>
              )}
            </p>
            {filtro !== 'descartada' && (
              <Button variant="outline" onClick={() => setAbertas((a) => new Set([...a, ...selecionadas.map((n) => n.id)]))}>
                {filtro === 'publicada' ? 'Editar marcadas' : 'Escrever resumos'}
              </Button>
            )}
            {filtro === 'rascunho' && (
              <Button variant="ghost" onClick={() => void emLote('descartada', 'descartadas.')} disabled={salvando}>
                Descartar marcadas
              </Button>
            )}
            {filtro === 'publicada' && (
              <Button variant="ghost" onClick={() => void emLote('rascunho', 'tiradas do ar.')} disabled={salvando}>
                Tirar do ar
              </Button>
            )}
            {filtro === 'descartada' && (
              <Button onClick={() => void emLote('rascunho', 'de volta aos rascunhos.')} disabled={salvando}>
                Voltar para rascunhos
              </Button>
            )}
            {filtro !== 'descartada' && (
              <Button onClick={() => void publicarSelecionadas()} disabled={salvando || prontas.length === 0}>
                {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {filtro === 'publicada' ? 'Salvar' : 'Publicar'} {prontas.length > 0 && `(${prontas.length})`}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface PropsDoItem {
  n: Noticia;
  texto: Texto;
  aberto: boolean;
  marcada: boolean;
  salvando: boolean;
  onMarcar: () => void;
  onAbrir: () => void;
  onTexto: (t: Texto) => void;
  onMudar: (n: Noticia, campos: Partial<Noticia>, mensagem: string) => Promise<void>;
  onPublicar: () => Promise<void>;
  onEnviarImagem: (arquivo: File) => Promise<void>;
  onGerarImagem: () => Promise<void>;
}

function ItemDaNoticia({ n, texto, aberto, marcada, salvando, onMarcar, onAbrir, onTexto, onMudar, onPublicar, onEnviarImagem, onGerarImagem }: PropsDoItem) {
  const tamanho = texto.resumo.trim().length;
  const ok = pronto(texto);
  const arquivo = useRef<HTMLInputElement>(null);
  const [mexendoNaImagem, setMexendoNaImagem] = useState(false);
  const gerada = ehImagemGerada(texto.imagem_url);

  const comImagem = async (acao: () => Promise<void>) => {
    setMexendoNaImagem(true);
    await acao();
    setMexendoNaImagem(false);
  };

  const escolher = (e: ChangeEvent<HTMLInputElement>) => {
    const escolhido = e.target.files?.[0];
    e.target.value = '';
    if (escolhido) void comImagem(() => onEnviarImagem(escolhido));
  };

  return (
    <li className={cn('rounded-xl border bg-card p-4', marcada ? 'border-primary/60' : 'border-border')}>
      <div className="flex gap-3">
        <Checkbox checked={marcada} onCheckedChange={onMarcar} className="mt-1" aria-label={`Marcar: ${n.titulo ?? n.titulo_fonte}`} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            {n.fonte} · {quando(n.publicada_na_fonte)}
            {n.status === 'publicada' && ` · publicada em ${quando(n.publicada_em)}`}
            {n.status !== 'publicada' && ok && ' · resumo pronto'}
          </p>
          {/* O título em português, quando já existe; o da fonte fica embaixo, menor */}
          <p className="mt-1 font-semibold">{n.titulo ?? n.titulo_fonte}</p>
          {n.titulo && n.status !== 'publicada' && <p className="text-xs text-muted-foreground">Original: {n.titulo_fonte}</p>}
          {n.status !== 'publicada' && n.motivo && (
            <p className="mt-1 text-xs text-feedback-inaccuracy">Robô: {n.motivo}</p>
          )}
          {n.status !== 'publicada' && n.trecho_fonte && (
            <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
              <span className="font-medium">Trecho da fonte (não vai para a página):</span> {n.trecho_fonte}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="ghost">
              <a href={n.link} target="_blank" rel="noopener noreferrer">
                Matéria original <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
            {n.status === 'publicada' && n.slug && (
              <Button asChild size="sm" variant="ghost">
                <a href={`/noticias/${n.slug}`} target="_blank" rel="noopener">
                  Ver página <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            {n.status !== 'descartada' && (
              <Button size="sm" variant={aberto ? 'secondary' : 'outline'} onClick={onAbrir}>
                {aberto ? 'Fechar' : n.status === 'publicada' ? 'Editar' : 'Escrever resumo'}
              </Button>
            )}
            {n.status === 'rascunho' && (
              <Button size="sm" variant="ghost" onClick={() => void onMudar(n, { status: 'descartada' }, 'Descartada.')}>
                Descartar
              </Button>
            )}
            {n.status === 'publicada' && (
              <Button size="sm" variant="ghost" onClick={() => void onMudar(n, { status: 'rascunho' }, 'Tirada do ar.')}>
                Tirar do ar
              </Button>
            )}
            {n.status === 'descartada' && (
              <Button size="sm" variant="ghost" onClick={() => void onMudar(n, { status: 'rascunho' }, 'De volta aos rascunhos.')}>
                Voltar para rascunhos
              </Button>
            )}
          </div>

          {aberto && (
            <div className="mt-4 space-y-4 border-t border-border pt-4">
              <label className="block text-sm font-medium">
                Título da notícia
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">Original: {n.titulo_fonte}</span>
                <Input
                  className="mt-1"
                  value={texto.titulo}
                  onChange={(e) => onTexto({ ...texto, titulo: e.target.value })}
                  maxLength={140}
                  placeholder="Em português e com as suas palavras"
                />
              </label>
              <label className="block text-sm font-medium">
                Resumo
                <Textarea
                  className="mt-1 min-h-[180px]"
                  value={texto.resumo}
                  onChange={(e) => onTexto({ ...texto, resumo: e.target.value })}
                  placeholder="Com as suas palavras: o que aconteceu, por que importa para quem joga torneio e o que tirar disso. Linha em branco separa parágrafos."
                />
              </label>

              {/* Imagem: a enviada (sua ou com permissão) ou a do GTORei */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Imagem</p>
                <div className="flex flex-wrap items-start gap-3">
                  {texto.imagem_url ? (
                    <img src={texto.imagem_url} alt="" className="aspect-[1200/630] w-60 rounded-lg border border-border object-cover" />
                  ) : (
                    <p className="flex aspect-[1200/630] w-60 items-center justify-center rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                      Sem imagem: ao publicar, entra a imagem do GTORei com o título
                    </p>
                  )}
                  <div className="flex flex-col gap-2">
                    <input ref={arquivo} type="file" accept={TIPOS_DE_IMAGEM.join(',')} className="hidden" onChange={escolher} />
                    <Button size="sm" variant="outline" onClick={() => arquivo.current?.click()} disabled={mexendoNaImagem}>
                      <ImagePlus className="mr-2 h-4 w-4" /> Enviar imagem
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void comImagem(onGerarImagem)} disabled={mexendoNaImagem}>
                      {mexendoNaImagem ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                      Gerar a do GTORei
                    </Button>
                    {texto.imagem_url && (
                      <Button size="sm" variant="ghost" onClick={() => onTexto({ ...texto, imagem_url: null, tituloDaImagem: null })}>
                        <Trash2 className="mr-2 h-4 w-4" /> Remover
                      </Button>
                    )}
                  </div>
                </div>
                {texto.imagem_url && !gerada && (
                  <label className="block text-sm font-medium">
                    Crédito da imagem
                    <Input
                      className="mt-1"
                      value={texto.imagem_credito}
                      onChange={(e) => onTexto({ ...texto, imagem_credito: e.target.value })}
                      maxLength={120}
                      placeholder="Ex.: Foto: Fulano / PokerGO (com permissão)"
                    />
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      Use só imagem sua ou com permissão de quem fez. A foto da matéria original é de lá.
                    </span>
                  </label>
                )}
                {gerada && texto.tituloDaImagem !== texto.titulo.trim() && texto.titulo.trim() && (
                  <p className="text-xs text-muted-foreground">O título mudou: ao publicar, a imagem do GTORei é refeita com ele.</p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={cn('text-xs tabular-nums', tamanho < MINIMO_DO_RESUMO ? 'text-muted-foreground' : 'text-foreground')}>
                  {tamanho} caracteres {tamanho < MINIMO_DO_RESUMO && `(mínimo ${MINIMO_DO_RESUMO})`}
                </span>
                <Button onClick={() => void onPublicar()} disabled={!ok || salvando}>
                  {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {n.status === 'publicada' ? 'Salvar' : 'Publicar esta'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
