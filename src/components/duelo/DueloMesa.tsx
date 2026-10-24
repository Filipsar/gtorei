import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EVENTO_MAO_REGISTRADA } from '@/hooks/useDailyChallenges';
import { PokerTable } from '@/components/poker/PokerTable';
import { ActionButton } from '@/components/poker/ActionButton';
import { HandDisplay, type CardType } from '@/components/poker/PlayingCard';
import { Avatar } from '@/components/app/RankingApp';
import { EloBadge } from '@/components/app/EloBadge';
import { DueloFim } from '@/components/duelo/DueloFim';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { ActionType, Position } from '@/data/gtoRanges';
import {
  INTERVALO_DA_MESA_MS,
  PAUSA_DO_RESULTADO_MS,
  PRAZO_DA_DECISAO_S,
  apostaDe,
  avaliarDecisao,
  comSinal,
  emBB,
  jogador,
  lerCartas,
  nomeDaJogada,
  outroLado,
  posicaoDe,
  rotuloDaAcao,
  spotDaDecisao,
  type AcaoFeita,
  type NotaDaDecisao,
  type SpotDoDuelo,
  type UltimaMao,
  type VisaoDoDuelo,
} from '@/lib/duelo';
import { cn } from '@/lib/utils';

const NOME_DA_ACAO: Record<ActionType, string> = { fold: 'Fold', call: 'Call', raise: 'Raise', allin: 'All-in' };
const VARIANTE: Record<ActionType, 'fold' | 'passiva' | 'agressiva' | 'allin'> = {
  fold: 'fold',
  call: 'passiva',
  raise: 'agressiva',
  allin: 'allin',
};
const ORDEM: ActionType[] = ['fold', 'call', 'raise', 'allin'];
// Cartas viradas do outro: o valor nunca aparece (showCards falso)
const CARTAS_VIRADAS: CardType[] = [
  { rank: 'A', suit: 's' },
  { rank: 'A', suit: 'h' },
];

/** Respostas fora de ordem (consulta lenta chegando depois da jogada) não voltam a mesa no tempo */
const ordemDa = (v: VisaoDoDuelo) => (v.status === 'fim' ? 1e6 : 0) + v.mao * 100 + v.estado.acoes.length;

/** A última jogada do outro na mão, para aparecer no assento dele */
function jogadaDele(acoes: AcaoFeita[], ele: 'a' | 'b') {
  let aumentos = 0;
  let ultima: { texto: string; aposta?: number } | undefined;
  for (const a of acoes) {
    if (a.quem === ele) {
      const texto = nomeDaJogada(a, aumentos);
      ultima = a.acao === 'raise' || a.acao === 'allin' ? { texto, aposta: Number(a.para) } : { texto };
    }
    if (a.acao === 'raise' || a.acao === 'allin') aumentos += 1;
  }
  return ultima;
}

interface Props {
  duelo: string;
  /** Volta para o começo da aba Duelo */
  onSair: () => void;
  /** Fim do duelo: procurar outro adversário */
  onDeNovo: () => void;
}

/**
 * A mesa do duelo ao vivo. Pergunta o estado ao servidor a cada 2 s e também
 * escuta o Realtime, para a jogada do outro aparecer na hora. Cada mão que
 * fecha fica 3,5 s na tela (cartas abertas no showdown) antes da próxima.
 */
