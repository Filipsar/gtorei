import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { Award, Camera, ChevronRight, ImagePlus, Pencil, Route, Star, Trash2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsModal } from '@/components/layout/SettingsModal';
import { EloBadge } from '@/components/app/EloBadge';
import { Avatar } from '@/components/app/RankingApp';
import { useAuth } from '@/contexts/AuthContext';
import { useAchievements } from '@/hooks/useAchievements';
import { ACHIEVEMENTS } from '@/data/achievements';
import { eloPorNumero } from '@/data/elos';
import { LEVEL_THRESHOLDS, getLevelName } from '@/data/localStorage';
import { LICOES } from '@/data/trilha';
import { lerProgresso } from '@/lib/trilha';
import { supabase } from '@/integrations/supabase/client';
import { usarLayoutDoApp } from '@/lib/nativo/plataforma';

export interface DadosDoPerfil {
  user_id: string;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  screenshot_urls: string[] | null;
  level: number;
  total_xp: number;
  hands_played: number;
  created_at: string;
}

interface Props {
  dados: DadosDoPerfil;
  proprio: boolean;
  enviando: boolean;
  imagemDoNivel: string;
  onEnviarCapa: (e: ChangeEvent<HTMLInputElement>) => void;
  onEnviarResultado: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoverResultado: (i: number) => void;
}

const MAX_RESULTADOS = 4;

/**
 * Perfil (app e site): capa, elo, progresso do nível, números e resultados.
 * No celular, uma coluna; na tela larga do site, duas.
 */
