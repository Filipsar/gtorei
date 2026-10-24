import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Clock, Loader2, Swords, Users } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SEO } from '@/components/seo/SEO';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DueloMesa } from '@/components/duelo/DueloMesa';
import { Avatar } from '@/components/app/RankingApp';
import { ESPERA_MAXIMA_MS, INTERVALO_DA_FILA_MS, PRAZO_DA_DECISAO_S, type RespostaDaFila } from '@/lib/duelo';
import { usarLayoutDoApp } from '@/lib/nativo/plataforma';

type Fase = 'inicio' | 'fila' | 'semJogadores' | 'indisponivel';

const mmss = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Duelo do app (/duelo): heads-up ao vivo contra outro jogador. Fila única;
 * sem par em 3 minutos, a busca para e avisa que faltam jogadores. A partida
 * fica em /duelo?partida=id, o que esconde as abas e deixa voltar à mesa ao
 * reabrir o app. Regras e segurança na migration 20261024140000_duelo_ao_vivo.
 */
export default function DueloPage() {
  const { profile, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const partida = params.get('partida');
  const [fase, setFase] = useState<Fase>('inicio');
  const [desde, setDesde] = useState(0);
  const [, setTique] = useState(0);
  const naFila = useRef(false);

  const abrirPartida = useCallback((id: string) => setParams({ partida: id }, { replace: true }), [setParams]);

  // Voltando ao app no meio de um duelo: direto para a mesa
  useEffect(() => {
    if (partida || !user) return;
    void supabase.rpc('duelo_atual').then(({ data }) => {
      if (data) abrirPartida(data);
    });
  }, [partida, user, abrirPartida]);

  const sairDaFila = useCallback(async () => {
    naFila.current = false;
    const { data } = await supabase.rpc('duelo_sair_fila');
    // Pareou no mesmo instante: entra na mesa em vez de deixar o outro esperando
    if (data) abrirPartida(data);
  }, [abrirPartida]);

  // Na fila: pergunta a cada 2 s (a chamada também diz ao servidor que a
  // pessoa continua aqui) e desiste com 3 minutos
  useEffect(() => {
    if (fase !== 'fila') return;
    naFila.current = true;
    const inicio = Date.now();
    setDesde(inicio);
    let vivo = true;
    const passo = async () => {
      const { data, error } = await supabase.rpc('duelo_procurar');
      if (!vivo) return;
      if (error) {
        naFila.current = false;
        setFase('indisponivel');
        return;
      }
      const r = data as unknown as RespostaDaFila;
      if ('duelo' in r) {
        naFila.current = false;
        setFase('inicio');
        abrirPartida(r.duelo);
      } else if ('expirou' in r || Date.now() - inicio >= ESPERA_MAXIMA_MS) {
        setFase('semJogadores');
        void sairDaFila();
      }
    };
    void passo();
    const intervalo = setInterval(() => void passo(), INTERVALO_DA_FILA_MS);
    const relogio = setInterval(() => setTique((n) => n + 1), 1000);
    return () => {
      vivo = false;
      clearInterval(intervalo);
      clearInterval(relogio);
    };
  }, [fase, abrirPartida, sairDaFila]);

  // Saiu da tela com a busca ligada: tira da fila
  useEffect(
    () => () => {
      if (naFila.current) void supabase.rpc('duelo_sair_fila');
    },
    []
  );

  if (!usarLayoutDoApp()) return <Navigate to="/treinar" replace />;

  if (partida) {
    return (
      <MainLayout>
        <SEO title="Duelo — GTORei" description="Heads-up ao vivo." path="/duelo" noindex />
        <DueloMesa
          key={partida}
          duelo={partida}
          onSair={() => setParams({}, { replace: true })}
          onDeNovo={() => {
            setParams({}, { replace: true });
            setFase('fila');
          }}
        />
      </MainLayout>
    );
  }

  const nome = profile?.username || user?.email || 'Você';
  const esperando = Date.now() - desde;

  return (
    <MainLayout>
      <SEO title="Duelo — GTORei" description="Heads-up ao vivo contra outro jogador." path="/duelo" noindex />
      <div className="mx-auto max-w-lg space-y-6 px-4 pb-10 pt-4">
        <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/15 via-card to-card p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Heads-up ao vivo</p>
          <h1 className="mt-1 text-2xl font-bold">Duelo</h1>
          <img src="/mascote/rei-dando-cartas.webp" alt="" aria-hidden="true" width={321} height={480} className="mx-auto mt-3 h-40 w-auto" />
          {/* Você e o adversário, que aparece quando a fila acha alguém */}
          <div className="mt-3 flex items-center justify-center gap-3" aria-hidden="true">
            <Avatar url={profile?.avatar_url ?? null} nome={nome} tamanho={44} />
            <Swords className="h-6 w-6 text-primary" />
            <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/50 text-lg font-bold text-muted-foreground">
              ?
            </span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Você contra outro jogador, na mesma mão: um no small blind, o outro no big. Dez mãos, e ganha quem terminar com mais BB.
          </p>
        </section>

        {fase === 'fila' ? (
          <section className="rounded-2xl border border-border bg-card p-5 text-center" role="status" aria-live="polite">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden="true" />
            <p className="mt-3 font-semibold">Procurando adversário…</p>
            <p className="mt-1 text-sm tabular-nums text-muted-foreground">
              {mmss(Math.min(esperando, ESPERA_MAXIMA_MS))} de {mmss(ESPERA_MAXIMA_MS)}
            </p>
            <div className="mx-auto mt-3 h-1.5 max-w-xs overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div className="h-full rounded-full bg-primary transition-[width] duration-1000" style={{ width: `${Math.min(100, (100 * esperando) / ESPERA_MAXIMA_MS)}%` }} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Deixe esta tela aberta: o duelo começa assim que alguém entrar.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setFase('inicio');
                void sairDaFila();
              }}
            >
              Cancelar
            </Button>
          </section>
        ) : (
          <>
            {fase === 'semJogadores' && (
              <p className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-left text-sm" role="alert">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                Não há jogadores suficientes para a partida. Tente de novo daqui a pouco.
              </p>
            )}
            {fase === 'indisponivel' && (
              <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm" role="alert">
                O duelo ao vivo ainda não está disponível. Tente mais tarde.
              </p>
            )}
            <Button className="h-14 w-full text-lg font-bold" onClick={() => setFase('fila')}>
              <Swords className="mr-2 h-5 w-5" aria-hidden="true" /> {fase === 'semJogadores' ? 'Procurar de novo' : 'Procurar adversário'}
            </Button>
          </>
        )}

        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {PRAZO_DA_DECISAO_S} segundos por decisão. Estourou, a mão vai para o fold; duas vezes seguidas, o duelo é do outro.
          </li>
          <li className="flex gap-2">
            <Swords className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Só preflop: abrir, 3-bet, all-in, call ou fold. Com call, as cartas abrem e a mesa corre até o river.
          </li>
          <li className="flex gap-2">
            <Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Cada mão tem um stack de 10 a 40 BB, igual para os dois. Suas decisões ganham nota GTO e XP, como no treino.
          </li>
        </ul>
      </div>
    </MainLayout>
  );
}