export function DueloMesa({ duelo, onSair, onDeNovo }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const [visao, setVisao] = useState<VisaoDoDuelo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mostrando, setMostrando] = useState<UltimaMao | null>(null);
  const [nota, setNota] = useState<NotaDaDecisao | null>(null);
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [, setTique] = useState(0);

  // Servidor menos aparelho: o prazo vem no relógio do servidor
  const desvio = useRef(0);
  // No fold o servidor não abre cartas: as minhas de cada mão ficam guardadas aqui
  const cartasPorMao = useRef(new Map<number, string>());
  // Última mão cujo resultado já foi mostrado (null: ainda não carregou)
  const resultadoVisto = useRef<number | null>(null);
  const ordemAtual = useRef(-1);
  const sessao = useRef<PromiseLike<string | null> | null>(null);

  const aplicar = useCallback((v: VisaoDoDuelo) => {
    if (ordemDa(v) < ordemAtual.current) return;
    ordemAtual.current = ordemDa(v);
    desvio.current = new Date(v.agora).getTime() - Date.now();
    if (v.minhas_cartas) cartasPorMao.current.set(v.mao, v.minhas_cartas);
    const fechou = v.ultima?.mao ?? 0;
    // Quem entra (ou volta) com o duelo andando não revê a mão anterior
    if (resultadoVisto.current === null) resultadoVisto.current = v.status === 'fim' ? fechou - 1 : fechou;
    if (v.ultima && fechou > resultadoVisto.current) {
      resultadoVisto.current = fechou;
      setMostrando(v.ultima);
    }
    setVisao(v);
  }, []);

  const buscar = useCallback(async () => {
    const { data, error } = await supabase.rpc('duelo_estado', { _duelo: duelo });
    if (error) {
      setErro(error.message.includes('duelo_nao_encontrado') ? 'Esse duelo não existe mais.' : 'Sem conexão com a mesa. Tentando de novo…');
      return;
    }
    setErro(null);
    aplicar(data as unknown as VisaoDoDuelo);
  }, [duelo, aplicar]);

  const terminou = visao?.status === 'fim';

  // Consulta a cada 2 s (é ela que faz o servidor conferir o relógio) e o
  // Realtime para a jogada do outro chegar sem esperar a próxima consulta
  useEffect(() => {
    if (terminou) return;
    void buscar();
    const intervalo = setInterval(() => void buscar(), INTERVALO_DA_MESA_MS);
    const canal = supabase
      .channel(`duelo-${duelo}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duelos', filter: `id=eq.${duelo}` }, () => void buscar())
      .subscribe();
    return () => {
      clearInterval(intervalo);
      void supabase.removeChannel(canal);
    };
  }, [duelo, buscar, terminou]);

  // Contagem do prazo
  useEffect(() => {
    if (terminou) return;
    const t = setInterval(() => setTique((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [terminou]);

  useEffect(() => {
    if (!mostrando) return;
    const t = setTimeout(() => setMostrando(null), PAUSA_DO_RESULTADO_MS);
    return () => clearTimeout(t);
  }, [mostrando]);

  useEffect(() => {
    if (!nota) return;
    const t = setTimeout(() => setNota(null), 2500);
    return () => clearTimeout(t);
  }, [nota]);

  // A sessão de treino que guarda o XP das decisões fecha junto com a mesa
  useEffect(
    () => () => {
      void sessao.current?.then((id) => {
        if (id) void supabase.from('training_sessions').update({ ended_at: new Date().toISOString() }).eq('id', id);
      });
    },
    []
  );

  /** XP da decisão com nota, como uma mão do treino (conta para desafios e ranking) */
  const registrar = useCallback(
    async (spot: SpotDoDuelo, n: NotaDaDecisao, acao: ActionType) => {
      if (!user) return;
      if (!sessao.current) {
        sessao.current = supabase
          .from('training_sessions')
          .insert({ user_id: user.id, scenario: 'duelo', position: spot.posicao, stack: spot.stack })
          .select('id')
          .single()
          .then(({ data, error }) => (error ? null : data?.id ?? null));
      }
      const id = await sessao.current;
      if (!id) return;
      const { error } = await supabase.rpc('record_hand_result', {
        _session_id: id,
        _hand: n.mao,
        _scenario: spot.cenario,
        _position: spot.posicao,
        _stack: Math.round(spot.stack),
        _user_action: acao,
        _correct_action: n.acaoCerta,
        _feedback: n.tipo,
        _points: n.pontos,
        _ev_loss: n.evPerdido,
        _hand_code: null,
        _game_mode: 'hu',
        _villain_position: spot.vilao,
        _effective_stack: spot.stack,
      });
      if (error) return;
      window.dispatchEvent(new Event(EVENTO_MAO_REGISTRADA));
      void refreshProfile();
    },
    [user, refreshProfile]
  );

  const agir = async (acao: ActionType) => {
    if (!visao || enviando || mostrando) return;
    const spot = spotDaDecisao(visao.estado, visao.eu);
    const avaliacao = spot ? avaliarDecisao(spot, lerCartas(visao.minhas_cartas), acao, profile?.level ?? 1) : null;
    setEnviando(true);
    const { data, error } = await supabase.rpc('duelo_agir', {
      _duelo: duelo,
      _mao: visao.mao,
      _acao: acao,
      _acertou: avaliacao ? avaliacao.acertou : null,
    });
    setEnviando(false);
    if (error) {
      toast.error('Não deu para jogar agora. Tente de novo.');
      void buscar();
      return;
    }
    const v = data as unknown as VisaoDoDuelo;
    aplicar(v);
    if (v.recusada) {
      toast('O tempo dessa jogada já tinha acabado.');
      return;
    }
    if (spot && avaliacao) {
      setNota(avaliacao);
      void registrar(spot, avaliacao, acao);
    }
  };

  const desistir = async () => {
    setConfirmarSaida(false);
    const { data, error } = await supabase.rpc('duelo_desistir', { _duelo: duelo });
    if (error) {
      onSair();
      return;
    }
    aplicar(data as unknown as VisaoDoDuelo);
  };

  if (!visao) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center" role="status">
        {erro ? (
          <>
            <p className="text-muted-foreground">{erro}</p>
            <Button variant="outline" onClick={onSair}>
              Voltar
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Sentando à mesa…</p>
          </>
        )}
      </div>
    );
  }

  if (visao.status === 'fim' && !mostrando) {
    return <DueloFim visao={visao} onDeNovo={onDeNovo} onSair={onSair} />;
  }

  const eu = visao.eu;
  const ele = outroLado(eu);
  const meus = jogador(visao, eu);
  const dele = jogador(visao, ele);

  // Mesa: a mão que acabou (durante a pausa) ou a que está valendo
  const mao = mostrando ?? visao.estado;
  const numeroDaMao = mostrando ? mostrando.mao : visao.mao;
  const minhaPosicao: Position = posicaoDe(eu, mao.sb);
  const posicaoDele: Position = posicaoDe(ele, mao.sb);
  const stack = Number(mao.stack);
  const minhasCartas = lerCartas(
    (mostrando?.showdown ? (eu === 'a' ? mostrando.cartas_a : mostrando.cartas_b) : null) ??
      cartasPorMao.current.get(numeroDaMao) ??
      (mostrando ? null : visao.minhas_cartas)
  );
  const cartasDele = mostrando?.showdown ? lerCartas(ele === 'a' ? mostrando.cartas_a : mostrando.cartas_b) : CARTAS_VIRADAS;
  const jogada = jogadaDele(mao.acoes, ele);
  const quemLargou = mostrando && !mostrando.showdown && mostrando.vencedor !== 'empate' ? outroLado(mostrando.vencedor) : null;

  const minhaVez = !mostrando && visao.status === 'jogando' && visao.estado.vez === eu;
  const prazo = visao.estado.prazo ? new Date(visao.estado.prazo).getTime() : null;
  // O prazo da mão nova inclui a pausa do resultado: na tela, nunca mais que os 30 s
  const restante = prazo ? Math.min(PRAZO_DA_DECISAO_S, Math.max(0, (prazo - (Date.now() + desvio.current)) / 1000)) : 0;
  // Na pausa entre mãos o prazo já corre no servidor; a barra só começa com a mão na tela
  const fracao = Math.min(1, restante / PRAZO_DA_DECISAO_S);

  const resultado = mostrando
    ? mostrando.vencedor === 'empate'
      ? 'Pote dividido'
      : mostrando.vencedor === eu
        ? `Você levou ${emBB(Math.abs(Number(mostrando.delta_a)))} BB`
        : `${dele.nome} levou ${emBB(Math.abs(Number(mostrando.delta_a)))} BB`
    : null;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-var(--altura-anuncio,0px)-4rem)] max-w-4xl flex-col p-4 sm:p-6">
      {/* Placar: você x o outro, em BB */}
      <div className="mb-3 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={() => setConfirmarSaida(true)}
          aria-label="Sair do duelo"
        >
          <X className="h-6 w-6" />
        </Button>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-2xl border border-border bg-card px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar url={meus.avatar} nome={meus.nome} tamanho={32} />
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">Você</p>
              <p className="text-base font-bold tabular-nums">
                {comSinal(meus.saldo)}
              </p>
            </div>
          </div>
          <p className="shrink-0 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Mão
            <span className="block text-sm text-foreground tabular-nums">
              {numeroDaMao}/{visao.total_maos}
            </span>
          </p>
          <div className="flex min-w-0 items-center gap-2 text-right">
            <div className="min-w-0">
              <p className="flex items-center justify-end gap-1 truncate text-xs text-muted-foreground">
                <EloBadge elo={dele.elo} tamanho={14} />
                <span className="truncate">{dele.nome}</span>
              </p>
              <p className="text-base font-bold tabular-nums">
                {comSinal(dele.saldo)}
              </p>
            </div>
            <Avatar url={dele.avatar} nome={dele.nome} tamanho={32} />
          </div>
        </div>
      </div>

      {/* Vez e relógio */}
      <div className="mb-1 h-6" aria-live="polite">
        {resultado ? (
          <p className="text-center text-sm font-bold">{resultado}</p>
        ) : visao.status === 'jogando' ? (
          <div className="flex items-center gap-3">
            <p className={cn('shrink-0 text-sm font-semibold', minhaVez ? 'text-primary' : 'text-muted-foreground')}>
              {minhaVez ? 'Sua vez' : `Vez de ${dele.nome}`}
            </p>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div
                className={cn('h-full rounded-full transition-[width] duration-200', fracao < 0.25 ? 'bg-destructive' : 'bg-primary')}
                style={{ width: `${fracao * 100}%` }}
              />
            </div>
            <span className="w-7 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{Math.ceil(restante)}s</span>
          </div>
        ) : null}
      </div>
      {erro && <p className="mb-1 text-center text-xs text-muted-foreground">{erro}</p>}

      <div className="flex flex-1 flex-col justify-center sm:block">
        <PokerTable
          key={`${numeroDaMao}-${mostrando ? 'fim' : 'jogo'}`}
          heroPosition={minhaPosicao}
          heroCards={minhasCartas}
          heroStack={stack}
          villainPosition={posicaoDele}
          villainCards={cartasDele}
          villainCardsRevealed={!!mostrando?.showdown}
          villainStack={stack}
          villainAction={jogada?.aposta !== undefined ? { action: jogada.texto, amount: jogada.aposta } : undefined}
          lastVillainAction={jogada?.texto}
          pot={apostaDe(mao, 'a') + apostaDe(mao, 'b')}
          communityCards={mostrando?.showdown ? lerCartas(mostrando.board) : []}
          street={mostrando?.showdown ? 'showdown' : 'preflop'}
          foldedPositions={quemLargou ? [posicaoDe(quemLargou, mao.sb)] : []}
          // Mão fechada: as fichas já foram para o pote (na frente, cobriam o board)
          activeBets={
            mostrando
              ? []
              : [
                  { position: minhaPosicao, amount: apostaDe(mao, eu) },
                  { position: posicaoDele, amount: apostaDe(mao, ele) },
                ]
          }
          visiblePositions={['SB', 'BB']}
        />
      </div>

      {/* Minhas cartas, grandes, e a nota da última decisão */}
      <div className="relative flex shrink-0 justify-center py-2.5 sm:py-3">
        {minhasCartas.length > 0 && (
          <>
            <HandDisplay cards={minhasCartas} size="sm" className="sm:hidden" />
            <HandDisplay cards={minhasCartas} size="md" className="hidden sm:flex" />
          </>
        )}
        {nota && (
          <span
            role="status"
            className={cn(
              'absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold shadow motion-safe:animate-fade-in',
              nota.acertou
                ? 'border-[hsl(var(--feedback-best)/0.5)] bg-[hsl(var(--feedback-best)/0.15)]'
                : 'border-destructive/50 bg-destructive/15'
            )}
          >
            {nota.acertou ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden="true" /> {nota.tipo === 'best' ? 'Best' : 'Correta'}
              </>
            ) : (
              <>GTO: {NOME_DA_ACAO[nota.acaoCerta]}</>
            )}
          </span>
        )}
      </div>

      {/* Jogadas: só as que valem agora; fora da vez, o aviso no mesmo lugar */}
      <div className="shrink-0 pb-4">
        {minhaVez ? (
          <div
            className="grid gap-2 sm:gap-3"
            style={{ gridTemplateColumns: `repeat(${visao.acoes_validas.length}, minmax(0, 1fr))` }}
          >
            {ORDEM.filter((a) => visao.acoes_validas.includes(a)).map((a) => {
              const { rotulo, detalhe } = rotuloDaAcao(a, visao.estado, eu);
              return (
                <ActionButton
                  key={a}
                  variante={VARIANTE[a]}
                  rotulo={rotulo}
                  detalhe={detalhe}
                  disabled={enviando}
                  onClick={() => void agir(a)}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex h-[60px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            {mostrando ? 'Próxima mão em instantes…' : visao.status === 'jogando' ? `Esperando ${dele.nome} decidir…` : 'Duelo encerrado'}
          </div>
        )}
      </div>

      <AlertDialog open={confirmarSaida} onOpenChange={setConfirmarSaida}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair do duelo?</AlertDialogTitle>
            <AlertDialogDescription>Quem sai no meio perde o duelo, e {dele.nome} fica com a vitória.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar jogando</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void desistir()}
            >
              Sair e perder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
