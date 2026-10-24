import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, Newspaper, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { MINIMO_DO_RESUMO, slugDaNoticia, type ItemDoFeed, type Noticia } from '@/lib/noticias';
import { cn } from '@/lib/utils';

type Filtro = Noticia['status'];
interface Texto {
  titulo: string;
  resumo: string;
}

const ROTULO: Record<Filtro, string> = { rascunho: 'Rascunhos', publicada: 'Publicadas', descartada: 'Descartadas' };

const quando = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'sem data';

const pronto = (t: Texto | undefined) => !!t && t.titulo.trim().length >= 10 && t.resumo.trim().length >= MINIMO_DO_RESUMO;

/** Os campos que publicar grava (o endereço não muda depois de publicado) */
function camposDePublicar(n: Noticia, t: Texto): Partial<Noticia> {
  const agora = new Date().toISOString();
  return {
    status: 'publicada',
    titulo: t.titulo.trim(),
    resumo: t.resumo.trim(),
    slug: n.slug ?? slugDaNoticia(t.titulo, n.id),
    publicada_em: n.publicada_em ?? agora,
    atualizada_em: agora,
  };
}

/**
 * /admin → Notícias: as matérias dos feeds chegam como rascunho; o admin
 * escreve título e resumo com as próprias palavras e publica em /noticias.
 * Dá para marcar várias, escrever os resumos em sequência e publicar todas de
 * uma vez. O trecho do feed é só para decidir: a página nunca mostra o texto
 * da fonte.
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

  // Trocar de aba limpa a seleção (cada aba tem as próprias ações)
  useEffect(() => setMarcadas(new Set()), [filtro]);

  const textoDe = (n: Noticia): Texto => textos[n.id] ?? { titulo: n.titulo ?? n.titulo_fonte, resumo: n.resumo ?? '' };
  const mudarTexto = (id: string, t: Texto) => setTextos((antes) => ({ ...antes, [id]: t }));
  const alternar = (conjunto: Set<string>, id: string) => {
    const novo = new Set(conjunto);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    return novo;
  };

  /** Aplica os campos em várias de uma vez; devolve quantas deram certo */
  const aplicar = async (alvos: { n: Noticia; campos: Partial<Noticia> }[]) => {
    setSalvando(true);
    const resultados = await Promise.all(alvos.map(({ n, campos }) => supabase.from('noticias').update(campos).eq('id', n.id)));
    setSalvando(false);
    const certas = alvos.filter((_, i) => !resultados[i].error);
    const ids = new Set(certas.map(({ n }) => n.id));
    setAbertas((a) => new Set([...a].filter((id) => !ids.has(id))));
    setMarcadas((m) => new Set([...m].filter((id) => !ids.has(id))));
    void carregar();
    return { certas: certas.length, falhas: alvos.length - certas.length };
  };

  const mudarUma = async (n: Noticia, campos: Partial<Noticia>, mensagem: string) => {
    const { falhas } = await aplicar([{ n, campos }]);
    if (falhas) toast.error('Não deu para salvar. Confira o título e o tamanho do resumo.');
    else toast.success(mensagem);
  };

  const visiveis = useMemo(() => lista?.filter((n) => n.status === filtro) ?? [], [lista, filtro]);
  const selecionadas = visiveis.filter((n) => marcadas.has(n.id));
  const prontas = selecionadas.filter((n) => pronto(textoDe(n)));
  const todasMarcadas = visiveis.length > 0 && selecionadas.length === visiveis.length;
  const contagem = (s: Filtro) => lista?.filter((n) => n.status === s).length ?? 0;

  const publicarSelecionadas = async () => {
    const { certas, falhas } = await aplicar(prontas.map((n) => ({ n, campos: camposDePublicar(n, textoDe(n)) })));
    const faltam = selecionadas.length - prontas.length;
    toast[falhas ? 'error' : 'success'](
      `${certas === 1 ? '1 publicada' : `${certas} publicadas`}` +
        (falhas ? `; ${falhas} com erro` : '') +
        (faltam > 0 ? `. ${faltam} ainda sem resumo completo.` : '.')
    );
  };

  const emLote = async (status: Filtro, mensagem: string) => {
    const { certas } = await aplicar(selecionadas.map((n) => ({ n, campos: { status } })));
    toast.success(`${certas} ${mensagem}`);
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Newspaper className="h-5 w-5 text-primary" /> Notícias
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            As matérias de PokerNews Brasil, PokerNews e CardPlayer chegam aqui. Marque as que quer cobrir, escreva título e resumo com as suas palavras (o que aconteceu e o que muda para quem joga) e publique: cada uma vira página em{' '}
            <a href="/noticias" target="_blank" rel="noopener" className="underline underline-offset-2">
              /noticias
            </a>
            , com link para a matéria original.
          </p>
        </div>
        <Button variant="outline" onClick={() => void buscarNovas()} disabled={buscando}>
          {buscando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Buscar novas
        </Button>
      </div>
      {aviso && <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm">{aviso}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Situação das notícias">
          {(Object.keys(ROTULO) as Filtro[]).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={filtro === s}
              onClick={() => setFiltro(s)}
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
}

function ItemDaNoticia({ n, texto, aberto, marcada, salvando, onMarcar, onAbrir, onTexto, onMudar }: PropsDoItem) {
  const tamanho = texto.resumo.trim().length;
  const ok = pronto(texto);

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
          <p className="mt-1 font-semibold">{n.status === 'publicada' ? n.titulo : n.titulo_fonte}</p>
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
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <label className="block text-sm font-medium">
                Título da notícia
                <Input className="mt-1" value={texto.titulo} onChange={(e) => onTexto({ ...texto, titulo: e.target.value })} maxLength={140} />
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={cn('text-xs tabular-nums', tamanho < MINIMO_DO_RESUMO ? 'text-muted-foreground' : 'text-foreground')}>
                  {tamanho} caracteres {tamanho < MINIMO_DO_RESUMO && `(mínimo ${MINIMO_DO_RESUMO})`}
                </span>
                <Button
                  onClick={() => void onMudar(n, camposDePublicar(n, texto), n.status === 'publicada' ? 'Notícia atualizada.' : 'Notícia publicada.')}
                  disabled={!ok || salvando}
                >
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
