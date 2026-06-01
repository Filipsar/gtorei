import { useState, useEffect } from 'react';
import { Instagram, X } from 'lucide-react';

const BANNER_MESSAGES = [
  { text: 'Siga o GTORei no Instagram — @gtorei', icon: true, link: 'https://www.instagram.com/gtorei/' },
  { text: '📊 Estamos atualizando o sistema de Tabelas' },
  { text: '🔧 Novos cenários e melhorias chegando em breve!' },
  { text: '🤖 Autoanálise com IA em desenvolvimento - em breve!' },
  { text: '⚡ Novas funcionalidades chegando em breve' },
  { text: 'Siga o GTORei no Instagram — @gtorei', icon: true, link: 'https://www.instagram.com/gtorei/' },
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

  const content = (
    <span className="animate-marquee-single whitespace-nowrap inline-flex items-center gap-2 text-sm font-medium" key={animKey}>
      {msg.icon && <Instagram className="h-4 w-4" />}
      {msg.text}
    </span>
  );

  return (
    <div className="relative bg-primary text-primary-foreground overflow-hidden h-8 flex items-center">
      {msg.link ? (
        <a href={msg.link} target="_blank" rel="noopener noreferrer" className="w-full flex justify-center hover:opacity-80 transition-opacity px-10">
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
        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-primary-foreground/15 transition-colors z-10"
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
