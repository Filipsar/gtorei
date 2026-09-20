import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { HandDisplay, generateCardsFromHand } from '@/components/poker/PlayingCard';
import { POSITIONS, getRange, getHandData, calculateFeedback, type ActionType, type Position, type Scenario, type HandData } from '@/data/gtoRanges';
import { Sparkles, Trophy, Target } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export const LEVEL_TEST_KEY = 'gtorei_level_test_completed_v1';

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

function getLevelFromAccuracy(accuracy: number): { level: number; label: string; emoji: string; xp: number } {
  if (accuracy >= 86) return { level: 3, label: 'Intermediário', emoji: '🥉', xp: 250 };
  if (accuracy >= 60) return { level: 2, label: 'Amador', emoji: '🎯', xp: 120 };
  return { level: 1, label: 'Iniciante', emoji: '🌱', xp: 50 };
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
    localStorage.setItem(LEVEL_TEST_KEY, 'skipped');
    onClose?.();
  };

  const current = hands[currentIndex];
  const cards = useMemo(() => current ? generateCardsFromHand(current.hand.hand) : [], [current]);

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
    localStorage.setItem(LEVEL_TEST_KEY, 'true');

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


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 p-4">
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">Teste de Nível Inicial</h2>
            </div>
            {phase !== 'result' && (
              <button
                onClick={handleClose}
                className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Fechar"
                title="Fechar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">10 mãos rápidas para definir seu ponto de partida</p>
        </div>

        {phase === 'intro' && (
          <div className="p-6 space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-foreground">Vamos descobrir seu nível</h3>
              <p className="text-sm text-muted-foreground">
                Você verá <strong>10 situações pré-flop</strong>. Escolha a melhor ação para cada uma. Seu desempenho define seu nível inicial e já contará para o Ranking.
              </p>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between p-2 rounded bg-muted/40"><span>🌱 Iniciante</span><span className="text-muted-foreground">&lt; 60%</span></div>
              <div className="flex justify-between p-2 rounded bg-muted/40"><span>🎯 Amador</span><span className="text-muted-foreground">60% — 85%</span></div>
              <div className="flex justify-between p-2 rounded bg-muted/40"><span>🥉 Intermediário</span><span className="text-muted-foreground">&gt; 85%</span></div>
            </div>
            <Button onClick={() => setPhase('playing')} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Começar teste
            </Button>
          </div>
        )}

        {phase === 'playing' && current && (
          <div className="p-5 space-y-4">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Mão {currentIndex + 1} de {hands.length}</span>
                <span>{correct} acertos</span>
              </div>
              <Progress value={((currentIndex) / hands.length) * 100} className="h-1.5" />
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{SCENARIO_LABEL[current.scenario]}</p>
              <p className="text-sm font-medium text-foreground">
                Posição: <span className="text-primary font-bold">{current.position}</span> · Stack: <span className="text-primary font-bold">{current.stack}BB</span>
              </p>
            </div>

            <div className="flex justify-center py-2">
              <HandDisplay cards={cards} size="md" />
            </div>

            <p className="text-center text-xs text-muted-foreground">Qual sua ação?</p>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => handleAction('fold')} className="h-12 bg-slate-700 hover:bg-slate-600 border-slate-600 text-white">Fold</Button>
              <Button variant="outline" onClick={() => handleAction('call')} className="h-12 bg-secondary hover:bg-secondary/90 text-white">
                {current.scenario === 'openRaise' ? 'Limp' : 'Call'}
              </Button>
              <Button variant="outline" onClick={() => handleAction('raise')} className="h-12 bg-poker-raise hover:bg-poker-raise/90 text-white">Raise</Button>
              <Button variant="outline" onClick={() => handleAction('allin')} className="h-12 bg-poker-allin hover:bg-poker-allin/90 text-white">All-in</Button>
            </div>
          </div>
        )}

        {phase === 'result' && (
          <div className="p-6 space-y-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-4xl">
                {levelInfo.emoji}
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Seu nível inicial</p>
              <h3 className="text-2xl font-bold text-primary">{levelInfo.label}</h3>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-muted/40">
                <p className="text-[10px] text-muted-foreground uppercase">Precisão</p>
                <p className="text-lg font-bold text-foreground">{accuracy}%</p>
              </div>
              <div className="p-2 rounded bg-muted/40">
                <p className="text-[10px] text-muted-foreground uppercase">Acertos</p>
                <p className="text-lg font-bold text-foreground">{correct}/{hands.length}</p>
              </div>
              <div className="p-2 rounded bg-muted/40">
                <p className="text-[10px] text-muted-foreground uppercase">XP</p>
                <p className="text-lg font-bold text-primary">+{displayXp}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded bg-primary/10 border border-primary/20 text-xs text-foreground">
              <Trophy className="h-4 w-4 text-primary shrink-0" />
              <span>Suas mãos já foram contabilizadas para o Ranking.</span>
            </div>

            <Button onClick={onComplete} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Começar a treinar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function useLevelTestStatus() {
  const [needsLevelTest, setNeedsLevelTest] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(LEVEL_TEST_KEY);
    if (!completed) setNeedsLevelTest(true);
  }, []);

  const completeLevelTest = () => setNeedsLevelTest(false);

  return { needsLevelTest, completeLevelTest };
}
