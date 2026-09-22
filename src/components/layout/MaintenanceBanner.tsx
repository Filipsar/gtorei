import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Brain, Heart, Instagram, LayoutGrid, Spade, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BannerMessage {
  /** Texto usado a partir de 640px */
  text: string;
  /** Versão curta, usada abaixo de 1024px: a faixa tem uma linha só */
  shortText: string;
  icon: React.ReactNode;
  link: string;
  external?: boolean;
  /** Etiqueta do que acabou de sair */
  tag?: string;
  /** Chamada de ação: pinta a faixa inteira de dourado e vira botão */
  cta?: string;
  /** Rótulo curto do botão, para o celular */
  ctaShort?: string;
  /** Tempo na tela, em ms */
  dwell?: number;
}

const DEFAULT_DWELL = 5000;

const BANNER_MESSAGES: BannerMessage[] = [
  {
    text: 'Sem anúncios e sem mensalidade. Qualquer valor mantém o GTORei no ar.',
    shortText: 'Ajude a manter o GTORei no ar',
    icon: <Heart className="h-4 w-4 shrink-0" aria-hidden="true" />,
    link: '/apoiar',
    cta: 'Apoiar com Pix',
    ctaShort: 'Apoiar',
    // Fica mais tempo que as outras: é a única que pede algo de volta
    dwell: 8000,
  },
  {
    text: 'Mesa refeita: você senta sempre embaixo e a mesa gira em volta',
    shortText: 'Mesa nova: você senta embaixo',
    icon: <Spade className="h-4 w-4 shrink-0" aria-hidden="true" />,
    link: '/treinar',
    tag: 'Novo',
  },
  {
    text: 'Ranges de push/fold agora são calculadas por EV, não copiadas de tabela',
    shortText: 'Ranges de push/fold por EV',
    icon: <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden="true" />,
    link: '/tabelas',
    tag: 'Novo',
  },
  {
    text: 'Análise de torneio com IA: importe seu hand history e receba o relatório',
    shortText: 'Análise de torneio com IA',
    icon: <Brain className="h-4 w-4 shrink-0" aria-hidden="true" />,
    link: '/analise-ia',
  },
  {
    text: 'Siga o GTORei no Instagram — @gtorei',
    shortText: 'Instagram — @gtorei',
    icon: <Instagram className="h-4 w-4 shrink-0" aria-hidden="true" />,
    link: 'https://www.instagram.com/gtorei/',
    external: true,
  },
];

const DISMISS_KEY = 'gtorei_banner_dismissed';

/* Trocar de página remonta o MainLayout inteiro. Sem guardar o índice fora do
   componente a rotação recomeçava do zero a cada clique no menu, e quem navega
   nunca chegava a ver as últimas mensagens. */
let lastIndex = 0;

function wasDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    // Armazenamento bloqueado (aba anônima, cookies negados): mostra a faixa
    return false;
  }
}

export function MaintenanceBanner() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(() => lastIndex % BANNER_MESSAGES.length);
  const [dismissed, setDismissed] = useState(wasDismissed);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Quem pediu menos movimento no sistema vê a mensagem parada
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    lastIndex = currentIndex;
  }, [currentIndex]);

  const message = BANNER_MESSAGES[currentIndex];

  useEffect(() => {
    if (dismissed || reducedMotion || paused) return;
    const id = setTimeout(
      () => setCurrentIndex((prev) => (prev + 1) % BANNER_MESSAGES.length),
      message.dwell ?? DEFAULT_DWELL
    );
    return () => clearTimeout(id);
  }, [dismissed, reducedMotion, paused, currentIndex, message.dwell]);

  if (dismissed) return null;

  const highlighted = Boolean(message.cta);

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Sem armazenamento a faixa volta na próxima visita, mas fecha agora
    }
    setDismissed(true);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (message.external) return; // link externo segue o comportamento normal
    // Navegação do react-router: sem recarregar a página inteira
    e.preventDefault();
    navigate(message.link);
  };

  return (
    <div
      role="region"
      aria-label="Novidades do GTORei"
      className={cn(
        'relative flex h-9 items-center overflow-hidden border-b transition-colors duration-500',
        highlighted
          ? 'border-[hsl(var(--primary))] bg-primary text-primary-foreground'
          : 'border-[hsl(var(--banner-border))] bg-[hsl(var(--banner-bg))] text-[hsl(var(--banner-fg))]'
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <a
        href={message.link}
        target={message.external ? '_blank' : undefined}
        rel={message.external ? 'noopener noreferrer' : undefined}
        onClick={handleClick}
        className="group flex h-full w-full items-center justify-center pl-3 pr-9 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-current sm:px-9"
      >
        {/* A troca é um fade curto com subida de 10px. Antes a mensagem
            atravessava a faixa inteira: o texto se mexia enquanto era lido. */}
        <span key={currentIndex} className="flex min-w-0 animate-slide-up items-center gap-2">
          {message.icon}
          {/* O texto longo só entra a partir de lg: abaixo disso a barra lateral
              come 256px da largura e a frase inteira era cortada no meio. */}
          <span className="truncate text-xs font-medium sm:text-sm">
            <span className="lg:hidden">{message.shortText}</span>
            <span className="hidden lg:inline">{message.text}</span>
          </span>

          {message.tag && (
            <span className="shrink-0 rounded border border-current px-1.5 text-[10px] font-bold uppercase leading-4 tracking-wide">
              {message.tag}
            </span>
          )}

          {message.cta && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[hsl(var(--primary-foreground))] px-2.5 py-1 text-[11px] font-bold text-[hsl(var(--primary))] shadow-sm sm:text-xs">
              <span className="sm:hidden">{message.ctaShort ?? message.cta}</span>
              <span className="hidden sm:inline">{message.cta}</span>
              <ArrowRight
                className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          )}
        </span>
      </a>

      <button
        onClick={handleDismiss}
        aria-label="Fechar avisos"
        className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded p-1 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
