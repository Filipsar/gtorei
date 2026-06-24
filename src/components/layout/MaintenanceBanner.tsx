import { useState, useEffect } from 'react';
import { Instagram, X, Heart, Brain, Sparkles, Trophy } from 'lucide-react';

const BANNER_MESSAGES = [
  {
    text: 'Análise de Torneio com IA disponível agora!',
    icon: <Brain className="h-4 w-4" />,
    link: '/analise-ia',
    internal: true,
  },
  {
    text: 'Novo Ranking GTO Rei — 250k XP! Com efeito LED!',
    icon: <Trophy className="h-4 w-4" />,
    link: '/ranking',
    internal: true,
  },
  {
    text: 'Ranges GTO atualizadas para todos os modos',
    icon: <Sparkles className="h-4 w-4" />,
    link: '/treinar',
    internal: true,
  },
  {
    text: 'Apoie o GTORei e mantenha o projeto gratuito',
    icon: <Heart className="h-4 w-4" />,
    link: '/apoiar',
    internal: true,
  },
  {
    text: 'Siga o GTORei no Instagram — @gtorei',
    icon: <Instagram className="h-4 w-4" />,
    link: 'https://www.instagram.com/gtorei/',
    internal: false,
  },
];

const DISMISS_KEY = 'gtorei_banner_dismissed';

export function MaintenanceBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(DISMISS_KEY) === '1') {
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    if (dismissed) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BANNER_MESSAGES.length);
      setAnimKey((k) => k + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, [dismissed]);

  if (dismissed) return null;

  const msg = BANNER_MESSAGES[currentIndex];

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!msg.link) return;
    if (msg.internal) {
      e.preventDefault();
      window.location.href = msg.link;
    }
    // external links use normal <a> behavior
  };

  const content = (
    <span className="animate-marquee-single whitespace-nowrap inline-flex items-center gap-2 text-sm font-medium" key={animKey}>
      {msg.icon}
      {msg.text}
    </span>
  );

  return (
    <div className="relative overflow-hidden h-8 flex items-center" style={{ backgroundColor: '#2cff05', color: '#0a0a0a' }}>
      {msg.link ? (
        <a
          href={msg.link}
          target={msg.internal ? undefined : '_blank'}
          rel={msg.internal ? undefined : 'noopener noreferrer'}
          onClick={handleClick}
          className="w-full flex justify-center hover:opacity-80 transition-opacity px-10 cursor-pointer"
        >
          {content}
        </a>
      ) : (
        <div className="w-full flex justify-center px-10">
          {content}
        </div>
      )}
      <button
        onClick={handleDismiss}
        aria-label="Fechar banner"
        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-black/15 transition-colors z-10"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <style>{`
        @keyframes marquee-single {
          0% { transform: translateX(100%); }
          15% { transform: translateX(0); }
          85% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee-single { animation: marquee-single 4s linear; }
      `}</style>
    </div>
  );
}
