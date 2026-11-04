import { useCallback, useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InsigniaDeIndicacao } from '@/components/referral/InsigniaDeIndicacao';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useInsignias } from '@/hooks/useInsignias';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ThumbsUp, Heart, Trophy, MessageCircle, Send, Trash2, MoreHorizontal, Loader2, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface Autor {
  username: string;
  avatar_url: string | null;
  level: number;
}

interface Reacao {
  id: string;
  reaction_type: string;
  user_id: string;
}

interface Comentario {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  reacoes: Reacao[];
  comentarios: Comentario[];
}

const REACOES = [
  { type: 'like', icon: ThumbsUp, label: 'Curtir', color: 'text-sky-400 [.light_&]:text-sky-700' },
  { type: 'love', icon: Heart, label: 'Amei', color: 'text-red-400 [.light_&]:text-red-700' },
  { type: 'gg', icon: Trophy, label: 'GG', color: 'text-primary [.light_&]:text-amber-800' },
] as const;

// Espelham os CHECK do banco: community_posts 2000 e post_comments 1000 caracteres.
const MAX_POST = 2000;
const MAX_COMENTARIO = 1000;
const POR_PAGINA = 20;
/** Com mais comentários que isso, a lista começa recolhida nos últimos 2 */
const COMENTARIOS_ABERTOS = 3;

// O MainLayout remonta a cada página: o feed fica no módulo e aparece na hora
// quando a pessoa volta, enquanto a versão nova chega por trás.
let feedGuardado: { posts: Post[]; autores: Map<string, Autor>; temMais: boolean } | null = null;

// Uma consulta para posts, reações e comentários (chaves estrangeiras de
// post_reactions e post_comments) e outra para os perfis. Antes eram cinco, em fila.
const SELECT_DO_FEED =
  'id, user_id, content, created_at, post_reactions(id, reaction_type, user_id), post_comments(id, user_id, content, created_at)';

type LinhaDoFeed = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  post_reactions: Reacao[] | null;
  post_comments: Comentario[] | null;
};

