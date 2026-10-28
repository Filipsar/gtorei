import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { HandDisplay, generateCardsFromHand } from '@/components/poker/PlayingCard';
import { POSITIONS, getRange, getHandData, calculateFeedback, type ActionType, type Position, type Scenario, type HandData } from '@/data/gtoRanges';
import { Trophy, X, Map as IconeMapa } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { marcarTesteDeNivel, testeDeNivelResolvido } from '@/lib/testeDeNivel';
import { tour } from '@/lib/tour';
import { cn } from '@/lib/utils';


interface TestHand {
  hand: HandData;
  position: Position;
  scenario: Scenario;
  stack: number;
}

const SCENARIOS: Scenario[] = ['openRaise', 'vsOpenRaise', 'vs3bet'];

function pickValidPosition(scenario: Scenario): Position {
  let candidates: Position[] = [...POSITIONS];
  if (scenario === 'vsOpenRaise' || scenario === 'vs3bet') {
    candidates = candidates.filter((p) => p !== 'UTG');
  }
  if (scenario === 'vs3bet') {
    candidates = candidates.filter((p) => p !== 'BB');
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function generateTestHands(count: number): TestHand[] {
  const hands: TestHand[] = [];
  const seen = new Set<string>();
  while (hands.length < count) {
    const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    const position = pickValidPosition(scenario);
    const stack = [25, 50, 75, 100][Math.floor(Math.random() * 4)];
    const range = getRange(scenario, position, stack, false, '8max', 0);
    // pick a hand with mixed action variety - prefer hands that aren't pure fold
    const pool = range.hands.filter((h) => h.actions.some((a) => a.action !== 'fold' && a.frequency > 0));
    const all = pool.length > 0 ? pool : range.hands;
    const hand = all[Math.floor(Math.random() * all.length)];
    const key = `${scenario}-${position}-${stack}-${hand.hand}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hands.push({ hand, position, scenario, stack });
  }
  return hands;
}

const SCENARIO_LABEL: Record<Scenario, string> = {
  openRaise: 'Open Raise',
  vsOpenRaise: 'Vs Open Raise',
  vs3bet: 'Vs 3-Bet',
  vsOpenShove: 'Vs Open Shove',
  multiway: 'Multiway',
  simulation: 'Simulação',
};

// O rei do resultado muda com o nível: todo mundo sai do teste comemorando algo
function getLevelFromAccuracy(accuracy: number): { level: number; label: string; xp: number; rei: string; frase: string } {
  if (accuracy >= 86)
    return { level: 3, label: 'Intermediário', xp: 250, rei: 'rei-trofeu', frase: 'Você já chega jogando bem. Agora é refinar os spots difíceis.' };
  if (accuracy >= 60)
    return { level: 2, label: 'Amador', xp: 120, rei: 'rei-confiante', frase: 'Base boa! O treino diário fecha os buracos que ficaram.' };
  return { level: 1, label: 'Iniciante', xp: 50, rei: 'rei-joinha', frase: 'Todo rei começou no Iniciante. Mão a mão, a range entra na cabeça.' };
}

const NIVEIS = [
  { label: 'Iniciante', faixa: 'até 59%' },
  { label: 'Amador', faixa: '60% a 85%' },
  { label: 'Intermediário', faixa: '86% ou mais' },
];

/** Rei em cima do cartão, cortado pela borda como um adesivo */
function ReiNoTopo({ pose, largura, altura }: { pose: string; largura: number; altura: number }) {
  return (
    <img
      key={pose}
      src={`/mascote/${pose}.webp`}
      alt=""
      aria-hidden="true"
      width={largura}
      height={altura}
      className="absolute left-1/2 -top-[92px] h-[124px] w-auto -translate-x-1/2 drop-shadow-xl motion-safe:animate-rei-sobe"
    />
  );
}

interface LevelTestProps {
  onComplete: () => void;
  onClose?: () => void;
}

export function LevelTest({ onComplete, onClose }: LevelTestProps) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<'intro' | 'playing' | 'result'>('intro');
  const [hands] = useState<TestHand[]>(() => generateTestHands(10));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [results, setResults] = useState<Array<{ correct: boolean; action: ActionType; gtoAction: ActionType }>>([]);
  const [submitted, setSubmitted] = useState(false);
  const [serverAccuracy, setServerAccuracy] = useState<number | null>(null);
  const [serverXp, setServerXp] = useState<number | null>(null);

  const handleClose = () => {
    marcarTesteDeNivel('skipped');
    onClose?.();
  };

  const current = hands[currentIndex];
  const cards = useMemo(() => current ? generateCardsFromHand(current.hand.hand) : [], [current]);
  const ultima = results[results.length - 1];

  const handleAction = (action: ActionType) => {
    const feedback = calculateFeedback(action, current.hand, 1);
    const isCorrect = feedback.type === 'best' || feedback.type === 'correct';
    const newResults = [...results, { correct: isCorrect, action, gtoAction: current.hand.primaryAction }];
    const newCorrect = isCorrect ? correct + 1 : correct;
    setResults(newResults);
    setCorrect(newCorrect);

    if (currentIndex + 1 >= hands.length) {
      setPhase('result');
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const accuracy = serverAccuracy ?? Math.round((correct / hands.length) * 100);
  const levelInfo = getLevelFromAccuracy(accuracy);
  const displayXp = serverXp ?? levelInfo.xp;

  // Persist on result
  useEffect(() => {
    if (phase !== 'result' || submitted) return;
    setSubmitted(true);
    marcarTesteDeNivel('true');

    (async () => {
      if (!user) return;
      const payload = hands.map((h, idx) => ({
        hand: h.hand.hand,
        scenario: h.scenario as string,
        position: h.position as string,
        stack: h.stack,
        user_action: (results[idx]?.action ?? 'fold') as string,
        correct_action: h.hand.primaryAction as string,
        correct: !!results[idx]?.correct,
      }));

      const { data, error } = await supabase.rpc('complete_level_test', { _results: payload });

      if (error) {
        if (!error.message?.includes('already_completed')) {
          console.error('Error saving level test:', error);
        }
        return;
      }

      const result = data as { accuracy?: number; xp_earned?: number } | null;
      if (result) {
        if (typeof result.accuracy === 'number') setServerAccuracy(result.accuracy);
        if (typeof result.xp_earned === 'number') setServerXp(result.xp_earned);
      }
    })();
  }, [phase, submitted, user, hands, results]);

  const fazerTour = () => {
    onComplete();
    tour.iniciar();
  };

  return (
    // pointer-events-auto: este overlay não é do Radix, e um modal do Radix
    // aberto em qualquer lugar deixa o body com pointer-events: none, o que
    // travava os botões daqui.
    <div className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-4 pt-24 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="teste-de-nivel-titulo"
        className="relative my-auto w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl"
      >
        {phase !== 'result' && (
          <button
            onClick={handleClose}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Pular o teste"
            title="Pular o teste"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {phase === 'intro' && (
          <div className="relative px-6 pb-6 pt-10 text-center">
            <ReiNoTopo pose="rei-dando-cartas" largura={321} altura={480} />
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Teste de nível</p>
            <h2 id="teste-de-nivel-titulo" className="mt-1 text-xl font-bold text-foreground">
              Vamos ver como você joga?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Eu dou as cartas: são <strong className="text-foreground">10 mãos de pré-flop</strong>, e você escolhe a ação de cada uma. O resultado define seu nível inicial e já conta para o Ranking.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              {NIVEIS.map((n) => (
                <div key={n.label} className="rounded-lg bg-muted/40 p-2">
                  <p className="font-semibold text-foreground">{n.label}</p>
                  <p className="text-muted-foreground">{n.faixa}</p>
                </div>
              ))}
            </div>
            <Button onClick={() => setPhase('playing')} className="mt-5 w-full">
              Dar as cartas
            </Button>
            <button onClick={handleClose} className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:underline">
              Agora não
            </button>
          </div>
        )}

        {phase === 'playing' && current && (
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-3 pr-8">
              <img
                src={`/mascote/${!ultima ? 'rei-pensando' : ultima.correct ? 'rei-joinha' : 'rei-ombros'}.webp`}
                alt=""
                aria-hidden="true"
                className="h-14 w-14 shrink-0 object-contain"
              />
              <div className="min-w-0 flex-1">
                <h2 id="teste-de-nivel-titulo" className="text-sm font-bold text-foreground">
                  Mão {currentIndex + 1} de {hands.length}
                </h2>
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  {!ultima ? 'Qual é a sua jogada?' : ultima.correct ? 'Boa! Essa você acertou.' : 'Essa passou. Próxima!'}
                </p>
              </div>
              <span className="text-xs font-medium text-primary">{correct} acertos</span>
            </div>
            <Progress value={(currentIndex / hands.length) * 100} className="h-1.5" />

            <div className="space-y-1 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{SCENARIO_LABEL[current.scenario]}</p>
              <p className="text-sm font-medium text-foreground">
                Posição: <span className="font-bold text-primary">{current.position}</span> · Stack: <span className="font-bold text-primary">{current.stack}BB</span>
              </p>
            </div>

            <div className="flex justify-center py-1">
              <HandDisplay cards={cards} size="md" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => handleAction('fold')} className="h-12 border-slate-600 bg-slate-700 text-white hover:bg-slate-600">Fold</Button>
              <Button variant="outline" onClick={() => handleAction('call')} className="h-12 bg-secondary text-white hover:bg-secondary/90">
                {current.scenario === 'openRaise' ? 'Limp' : 'Call'}
              </Button>
              <Button variant="outline" onClick={() => handleAction('raise')} className="h-12 bg-poker-raise text-white hover:bg-poker-raise/90">Raise</Button>
              <Button variant="outline" onClick={() => handleAction('allin')} className="h-12 bg-poker-allin text-white hover:bg-poker-allin/90">All-in</Button>
            </div>
          </div>
        )}

        {phase === 'result' && (
          <div className="relative space-y-4 px-6 pb-6 pt-10 text-center">
            <ReiNoTopo pose={levelInfo.rei} largura={320} altura={420} />
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Seu nível inicial</p>
              <h2 id="teste-de-nivel-titulo" className="text-2xl font-bold text-primary">{levelInfo.label}</h2>
              <p className="text-sm text-muted-foreground">{levelInfo.frase}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded bg-muted/40 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">Precisão</p>
                <p className="text-lg font-bold text-foreground">{accuracy}%</p>
              </div>
              <div className="rounded bg-muted/40 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">Acertos</p>
                <p className="text-lg font-bold text-foreground">{correct}/{hands.length}</p>
              </div>
              <div className="rounded bg-muted/40 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">XP</p>
                <p className="text-lg font-bold text-primary">+{displayXp}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded border border-primary/20 bg-primary/10 p-2 text-left text-xs text-foreground">
              <Trophy className="h-4 w-4 shrink-0 text-primary" />
              <span>Suas mãos já contam para o Ranking.</span>
            </div>

            <div className={cn('grid gap-2', 'sm:grid-cols-2')}>
              <Button onClick={onComplete}>Começar a treinar</Button>
              <Button variant="outline" onClick={fazerTour} className="gap-2">
                <IconeMapa className="h-4 w-4" />
                Conhecer as páginas
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function useLevelTestStatus() {
  const [needsLevelTest, setNeedsLevelTest] = useState(false);

  useEffect(() => {
    if (!testeDeNivelResolvido()) setNeedsLevelTest(true);
  }, []);

  const completeLevelTest = () => setNeedsLevelTest(false);

  return { needsLevelTest, completeLevelTest };
}
