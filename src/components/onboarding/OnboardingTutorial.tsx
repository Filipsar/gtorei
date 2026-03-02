import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Zap, TableProperties, BarChart3, Trophy, Award, Users, Heart, 
  User, ChevronRight, ChevronLeft, X, Sparkles, Target, Swords,
  UsersRound, Crown
} from 'lucide-react';
import rangeImg from '@/assets/modes/range-training.png';
import huImg from '@/assets/modes/hu.png';
import threeHandImg from '@/assets/modes/three-hand.png';
import bountyImg from '@/assets/modes/bounty.png';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  image?: string;
  highlight?: string;
}

const steps: OnboardingStep[] = [
  {
    title: 'Bem-vindo ao GTORei! 👑',
    description: 'O GTORei é o seu treinador de poker GTO gratuito. Aqui você vai aprender a tomar as melhores decisões pré-flop e pós-flop baseadas em teoria dos jogos. Vamos te mostrar tudo!',
    icon: <Sparkles className="h-8 w-8 text-primary" />,
  },
  {
    title: 'Treino de Range (8-max)',
    description: 'O modo clássico! Mesa completa com todas as 8 posições. Escolha cenários como Open Raise, vs 3-Bet, e até Simulação pós-flop. Ideal para dominar os ranges de cada posição.',
    icon: <Target className="h-6 w-6 text-primary" />,
    image: rangeImg,
  },
  {
    title: 'HU — Heads-Up (1x1)',
    description: 'Treine decisões diretas contra um único oponente (SB vs BB). Ranges mais amplos e dinâmica agressiva. Perfeito para torneios finais e sit-and-gos.',
    icon: <Swords className="h-6 w-6 text-primary" />,
    image: huImg,
  },
  {
    title: 'Three Hand (3 jogadores)',
    description: 'Mesa com BTN, SB e BB. Ranges intermediários entre o full ring e o heads-up. Ótimo para praticar dinâmicas de mesa curta.',
    icon: <UsersRound className="h-6 w-6 text-primary" />,
    image: threeHandImg,
  },
  {
    title: 'Modo Bounty (PKO)',
    description: 'Torneio Progressive Knockout! O valor do bounty de cada jogador altera os ranges GTO. Aprenda quando vale a pena arriscar pelo prêmio na cabeça do oponente.',
    icon: <Crown className="h-6 w-6 text-primary" />,
    image: bountyImg,
  },
  {
    title: 'Feedback GTO em tempo real',
    description: 'Após cada decisão, veja as frequências exatas de cada ação (Fold, Call, Raise, All-in), a perda de EV da sua jogada e um veredito de "Perfect" a "Blunder". Aprenda com cada mão!',
    icon: <Zap className="h-8 w-8 text-primary" />,
  },
  {
    title: 'Tabelas, Análise e Ranking',
    description: 'Consulte matrizes de range GTO por posição/stack. Analise suas sessões com gráficos de desempenho. Suba no ranking semanal e mensal competindo com outros jogadores!',
    icon: <Trophy className="h-8 w-8 text-primary" />,
  },
  {
    title: 'XP, Níveis e Conquistas',
    description: 'Ganhe XP a cada mão jogada (mais XP para decisões difíceis). Evolua de Iniciante a Lenda em 7 níveis. Desbloqueie conquistas especiais como "Sem Erro" e "Maratonista".',
    icon: <Award className="h-8 w-8 text-primary" />,
  },
  {
    title: 'Comunidade e Perfil',
    description: 'Compartilhe mãos interessantes no feed da comunidade, comente e reaja aos posts de outros jogadores. Seu perfil público mostra suas estatísticas e evolução!',
    icon: <Users className="h-8 w-8 text-primary" />,
  },
  {
    title: 'Pronto para treinar! 🎯',
    description: 'Agora é com você! Escolha um modo de treino e comece a evoluir no poker. Lembre-se: consistência é a chave. Boas mãos!',
    icon: <Sparkles className="h-8 w-8 text-primary" />,
  },
];

const ONBOARDING_KEY = 'gtorei_onboarding_completed';

export function OnboardingTutorial({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="p-6 pt-8">
          {/* Step counter */}
          <p className="text-xs text-muted-foreground mb-4">
            {currentStep + 1} de {steps.length}
          </p>

          {/* Icon / Image */}
          <div className="flex justify-center mb-5">
            {step.image ? (
              <div className="relative">
                <img
                  src={step.image}
                  alt={step.title}
                  className="w-28 h-28 object-contain rounded-xl border border-border bg-muted/30 p-2"
                />
                <div className="absolute -bottom-2 -right-2 bg-card border border-border rounded-full p-1.5">
                  {step.icon}
                </div>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                {step.icon}
              </div>
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-foreground text-center mb-3">
            {step.title}
          </h2>

          {/* Description */}
          <p className="text-sm text-muted-foreground text-center leading-relaxed mb-6">
            {step.description}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            {!isFirst ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep(s => s - 1)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground"
              >
                Pular
              </Button>
            )}

            {isLast ? (
              <Button
                onClick={handleComplete}
                className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Começar a treinar!
                <Zap className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentStep(s => s + 1)}
                className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 pb-5">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? 'w-6 bg-primary'
                  : i < currentStep
                  ? 'w-1.5 bg-primary/50'
                  : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function useOnboardingStatus() {
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      setNeedsOnboarding(true);
    }
  }, []);

  const completeOnboarding = () => {
    setNeedsOnboarding(false);
  };

  return { needsOnboarding, completeOnboarding };
}