async function buscarPagina(antesDe?: string): Promise<{ posts: Post[]; temMais: boolean }> {
  let q = supabase.from('community_posts').select(SELECT_DO_FEED).order('created_at', { ascending: false }).limit(POR_PAGINA + 1);
  if (antesDe) q = q.lt('created_at', antesDe);
  const { data, error } = await q;
  if (error) throw error;
  const linhas = (data ?? []) as unknown as LinhaDoFeed[];
  const posts = linhas.slice(0, POR_PAGINA).map((l) => ({
    id: l.id,
    user_id: l.user_id,
    content: l.content,
    created_at: l.created_at,
    reacoes: l.post_reactions ?? [],
    comentarios: [...(l.post_comments ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
  }));
  return { posts, temMais: linhas.length > POR_PAGINA };
}

async function buscarAutores(posts: Post[], conhecidos: Map<string, Autor>): Promise<Map<string, Autor>> {
  const ids = new Set<string>();
  for (const p of posts) {
    ids.add(p.user_id);
    for (const c of p.comentarios) ids.add(c.user_id);
  }
  const faltam = [...ids].filter((id) => !conhecidos.has(id));
  const autores = new Map(conhecidos);
  if (faltam.length === 0) return autores;
  const { data } = await supabase.from('profiles').select('user_id, username, avatar_url, level').in('user_id', faltam);
  for (const p of data ?? []) autores.set(p.user_id, { username: p.username, avatar_url: p.avatar_url, level: p.level });
  return autores;
}

const quando = (data: string) => formatDistanceToNow(new Date(data), { addSuffix: true, locale: ptBR });

function Foto({ autor, tamanho }: { autor?: Autor; tamanho: string }) {
  const url = autor?.avatar_url;
  // avatar_url curto é o emoji escolhido nas configurações
  const ehFoto = !!url && url.length > 4;
  return (
    <Avatar className={tamanho}>
      {ehFoto ? <AvatarImage src={url} alt="" /> : null}
      <AvatarFallback className="bg-primary/20 text-primary text-sm">
        {url && !ehFoto ? url : (autor?.username || 'J').charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

function Nome({ userId, autor, nivelIndicacao }: { userId: string; autor?: Autor; nivelIndicacao?: number }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Link to={`/perfil/${userId}`} className="truncate font-semibold hover:underline underline-offset-4">
        {autor?.username || 'Jogador'}
      </Link>
      {nivelIndicacao ? <InsigniaDeIndicacao nivel={nivelIndicacao} tamanho={20} /> : null}
    </span>
  );
}

function Esqueleto() {
  return (
    <div className="space-y-4" role="status" aria-label="Carregando a comunidade">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
              <div className="space-y-1.5">
                <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                <div className="h-2.5 w-20 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function CommunityPage() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[] | null>(feedGuardado?.posts ?? null);
  const [autores, setAutores] = useState<Map<string, Autor>>(feedGuardado?.autores ?? new Map());
  const [temMais, setTemMais] = useState(feedGuardado?.temMais ?? false);
  const [erro, setErro] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [texto, setTexto] = useState('');
  const [publicando, setPublicando] = useState(false);
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [escrevendo, setEscrevendo] = useState<Set<string>>(new Set());

  // Guarda o feed no módulo a cada mudança, para a próxima visita abrir na hora
  useEffect(() => {
    if (posts) feedGuardado = { posts, autores, temMais };
  }, [posts, autores, temMais]);

  const meuAutor: Autor | undefined = profile
    ? { username: profile.username, avatar_url: profile.avatar_url, level: profile.level }
    : undefined;

  const carregar = useCallback(async () => {
    try {
      const pagina = await buscarPagina();
      const novos = await buscarAutores(pagina.posts, feedGuardado?.autores ?? new Map());
      setAutores(novos);
      setPosts(pagina.posts);
      setTemMais(pagina.temMais);
      setErro(false);
    } catch (e) {
      console.error('Erro ao carregar a comunidade:', e);
      setErro(true);
      setPosts((atual) => atual ?? []);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const carregarMais = async () => {
    if (!posts?.length) return;
    setCarregandoMais(true);
    try {
      const pagina = await buscarPagina(posts[posts.length - 1].created_at);
      setAutores(await buscarAutores(pagina.posts, autores));
      setPosts((atual) => [...(atual ?? []), ...pagina.posts]);
      setTemMais(pagina.temMais);
    } catch {
      toast({ title: 'Não deu para carregar mais posts', variant: 'destructive' });
    } finally {
      setCarregandoMais(false);
    }
  };

  const idsNoFeed = useMemo(() => {
    const ids: string[] = [];
    for (const p of posts ?? []) {
      ids.push(p.user_id);
      for (const c of p.comentarios) ids.push(c.user_id);
    }
    return ids;
  }, [posts]);
  const insignias = useInsignias(idsNoFeed);

  const publicar = async () => {
    const conteudo = texto.trim();
    if (!conteudo || !user) return;
    setPublicando(true);
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .insert({ user_id: user.id, content: conteudo })
        .select('id, user_id, content, created_at')
        .single();
      if (error) throw error;
      setTexto('');
      if (meuAutor) setAutores((a) => new Map(a).set(user.id, meuAutor));
      setPosts((atual) => [{ ...data, reacoes: [], comentarios: [] }, ...(atual ?? [])]);
    } catch {
      toast({ title: 'Erro ao publicar', variant: 'destructive' });
    } finally {
      setPublicando(false);
    }
  };

  const apagarPost = async (postId: string) => {
    if (!window.confirm('Apagar este post?')) return;
    const { error } = await supabase.from('community_posts').delete().eq('id', postId);
    if (error) {
      toast({ title: 'Erro ao apagar', variant: 'destructive' });
      return;
    }
    setPosts((atual) => (atual ?? []).filter((p) => p.id !== postId));
  };

  const reagir = async (postId: string, tipo: string) => {
    if (!user) return;
    const post = posts?.find((p) => p.id === postId);
    if (!post) return;
    const minha = post.reacoes.find((r) => r.user_id === user.id && r.reaction_type === tipo);
    const trocar = (fn: (r: Reacao[]) => Reacao[]) =>
      setPosts((atual) => (atual ?? []).map((p) => (p.id === postId ? { ...p, reacoes: fn(p.reacoes) } : p)));

    if (minha) {
      trocar((rs) => rs.filter((r) => r.id !== minha.id));
      const { error } = await supabase.from('post_reactions').delete().eq('id', minha.id);
      if (error) trocar((rs) => [...rs, minha]);
      return;
    }
    // Aparece na hora; o id de verdade chega do banco
    const provisoria: Reacao = { id: `tmp-${tipo}-${postId}`, reaction_type: tipo, user_id: user.id };
    trocar((rs) => [...rs, provisoria]);
    const { data, error } = await supabase
      .from('post_reactions')
      .insert({ post_id: postId, user_id: user.id, reaction_type: tipo })
      .select('id, reaction_type, user_id')
      .single();
    trocar((rs) => rs.filter((r) => r.id !== provisoria.id).concat(error || !data ? [] : [data]));
  };

  const comentar = async (postId: string) => {
    const conteudo = comentarios[postId]?.trim();
    if (!conteudo || !user) return;
    const { data, error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, user_id: user.id, content: conteudo })
      .select('id, user_id, content, created_at')
      .single();
    if (error || !data) {
      toast({ title: 'Erro ao comentar', variant: 'destructive' });
      return;
    }
    if (meuAutor) setAutores((a) => new Map(a).set(user.id, meuAutor));
    setPosts((atual) => (atual ?? []).map((p) => (p.id === postId ? { ...p, comentarios: [...p.comentarios, data] } : p)));
    setComentarios((c) => ({ ...c, [postId]: '' }));
  };

  const apagarComentario = async (postId: string, comentarioId: string) => {
    const { error } = await supabase.from('post_comments').delete().eq('id', comentarioId);
    if (error) {
      toast({ title: 'Erro ao apagar o comentário', variant: 'destructive' });
      return;
    }
    setPosts((atual) =>
      (atual ?? []).map((p) => (p.id === postId ? { ...p, comentarios: p.comentarios.filter((c) => c.id !== comentarioId) } : p))
    );
  };

  const alternar = (conjunto: Set<string>, id: string) => {
    const novo = new Set(conjunto);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    return novo;
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
        <header className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Users className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-heading-md">Comunidade</h1>
            <p className="text-sm text-muted-foreground">Mãos, dúvidas e resultados dos jogadores do GTORei</p>
          </div>
        </header>

        {/* Novo post */}
        <Card className="border-primary/20">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start gap-3">
              <Foto autor={meuAutor} tamanho="h-10 w-10" />
              <label htmlFor="novo-post" className="sr-only">
                Escreva um post
              </label>
              <Textarea
                id="novo-post"
                placeholder="Compartilhe uma mão, uma dúvida ou um resultado..."
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                maxLength={MAX_POST}
                className="min-h-[80px] resize-none border-muted bg-muted/30"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              {/* O banco corta em 2000; sem o contador o post só falhava com "Erro ao publicar" */}
              {texto.length > MAX_POST - 200 && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {texto.length}/{MAX_POST}
                </span>
              )}
              <Button onClick={() => void publicar()} disabled={!texto.trim() || publicando} size="sm" className="h-10 gap-2">
                {publicando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Publicar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feed */}
        {posts === null ? (
          <Esqueleto />
        ) : posts.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <MessageCircle className="mx-auto mb-3 h-12 w-12 opacity-30" aria-hidden="true" />
            <p>{erro ? 'Não deu para carregar os posts agora. Tente de novo em instantes.' : 'Nenhum post ainda. Seja o primeiro!'}</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => {
              const autor = autores.get(post.user_id);
              const aberto = abertos.has(post.id) || post.comentarios.length <= COMENTARIOS_ABERTOS;
              const visiveis = aberto ? post.comentarios : post.comentarios.slice(-2);
              const mostrarCaixa = escrevendo.has(post.id) || post.comentarios.length > 0;
              return (
                <li key={post.id}>
                  <Card>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <Foto autor={autor} tamanho="h-10 w-10" />
                          <div className="min-w-0 text-sm">
                            <Nome userId={post.user_id} autor={autor} nivelIndicacao={insignias.get(post.user_id)} />
                            <p className="text-xs text-muted-foreground">
                              {quando(post.created_at)}
                              {autor?.level ? ` · Nível ${autor.level}` : ''}
                            </p>
                          </div>
                        </div>
                        {post.user_id === user?.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" aria-label="Opções do post">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-destructive" onClick={() => void apagarPost(post.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Apagar post
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{post.content}</p>

                      {/* Reações e comentar */}
                      <div className="flex flex-wrap items-center gap-0.5 border-t border-border pt-2 sm:gap-1">
                        {REACOES.map((r) => {
                          const Icone = r.icon;
                          const total = post.reacoes.filter((x) => x.reaction_type === r.type).length;
                          const minha = post.reacoes.some((x) => x.user_id === user?.id && x.reaction_type === r.type);
                          return (
                            <Button
                              key={r.type}
                              variant="ghost"
                              size="sm"
                              aria-pressed={minha}
                              className={cn('h-10 gap-1.5 px-2 text-xs sm:px-3', minha ? r.color : 'text-muted-foreground')}
                              onClick={() => void reagir(post.id, r.type)}
                            >
                              <Icone className={cn('h-4 w-4', minha && 'fill-current')} />
                              {r.label}
                              {total > 0 && <span className="tabular-nums">{total}</span>}
                            </Button>
                          );
                        })}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto h-10 gap-1.5 px-2 text-xs sm:px-3 text-muted-foreground"
                          onClick={() => setEscrevendo((s) => alternar(s, post.id))}
                        >
                          <MessageCircle className="h-4 w-4" />
                          {post.comentarios.length > 0 ? post.comentarios.length : 'Comentar'}
                        </Button>
                      </div>

                      {/* Comentários */}
                      {mostrarCaixa && (
                        <div className="space-y-3">
                          {!aberto && (
                            <button
                              type="button"
                              onClick={() => setAbertos((s) => alternar(s, post.id))}
                              className="text-xs font-medium text-muted-foreground hover:text-foreground"
                            >
                              Ver os {post.comentarios.length} comentários
                            </button>
                          )}
                          {visiveis.map((c) => (
                            <div key={c.id} className="flex gap-2">
                              <Foto autor={autores.get(c.user_id)} tamanho="mt-0.5 h-8 w-8" />
                              <div className="min-w-0 flex-1 rounded-lg bg-muted/40 px-3 py-2">
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <Nome userId={c.user_id} autor={autores.get(c.user_id)} nivelIndicacao={insignias.get(c.user_id)} />
                                  {c.user_id === user?.id && (
                                    <button
                                      type="button"
                                      onClick={() => void apagarComentario(post.id, c.id)}
                                      aria-label="Apagar comentário"
                                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{c.content}</p>
                                <p className="mt-1 text-[11px] text-muted-foreground">{quando(c.created_at)}</p>
                              </div>
                            </div>
                          ))}

                          <form
                            className="flex items-center gap-2"
                            onSubmit={(e) => {
                              e.preventDefault();
                              void comentar(post.id);
                            }}
                          >
                            <Foto autor={meuAutor} tamanho="h-8 w-8" />
                            <label htmlFor={`comentario-${post.id}`} className="sr-only">
                              Escreva um comentário
                            </label>
                            <input
                              id={`comentario-${post.id}`}
                              type="text"
                              placeholder="Escreva um comentário..."
                              maxLength={MAX_COMENTARIO}
                              className="h-10 min-w-0 flex-1 rounded-full border border-border/50 bg-muted/40 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                              value={comentarios[post.id] || ''}
                              onChange={(e) => setComentarios((c) => ({ ...c, [post.id]: e.target.value }))}
                            />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 shrink-0"
                              disabled={!comentarios[post.id]?.trim()}
                              aria-label="Enviar comentário"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </form>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        {posts && posts.length > 0 && temMais && (
          <Button variant="outline" className="h-11 w-full" onClick={() => void carregarMais()} disabled={carregandoMais}>
            {carregandoMais && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ver posts mais antigos
          </Button>
        )}
      </div>
    </MainLayout>
  );
}
