import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2, Newspaper, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { MINIMO_DO_RESUMO, slugDaNoticia, type ItemDoFeed, type Noticia } from '@/lib/noticias';
import { cn } from '@/lib/utils';

type Filtro = Noticia['status'];

const ROTULO: Record<Filtro, string> = { rascunho: 'Rascunhos', publicada: 'Publicadas', descartada: 'Descartadas' };

const quando = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'sem data';

/**
 * /admin → Notícias: as matérias dos feeds chegam como rascunho; o admin
 * escreve título e resumo com as próprias palavras e publica em /noticias.
 * O trecho do feed é só para decidir: a página nunca mostra o texto da fonte.
 */
export function AdminNoticias() {
  const [lista, setLista] = useState<Noticia[] | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('rascunho');
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);

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

  const mudar = async (n: Noticia, campos: Partial<Noticia>, mensagem: string) => {
    const { error } = await supabase.from('noticias').update(campos).eq('id', n.id);
    if (error) {
      toast.error('Não deu para salvar. Confira o título e o tamanho do resumo.');
      return false;
    }
    toast.success(mensagem);
    setEditando(null);
    void carregar();
    return true;
  };

  const contagem = (s: Filtro) => lista?.filter((n) => n.status === s).length ?? 0;
  const visiveis = lista?.filter((n) => n.status === filtro) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Newspaper className="h-5 w-5 text-primary" /> Notícias
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            As matérias de PokerNews Brasil, PokerNews e CardPlayer chegam aqui. Escreva título e resumo com as suas palavras (o que aconteceu e o que muda para quem joga) e publique: vira página em{' '}
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

      {!lista ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : visiveis.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nada aqui.</p>
      ) : (
        <ul className="space-y-3">
          {visiveis.map((n) => (
            <ItemDaNoticia key={n.id} n={n} aberto={editando === n.id} onAbrir={() => setEditando(editando === n.id ? null : n.id)} onMudar={mudar} />
          ))}
        </ul>
      )}
    </div>
  );
}

interface PropsDoItem {
  n: Noticia;
  aberto: boolean;
  onAbrir: () => void;
  onMudar: (n: Noticia, campos: Partial<Noticia>, mensagem: string) => Promise<boolean>;
}

function ItemDaNoticia({ n, aberto, onAbrir, onMudar }: PropsDoItem) {
  const [titulo, setTitulo] = useState(n.titulo ?? n.titulo_fonte);
  const [resumo, setResumo] = useState(n.resumo ?? '');
  const tamanho = resumo.trim().length;
  const pronta = titulo.trim().length >= 10 && tamanho >= MINIMO_DO_RESUMO;

  const publicar = () => {
    const agora = new Date().toISOString();
    void onMudar(
      n,
      {
        status: 'publicada',
        titulo: titulo.trim(),
        resumo: resumo.trim(),
        // O endereço não muda depois de publicado, mesmo se o título mudar
        slug: n.slug ?? slugDaNoticia(titulo, n.id),
        publicada_em: n.publicada_em ?? agora,
        atualizada_em: agora,
      },
      n.status === 'publicada' ? 'Notícia atualizada.' : 'Notícia publicada.'
    );
  };

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">
        {n.fonte} · {quando(n.publicada_na_fonte)}
        {n.status === 'publicada' && ` · publicada em ${quando(n.publicada_em)}`}
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
            <Input className="mt-1" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={140} />
          </label>
          <label className="block text-sm font-medium">
            Resumo
            <Textarea
              className="mt-1 min-h-[180px]"
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              placeholder="Com as suas palavras: o que aconteceu, por que importa para quem joga torneio e o que tirar disso. Linha em branco separa parágrafos."
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={cn('text-xs tabular-nums', tamanho < MINIMO_DO_RESUMO ? 'text-muted-foreground' : 'text-foreground')}>
              {tamanho} caracteres {tamanho < MINIMO_DO_RESUMO && `(mínimo ${MINIMO_DO_RESUMO})`}
            </span>
            <Button onClick={publicar} disabled={!pronta}>
              {n.status === 'publicada' ? 'Salvar' : 'Publicar'}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
