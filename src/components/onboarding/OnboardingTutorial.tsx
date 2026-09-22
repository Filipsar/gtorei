import { useCallback, useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Zap, Trophy, Award, Users, ChevronRight, ChevronLeft, X, Sparkles, Target, Swords,
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
    icon: <Target className="h-5 w-5 text-primary" />,
    image: rangeImg,
  },
  {
    title: 'HU — Heads-Up (1x1)',
    description: 'Treine decisões diretas contra um único oponente (SB vs BB). Ranges mais amplos e dinâmica agressiva. Perfeito para torneios finais e sit-and-gos.',
    icon: <Swords className="h-5 w-5 text-primary" />,
    image: huImg,
  },
  {
    title: 'Three Hand (3 jogadores)',
    description: 'Mesa com BTN, SB e BB. Ranges intermediários entre o full ring e o heads-up. Ótimo para praticar dinâmicas de mesa curta.',
    icon: <UsersRound className="h-5 w-5 text-primary" />,
    image: threeHandImg,
  },
  {
    title: 'Modo Bounty (PKO)',
    description: 'Torneio Progressive Knockout! O valor do bounty de cada jogador altera os ranges GTO. Aprenda quando vale a pena arriscar pelo prêmio na cabeça do oponente.',
    icon: <Crown className="h-5 w-5 text-primary" />,
    image: bountyImg,
  },
  {
    title: 'Feedback GTO em tempo real',
    description: 'Após cada decisão, veja as frequências exatas de cada ação (Fold, Call, Raise, All-in), a perda de EV da sua jogada e um veredito de "Perfect" a "Blunder". Aprenda com cada mão!',
    icon: <Zap className="h-8 w-8 text-primary" />,
  },
  {
    title: 'Tabelas, Análise e Ranking',
    description: 'Consulte matrizes de range GTO por posição e stack. Analise suas sessões com gráficos de desempenho. Dispute o ranking mensal, que zera todo mês e dá a todo mundo uma nova chance de chegar ao topo.',
    icon: <Trophy className="h-8 w-8 text-primary" />,
  },
  {
    title: 'XP, Níveis e Conquistas',
    description: 'Ganhe XP a cada mão jogada (mais XP para decisões difíceis). Evolua de Iniciante a GTO Rei em 8 níveis. Desbloqueie conquistas como "Sessão Perfeita", "Imparável" e "Maratonista".',
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

const ONBOARDING_KEY = 'gtorei_onboarding_completed_v2';

// Quando o navegador bloqueia o armazenamento (aba anônima, cookies negados) o
// localStorage lança em vez de devolver null. Sem este fallback em memória, o
// clique em "Começar a treinar" estourava antes de fechar e prendia o usuário
// dentro do modal.
let vistoNestaSessao = false;

export function jaViuOnboarding(): boolean {
  if (vistoNestaSessao) return true;
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    return false;
  }
}

function marcarOnboardingVisto() {
  vistoNestaSessao = true;
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {
    // Segue sem persistir: vale ao menos para esta sessão
  }
}

export function OnboardingTutorial({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const tituloId = useId();
  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  const handleComplete = useCallback(() => {
    marcarOnboardingVisto();
    setIsVisible(false);
    onComplete();
  }, [onComplete]);

  // Trava a rolagem do fundo: sem isso a página deslizava por trás do modal.
  // Precisa ser nos dois elementos — só no body a viewport continuava rolando.
  useEffect(() => {
    const raiz = document.documentElement;
    const anteriorRaiz = raiz.style.overflow;
    const anteriorBody = document.body.style.overflow;
    raiz.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      raiz.style.overflow = anteriorRaiz;
      document.body.style.overflow = anteriorBody;
    };
  }, []);

  // Esc fecha, setas navegam
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        handleComplete();
      } else if (evento.key === 'ArrowRight') {
        setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
      } else if (evento.key === 'ArrowLeft') {
        setCurrentStep((s) => Math.max(s - 1, 0));
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [handleComplete]);

  if (!isVisible) return null;

  return (
    // pointer-events-auto não é enfeite: um modal do Radix aberto em qualquer
    // lugar da página marca o body com pointer-events: none, e este overlay,
    // que não é do Radix, herdava isso e ficava sem responder a clique nenhum.
    <div className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        role="dialog"
        aria-modal="true"
        data-state="open"
        aria-labelledby={tituloId}
        className="relative my-auto flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="h-1 shrink-0 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <button
          onClick={handleComplete}
          aria-label="Fechar tutorial"
          className="absolute right-4 top-4 z-10 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Só o conteúdo rola. A navegação fica fixa embaixo: numa janela baixa
            (celular deitado) os botões saíam da tela e não dava para avançar. */}
        <div className="flex-1 overflow-y-auto p-6 pt-8">
          <p className="mb-4 text-xs text-muted-foreground">
            {currentStep + 1} de {steps.length}
          </p>

          <div className="mb-5 flex justify-center">
            {step.image ? (
              <div className="relative">
                {/* A arte tem 64px de origem: exibi-la a 112px deixava tudo borrado.
                    O emblema passou para a moldura, em vez de cobrir o desenho. */}
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <img src={step.image} alt="" width={64} height={64} className="h-16 w-16 object-contain" />
                </div>
                <div className="absolute -bottom-2 -right-2 rounded-full border border-border bg-card p-1.5">
                  {step.icon}
                </div>
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                {step.icon}
              </div>
            )}
          </div>

          <h2 id={tituloId} className="mb-3 text-center text-xl font-bold text-foreground">
            {step.title}
          </h2>

          <p className="text-center text-sm leading-relaxed text-muted-foreground">
            {step.description}
          </p>
        </div>

        <div className="shrink-0 border-t border-border px-6 pb-4 pt-4">
          <div className="flex items-center justify-between gap-3">
            {!isFirst ? (
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep((s) => s - 1)} className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={handleComplete} className="text-muted-foreground">
                Pular
              </Button>
            )}

            {isLast ? (
              <Button onClick={handleComplete} className="gap-1">
                Começar a treinar!
                <Zap className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => setCurrentStep((s) => s + 1)} className="gap-1">
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="mt-4 flex justify-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                aria-label={`Ir para o passo ${i + 1}`}
                aria-current={i === currentStep ? 'step' : undefined}
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
    </div>
  );
}

export function useOnboardingStatus() {
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!jaViuOnboarding()) setNeedsOnboarding(true);
  }, []);

  const completeOnboarding = () => {
    marcarOnboardingVisto();
    setNeedsOnboarding(false);
  };

  return { needsOnboarding, completeOnboarding };
}
