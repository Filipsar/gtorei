import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronsDown, ChevronsUp, Loader2, Trophy } from 'lucide-react';
import { EloBadge } from '@/components/app/EloBadge';
import { useAuth } from '@/contexts/AuthContext';
import { ELOS, ELO_REI, FICAM_NO_REI, SOBEM, eloPorNumero } from '@/data/elos';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface JogadorDaLiga {
  user_id: string;
  username: string;
  avatar_url: string | null;
  xp: number;
  posicao: number;
  eu: boolean;
}

interface Liga {
  elo: number;
  semana_inicio: string;
  semana_fim: string;
  jogadores: JogadorDaLiga[];
  ultima: { elo_antes: number; elo_depois: number; posicao: number; xp: number } | null;
}

interface LinhaGlobal {
  user_id: string;
  xp: number;
  username: string;
  avatar_url: string | null;
}

/** Data de hoje em Brasília (AAAA-MM-DD): a semana da liga vira no horário de lá */
const hojeEmBrasilia = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

function diasAteOFim(fim: string): number {
  const ms = new Date(`${fim}T00:00:00Z`).getTime() - new Date(`${hojeEmBrasilia()}T00:00:00Z`).getTime();
  return Math.max(0, Math.round(ms / 86_400_000)) + 1;
}

/** Ranking do app: a liga do seu elo e o ranking global do mês com o elo de cada um */
export function RankingApp() {
  const [aba, setAba] = useState<'liga' | 'global'>('liga');

  return (
    <div className="mx-auto max-w-lg px-4 pb-10 pt-4">
      <h1 className="sr-only">Ranking</h1>
      <div role="tablist" aria-label="Tipo de ranking" className="mb-5 grid grid-cols-2 rounded-xl border border-border bg-card p-1">
        {(['liga', 'global'] as const).map((a) => (
          <button
            key={a}
            type="button"
            role="tab"
            aria-selected={aba === a}
            onClick={() => setAba(a)}
            className={cn(
              'min-h-[44px] rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              aba === a ? 'bg-primary text-primary-foreground' : 'text-muted-foreground active:bg-muted'
            )}
          >
            {a === 'liga' ? 'Sua liga' : 'Global do mês'}
          </button>
        ))}
      </div>
      {aba === 'liga' ? <SuaLiga /> : <Global />}
    </div>
  );
}

