import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Instagram, ChevronLeft, ChevronRight, X, Smartphone, Trophy } from 'lucide-react';
import { EloBadge } from '@/components/app/EloBadge';
import { useAuth } from '@/contexts/AuthContext';
import { jaViuOnboarding } from '@/components/onboarding/OnboardingTutorial';
import { TESTE_ANDROID_ABERTO } from '@/data/appAndroid';
import { ehApp } from '@/lib/nativo/plataforma';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'gtorei_last_update_seen';
const CURRENT_VERSION = '1.26.0';
const INSTAGRAM_URL = 'https://www.instagram.com/gtorei/';
const DONATE_URL = '/apoiar';

// Páginas abertas ao público (SEO e conteúdo): o popup não abre nelas
const QUIET_PATHS = ['/iniciante', '/atualizacoes', '/gtoreiacessibilidade', '/apoiar', '/baixar-app'];

type Slide = {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  titleClass?: string;
  description: string;
  badge?: { label: string; className: string };
  cta?: React.ReactNode;
};

export function UpdatesPopup() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const marcarVersaoVista = () => {
    try {
      localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    } catch {
      // sem storage o popup volta na próxima visita, mas não quebra nada
    }
  };

  useEffect(() => {
    // Só para quem está logado e fora das páginas públicas de conteúdo
    if (!user) return;
    if (QUIET_PATHS.includes(location.pathname)) return;

    // Quem ainda não terminou o tutorial inicial não vê este pop-up. Dois
    // motivos: "as melhorias chegaram" não diz nada a quem chegou agora, e
    // este é um modal do Radix — ao abrir, ele marca o body com
    // pointer-events: none e congela o tutorial e o teste de nível, que são
    // overlays comuns. Marcar a versão como vista evita que ele pule na cara
    // do usuário no instante em que o tutorial termina.
    if (!jaViuOnboarding()) {
      marcarVersaoVista();
      return;
    }

    let seen: string | null = null;
    try {
      seen = localStorage.getItem(STORAGE_KEY);
    } catch {
      return;
    }
    if (seen === CURRENT_VERSION) return;

    // pequeno delay para não competir com a renderização inicial
    const t = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(t);
  }, [user, location.pathname]);

  const close = () => {
    marcarVersaoVista();
    setOpen(false);
  };

  // Fecha antes de navegar: com <a href> o app recarregava inteiro
  const irPara = (rota: string) => {
    close();
    navigate(rota);
  };

  const slides: Slide[] = [
    // Dentro do app o convite não faz sentido: quem vê já instalou
    ...(TESTE_ANDROID_ABERTO && !ehApp()
      ? [
          {
            icon: <Smartphone className="h-10 w-10" />,
            iconBg: 'bg-primary/20 text-primary',
            title: 'O GTORei tem app para Android',
            titleClass: 'text-primary',
            description:
              'O app está em teste no Google Play e você pode baixar agora, com a mesma conta do site. Para o Google liberar o app para todo mundo, precisamos de testadores que fiquem inscritos por 14 dias seguidos. São três passos e leva dois minutos.',
            badge: { label: 'NOVO', className: 'bg-feedback-best text-background' },
            cta: (
              <div className="mt-4 w-full flex justify-center">
                <Button onClick={() => irPara('/baixar-app')}>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Quero baixar o app
                </Button>
              </div>
            ),
          },
        ]
      : []),
    {
      // Três brasões da escada no lugar do ícone
      icon: (
        <span className="flex items-end gap-1" aria-hidden="true">
          <EloBadge elo={1} tamanho={34} />
          <EloBadge elo={4} tamanho={42} />
          <EloBadge elo={7} tamanho={52} />
        </span>
      ),
      iconBg: 'bg-primary/15',
      title: 'Ranking novo: ligas por elo',
      titleClass: 'text-primary',
      description:
        'Bronze, Prata, Ouro, Adamantio, Rúnico, Diamante e Rei. Todo dia você disputa com quem está no seu elo: os primeiros sobem e os últimos caem (no Bronze ninguém cai). O XP do dia é o de sempre, das mãos, do simulado e do duelo. O ranking global do mês continua, agora com o elo de cada um.',
      badge: { label: 'NOVO', className: 'bg-feedback-best text-background' },
      cta: (
        <div className="mt-4 w-full flex justify-center">
          <Button onClick={() => irPara('/ranking')}>
            <Trophy className="h-4 w-4 mr-2" />
            Ver minha liga
          </Button>
        </div>
      ),
    },
    {
      icon: <Heart className="h-10 w-10" />,
      iconBg: 'bg-destructive/20 text-destructive',
      title: 'Apoie o GTORei',
      titleClass: 'text-primary',
      description:
        'O treino do GTORei é grátis e feito com muito carinho. Se você usa e gosta, considere apoiar o projeto e seguir no Instagram para novidades.',
      cta: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 w-full">
          <Button
            className="bg-feedback-best text-background hover:bg-feedback-best/90"
            onClick={() => irPara(DONATE_URL)}
          >
            Apoiar o Projeto ☕
          </Button>
          <Button asChild variant="outline">
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              <Instagram className="h-4 w-4 mr-2" />
              Seguir no Instagram
            </a>
          </Button>
        </div>
      ),
    },
  ];

  const next = () => setIndex((i) => (i + 1) % slides.length);
  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 50) prev();
    else if (dx < -50) next();
    touchStartX.current = null;
  };

  const slide = slides[index];

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? close() : setOpen(true))}>
      <DialogContent
        className="max-w-lg p-0 overflow-hidden gap-0"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button
          aria-label="Fechar"
          onClick={close}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-background/80 hover:bg-background text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 sm:px-8 pt-10 pb-6 text-center min-h-[340px] flex flex-col items-center justify-center">
          <div className={cn('p-4 rounded-2xl mb-4 inline-flex', slide.iconBg)}>{slide.icon}</div>

          {slide.badge && (
            <Badge className={cn('mb-3', slide.badge.className)}>{slide.badge.label}</Badge>
          )}

          {/* DialogTitle é exigido pelo Radix para leitores de tela */}
          <DialogTitle className={cn('text-heading-sm sm:text-heading-md mb-2', slide.titleClass ?? 'text-foreground')}>
            {slide.title}
          </DialogTitle>
          <p className="text-body-sm text-muted-foreground max-w-md">{slide.description}</p>

          {slide.cta}
        </div>

        <button
          onClick={prev}
          aria-label="Anterior"
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/60 hover:bg-background"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={next}
          aria-label="Próximo"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/60 hover:bg-background"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="flex justify-center gap-2 pb-5">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Ir para slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                'h-2 rounded-full transition-all',
                i === index ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/40'
              )}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