export function PerfilApp({ dados, proprio, enviando, imagemDoNivel, onEnviarCapa, onEnviarResultado, onRemoverResultado }: Props) {
  const { user } = useAuth();
  const { unlockedKeys } = useAchievements();
  const [elo, setElo] = useState<number | null>(null);
  const [ajustes, setAjustes] = useState(false);
  const capa = useRef<HTMLInputElement>(null);
  const resultado = useRef<HTMLInputElement>(null);

  // Sem linha na liga ainda é Bronze; sem a tabela (migration por aplicar), sem brasão
  useEffect(() => {
    void supabase
      .from('liga_jogador')
      .select('elo')
      .eq('user_id', dados.user_id)
      .maybeSingle()
      .then(({ data, error }) => setElo(error ? null : data?.elo ?? 1));
  }, [dados.user_id]);

  // Campos que podem vir vazios de perfil antigo não derrubam a tela
  const xp = dados.total_xp ?? 0;
  const nivel = Math.min(Math.max(dados.level ?? 1, 1), LEVEL_THRESHOLDS.length);
  const piso = LEVEL_THRESHOLDS[nivel - 1];
  const teto = LEVEL_THRESHOLDS[nivel] ?? null;
  const pct = teto ? Math.min(100, Math.round((100 * (xp - piso)) / (teto - piso))) : 100;

  // A trilha só existe no app; no site o atalho é para o ranking
  const noApp = usarLayoutDoApp();
  const trilha = useMemo(() => {
    if (!proprio || !noApp) return null;
    const p = lerProgresso(user?.id);
    const feitas = LICOES.filter((l) => (p[l.id]?.estrelas ?? 0) > 0).length;
    const estrelas = LICOES.reduce((s, l) => s + (p[l.id]?.estrelas ?? 0), 0);
    return { feitas, estrelas };
  }, [proprio, noApp, user?.id]);

  const resultados = dados.screenshot_urls ?? [];
  const desde = dados.created_at ? new Date(dados.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : null;

  return (
    <div className="mx-auto max-w-lg pb-10 lg:max-w-5xl">
      {/* Capa */}
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-primary/30 via-card to-poker-blinds/20 sm:h-44 lg:h-56 lg:rounded-b-2xl">
        {dados.banner_url && <img src={dados.banner_url} alt="" className="h-full w-full object-cover" />}
        {proprio && (
          <>
            <input ref={capa} type="file" accept="image/*" className="hidden" onChange={onEnviarCapa} />
            <button
              type="button"
              onClick={() => capa.current?.click()}
              disabled={enviando}
              aria-label={dados.banner_url ? 'Trocar a capa' : 'Adicionar uma capa'}
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-colors active:bg-black/70 disabled:opacity-50"
            >
              <Camera className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      <div className="px-4 sm:px-6">
        {/* relative z-10: sem isso a capa, que é posicionada, pintava por cima do avatar */}
        <div className="relative z-10 -mt-12 flex items-end justify-between">
          <span className="rounded-full ring-4 ring-background">
            <Avatar url={dados.avatar_url} nome={dados.username} tamanho={96} />
          </span>
          {elo !== null && (
            <span className="mb-1 flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3">
              <EloBadge elo={elo} tamanho={34} />
              <span className="text-sm font-semibold">{eloPorNumero(elo).nome}</span>
            </span>
          )}
        </div>

        <h1 className="mt-3 break-words text-2xl font-bold">
          {dados.username}
          {proprio && <span className="ml-2 align-middle text-xs font-medium text-muted-foreground">você</span>}
        </h1>
        {desde && <p className="mt-0.5 text-sm text-muted-foreground">No GTORei desde {desde}</p>}

        <div className="lg:mt-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <div>
        {/* Nível e o caminho até o próximo */}
        <section className="mt-5 rounded-2xl border border-border bg-card p-4" aria-labelledby="nivel-perfil">
          <div className="flex items-center gap-3">
            <img src={imagemDoNivel} alt="" className="h-12 w-12 object-contain" />
            <div className="min-w-0 flex-1">
              <h2 id="nivel-perfil" className="font-bold">
                Nível {nivel} · {getLevelName(nivel)}
              </h2>
              <p className="text-sm text-muted-foreground tabular-nums">
                {teto
                  ? `${xp.toLocaleString('pt-BR')} de ${teto.toLocaleString('pt-BR')} XP para ${getLevelName(nivel + 1)}`
                  : `${xp.toLocaleString('pt-BR')} XP · nível máximo`}
              </p>
            </div>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        </section>

        {/* Números */}
        <dl className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Mãos jogadas</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{(dados.hands_played ?? 0).toLocaleString('pt-BR')}</dd>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">XP total</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-primary">{xp.toLocaleString('pt-BR')}</dd>
          </div>
        </dl>

        {proprio && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {trilha ? (
              <Link to="/trilha" className="rounded-2xl border border-border bg-card p-4 transition-colors active:bg-muted">
                <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                  <Route className="h-3.5 w-3.5" aria-hidden="true" /> Trilha
                </span>
                <span className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums">
                    {trilha.feitas}/{LICOES.length}
                  </span>
                  <span className="flex items-center gap-0.5 text-sm text-muted-foreground">
                    {trilha.estrelas} <Star className="h-3.5 w-3.5 fill-current text-primary" aria-label="estrelas" />
                  </span>
                </span>
              </Link>
            ) : (
              <Link to="/ranking" className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 active:bg-muted">
                <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                  <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Liga
                </span>
                <span className="mt-1 flex items-center gap-2">
                  {elo !== null && <EloBadge elo={elo} tamanho={26} />}
                  <span className="truncate text-xl font-bold">{elo !== null ? eloPorNumero(elo).nome : 'Ver'}</span>
                </span>
              </Link>
            )}
            <Link to="/conquistas" className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 active:bg-muted">
              <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                <Award className="h-3.5 w-3.5" aria-hidden="true" /> Conquistas
              </span>
              <span className="mt-1 block text-2xl font-bold tabular-nums">
                {unlockedKeys.size}/{ACHIEVEMENTS.length}
              </span>
            </Link>
          </div>
        )}

        </div>

        <div>
        {/* Resultados */}
        <section className="mt-6 lg:mt-5" aria-labelledby="resultados-perfil">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="resultados-perfil" className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resultados
            </h2>
            {proprio && resultados.length < MAX_RESULTADOS && (
              <>
                <input ref={resultado} type="file" accept="image/*" className="hidden" onChange={onEnviarResultado} />
                <Button size="sm" variant="outline" className="h-10" onClick={() => resultado.current?.click()} disabled={enviando}>
                  <ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Adicionar ({resultados.length}/{MAX_RESULTADOS})
                </Button>
              </>
            )}
          </div>
          {resultados.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {proprio ? 'Mostre aqui os prints dos seus resultados nas mesas.' : 'Nenhum resultado compartilhado ainda.'}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              {resultados.map((url, i) => (
                <li key={url} className="relative overflow-hidden rounded-2xl border border-border">
                  <img src={url} alt={`Resultado ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
                  {proprio && (
                    // Sempre visível: no celular não existe passar o mouse por cima
                    <button
                      type="button"
                      onClick={() => window.confirm('Apagar este resultado?') && onRemoverResultado(i)}
                      aria-label={`Apagar o resultado ${i + 1}`}
                      className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white active:bg-black/80"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {proprio && (
          <Button variant="outline" className="mt-6 h-12 w-full" onClick={() => setAjustes(true)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" /> Editar nome e avatar
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </Button>
        )}
        </div>
        </div>
      </div>
      {proprio && <SettingsModal open={ajustes} onOpenChange={setAjustes} />}
    </div>
  );
}
