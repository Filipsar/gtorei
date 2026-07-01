import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Grid3x3, Heart, Instagram, ChevronLeft, ChevronRight, X, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'gtorei_last_update_seen';
const CURRENT_VERSION = '1.11.0';
const INSTAGRAM_URL = 'https://www.instagram.com/gtorei/';
const TOP1_POST_URL = 'https://www.instagram.com/p/DaQnLztGk6_/';
const DONATE_URL = '/apoiar';
const AUTO_ADVANCE_MS = 5000;

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
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen !== CURRENT_VERSION) {
      // pequeno delay para não competir com a renderização inicial
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const slides: Slide[] = [
    {
      icon: <Brain className="h-10 w-10" />,
      iconBg: 'bg-primary/20 text-primary',
      title: 'Análise de Torneio com IA',
      description:
        'Importe seu histórico PokerStars (e outras plataformas) e receba análise completa mão por mão com ICM, bubble factor e recomendações GTO.',
      badge: { label: 'NOVO', className: 'bg-feedback-best text-background' },
    },
    {
      icon: <Grid3x3 className="h-10 w-10" />,
      iconBg: 'bg-secondary/20 text-secondary',
      title: 'Base GTO Atualizada',
      description:
        'Ranges mais precisas para todos os modos — 8-Max, Heads-Up, Three-Hand e Bounty — com interpolação automática por stack size.',
      badge: { label: 'MELHORIA', className: 'bg-secondary text-background' },
    },
    {
      icon: <Heart className="h-10 w-10" />,
      iconBg: 'bg-destructive/20 text-destructive',
      title: 'Apoie o GTORei',
      titleClass: 'text-primary',
      description:
        'O GTORei é 100% gratuito e feito com muito carinho. Se você usa e gosta, considere apoiar o projeto e seguir no Instagram para novidades.',
      cta: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 w-full">
          <Button
            asChild
            className="bg-feedback-best text-background hover:bg-feedback-best/90"
          >
            <a href={DONATE_URL}>
              Apoiar o Projeto ☕
            </a>
          </Button>
          <Button
            asChild
            variant="secondary"
            className="bg-[#7B2FBE] text-white hover:bg-[#7B2FBE]/90"
          >
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              <Instagram className="h-4 w-4 mr-2" />
              Seguir no Instagram
            </a>
          </Button>
        </div>
      ),
    },
  ];

  const close = () => {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    setOpen(false);
  };

  const next = () => setIndex((i) => (i + 1) % slides.length);
  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);

  // auto-advance + barra de progresso
  useEffect(() => {
    if (!open) return;
    setProgress(0);
    const step = 50;
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        const np = p + (step / AUTO_ADVANCE_MS) * 100;
        if (np >= 100) {
          setIndex((i) => (i + 1) % slides.length);
          return 0;
        }
        return np;
      });
    }, step);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open, index, slides.length]);

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
        {/* Progress bar */}
        <div className="h-1 bg-muted relative">
          <div
            className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Close */}
        <button
          aria-label="Fechar"
          onClick={close}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-background/80 hover:bg-background text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Slide content */}
        <div className="px-6 sm:px-8 pt-10 pb-6 text-center min-h-[340px] flex flex-col items-center justify-center">
          <div className={cn('p-4 rounded-2xl mb-4 inline-flex', slide.iconBg)}>{slide.icon}</div>

          {slide.badge && (
            <Badge className={cn('mb-3', slide.badge.className)}>{slide.badge.label}</Badge>
          )}

          <h2 className={cn('text-heading-sm sm:text-heading-md mb-2', slide.titleClass ?? 'text-foreground')}>
            {slide.title}
          </h2>
          <p className="text-body-sm text-muted-foreground max-w-md">{slide.description}</p>

          {slide.cta}
        </div>

        {/* Arrows */}
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

        {/* Dots */}
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
