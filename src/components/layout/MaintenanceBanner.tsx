import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAINTENANCE_MESSAGES = [
  '🎓 Aulas gratuitas de poker GTO chegando em breve!',
  '🔧 Cenário "Multiway" está em manutenção',
  '🤖 Autoanálise com IA em desenvolvimento - em breve!',
  '⚡ Novas funcionalidades chegando em breve',
];

export function MaintenanceBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % MAINTENANCE_MESSAGES.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2 flex-1">
          <AlertTriangle className="h-4 w-4 text-primary flex-shrink-0" />
          <p className="text-sm text-primary animate-fade-in" key={currentIndex}>
            {MAINTENANCE_MESSAGES[currentIndex]}
          </p>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-primary/20 rounded transition-colors"
        >
          <X className="h-4 w-4 text-primary" />
        </button>
      </div>
    </div>
  );
}