function SuaLiga() {
  const [liga, setLiga] = useState<Liga | null>(null);
  const [indisponivel, setIndisponivel] = useState(false);

  useEffect(() => {
    void supabase.rpc('get_liga').then(({ data, error }) => {
      if (error || !data) {
        setIndisponivel(true);
        return;
      }
      setLiga(data as unknown as Liga);
    });
  }, []);

  if (indisponivel) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="font-semibold">As ligas chegam em breve</p>
        <p className="mt-1 text-sm text-muted-foreground">Enquanto isso, o ranking global do mês continua valendo.</p>
      </div>
    );
  }
  if (!liga) {
    return (
      <div className="flex justify-center py-16" role="status" aria-label="Carregando a liga">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const elo = eloPorNumero(liga.elo);
  const proximo = ELOS.find((e) => e.numero === liga.elo + 1);
  const noRei = liga.elo === ELO_REI;
  const dias = diasAteOFim(liga.semana_fim);
  const ativos = liga.jogadores.filter((j) => j.xp > 0);
  const mudou = liga.ultima && liga.ultima.elo_depois !== liga.ultima.elo_antes ? liga.ultima : null;

  return (
    <div className="space-y-5">
      {mudou && (
        <p
          className={cn(
            'flex items-center gap-3 rounded-xl border p-3 text-sm',
            mudou.elo_depois > mudou.elo_antes ? 'border-primary/40 bg-primary/10' : 'border-border bg-muted'
          )}
        >
          <img
            src={mudou.elo_depois > mudou.elo_antes ? '/mascote/rei-subiu.webp' : '/mascote/rei-triste.webp'}
            alt=""
            aria-hidden="true"
            width={330}
            height={420}
            className="h-14 w-auto shrink-0"
          />
          <span>
          {mudou.elo_depois > mudou.elo_antes
            ? `Você subiu para ${eloPorNumero(mudou.elo_depois).nome}! Terminou a semana em ${mudou.posicao}º.`
            : `Você caiu para ${eloPorNumero(mudou.elo_depois).nome}. Fique no top ${FICAM_NO_REI} para voltar e continuar no Rei.`}
          </span>
        </p>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 text-center" aria-labelledby="seu-elo">
        {/* No Rei, o próprio Rei no trono de fichas; nos outros elos, o brasão */}
        <div className="flex justify-center pt-3">
          {noRei ? (
            <img src="/mascote/rei-trono.webp" alt="" aria-hidden="true" width={447} height={480} className="h-40 w-auto" />
          ) : (
            <EloBadge elo={liga.elo} tamanho={96} />
          )}
        </div>
        <h2 id="seu-elo" className="mt-3 text-2xl font-bold">
          Liga {elo.nome}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {noRei
            ? `Fique no top ${FICAM_NO_REI} da semana para continuar no Rei.`
            : `Os ${SOBEM} primeiros da semana sobem para ${proximo?.nome}.`}{' '}
          {dias === 1 ? 'A semana fecha hoje.' : `A semana fecha em ${dias} dias.`}
        </p>
        {/* Escada dos elos: os que já passou em cor, os que faltam apagados */}
        <ol className="mt-5 flex items-end justify-between" aria-label="Elos, do primeiro ao último">
          {ELOS.map((e) => (
            <li
              key={e.numero}
              className={cn('flex flex-col items-center gap-1', e.numero > liga.elo && 'opacity-35 grayscale')}
              aria-current={e.numero === liga.elo ? 'step' : undefined}
            >
              <EloBadge elo={e.numero} tamanho={e.numero === liga.elo ? 40 : 30} />
              <span className={cn('text-[10px]', e.numero === liga.elo ? 'font-bold text-foreground' : 'text-muted-foreground')}>
                {e.nome}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="classificacao">
        <h2 id="classificacao" className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Classificação da semana
        </h2>
        {ativos.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
            Ninguém pontuou nesta liga ainda. Jogue algumas mãos e saia na frente.
          </p>
        ) : (
          <ol className="overflow-hidden rounded-2xl border border-border bg-card">
            {liga.jogadores.map((j, i) => {
              const sobe = !noRei && j.posicao <= SOBEM && j.xp > 0;
              const cai = noRei && (j.posicao > FICAM_NO_REI || j.xp <= 0);
              const corte = noRei ? FICAM_NO_REI : SOBEM;
              const proxima = liga.jogadores[i + 1];
              return (
                <li key={j.user_id}>
                  <div
                    className={cn(
                      'flex min-h-[56px] items-center gap-3 border-b border-border px-4 py-2 last:border-b-0',
                      j.eu && 'bg-primary/10'
                    )}
                  >
                    <span className="w-6 text-center text-sm font-bold tabular-nums">{j.posicao}</span>
                    <Avatar url={j.avatar_url} nome={j.username} />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {j.username}
                      {j.eu && <span className="ml-1 text-xs text-muted-foreground">(você)</span>}
                    </span>
                    {sobe && (
                      <ChevronsUp className="h-5 w-5 shrink-0 text-feedback-best" aria-label="Zona de subida" />
                    )}
                    {cai && (
                      <ChevronsDown className="h-5 w-5 shrink-0 text-red-400 [.light_&]:text-red-700" aria-label="Zona de queda" />
                    )}
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{j.xp.toLocaleString('pt-BR')} XP</span>
                  </div>
                  {/* Linha de corte depois do 3º (sobe) ou do 10º no Rei (fica) */}
                  {j.posicao === corte && proxima && (
                    <p className="border-b border-border bg-muted/50 px-4 py-1.5 text-center text-xs font-medium text-muted-foreground">
                      {noRei ? 'Abaixo daqui cai para Diamante' : `Acima daqui sobe para ${proximo?.nome}`}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

function Global() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [linhas, setLinhas] = useState<LinhaGlobal[] | null>(null);
  const [elos, setElos] = useState<Map<string, number> | null>(null);

  useEffect(() => {
    const inicioDoMes = `${hojeEmBrasilia().slice(0, 7)}-01`;
    void supabase
      .from('rankings')
      .select('user_id, xp_earned, profiles(username, avatar_url)')
      .eq('period_type', 'monthly')
      .eq('period_start', inicioDoMes)
      .order('xp_earned', { ascending: false })
      .limit(100)
      .then(async ({ data, error }) => {
        if (error) {
          setLinhas([]);
          return;
        }
        type Bruta = { user_id: string; xp_earned: number; profiles: { username: string; avatar_url: string | null } | null };
        const lista = ((data ?? []) as unknown as Bruta[]).map((r) => ({
          user_id: r.user_id,
          xp: r.xp_earned,
          username: r.profiles?.username ?? 'Jogador',
          avatar_url: r.profiles?.avatar_url ?? null,
        }));
        setLinhas(lista);
        if (lista.length === 0) return;
        // Sem linha em liga_jogador é Bronze; sem a tabela (migration por aplicar), sem brasão
        const { data: deElo, error: semLiga } = await supabase
          .from('liga_jogador')
          .select('user_id, elo')
          .in('user_id', lista.map((l) => l.user_id));
        if (!semLiga) setElos(new Map((deElo ?? []).map((e) => [e.user_id, e.elo])));
      });
  }, []);

  if (!linhas) {
    return (
      <div className="flex justify-center py-16" role="status" aria-label="Carregando o ranking">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (linhas.length === 0) {
    return <p className="rounded-2xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">Ninguém pontuou neste mês ainda.</p>;
  }

  return (
    <ol className="overflow-hidden rounded-2xl border border-border bg-card" aria-label="Ranking global do mês">
      {linhas.map((l, i) => {
        const elo = elos ? elos.get(l.user_id) ?? 1 : null;
        return (
          <li key={l.user_id}>
            <button
              type="button"
              onClick={() => navigate(`/perfil/${l.user_id}`)}
              className={cn(
                'flex min-h-[56px] w-full items-center gap-3 border-b border-border px-4 py-2 text-left transition-colors last:border-b-0 active:bg-muted',
                l.user_id === user?.id && 'bg-primary/10'
              )}
            >
              <span className="flex w-6 justify-center text-sm font-bold tabular-nums">
                {i < 3 ? <Trophy className={cn('h-5 w-5', ['text-rank-first', 'text-rank-second', 'text-rank-third'][i])} aria-label={`${i + 1}º`} /> : i + 1}
              </span>
              <Avatar url={l.avatar_url} nome={l.username} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{l.username}</span>
                {elo !== null && <span className="text-xs text-muted-foreground">{eloPorNumero(elo).nome}</span>}
              </span>
              {elo !== null && <EloBadge elo={elo} tamanho={26} />}
              <span className="shrink-0 text-sm font-semibold tabular-nums">{l.xp.toLocaleString('pt-BR')} XP</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Avatar pequeno: foto, emoji escolhido nas configurações ou a inicial */
export function Avatar({ url, nome, tamanho = 36 }: { url: string | null; nome: string; tamanho?: number }) {
  const ehFoto = !!url && url.length > 4;
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/20 font-bold text-primary"
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.42 }}
      aria-hidden="true"
    >
      {ehFoto ? <img src={url!} alt="" className="h-full w-full object-cover" /> : url || nome.charAt(0).toUpperCase()}
    </span>
  );
}
