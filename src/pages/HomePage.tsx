import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Instagram, Heart, Accessibility, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Rolling Instagram banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground overflow-hidden h-9 flex items-center">
        <a href="https://www.instagram.com/gtorei/" target="_blank" rel="noopener noreferrer" className="animate-marquee whitespace-nowrap flex items-center gap-6 hover:opacity-80 transition-opacity">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="inline-flex items-center gap-2 text-sm font-medium">
              <Instagram className="h-4 w-4" />
              {t.home.instagramBanner}
            </span>
          ))}
        </a>
      </div>
      {/* Animated tech background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `
              linear-gradient(rgba(255, 184, 0, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 184, 0, 0.1) 1px, transparent 1px)
            `,
        backgroundSize: '50px 50px'
      }} />
        {Array.from({ length: 20 }).map((_, i) => <div key={i} className="absolute w-1 h-1 rounded-full bg-primary/30" style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
        animationDelay: `${Math.random() * 2}s`
      }} />)}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <svg className="absolute inset-0 w-full h-full opacity-5">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          {Array.from({ length: 5 }).map((_, i) => <line key={i} x1={`${i * 25}%`} y1="0" x2={`${(i + 1) * 25}%`} y2="100%" stroke="url(#lineGradient)" strokeWidth="1" className="animate-pulse" style={{ animationDelay: `${i * 0.5}s` }} />)}
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="mb-8 animate-float">
          <img alt="GTORei Logo" className="w-40 h-40 sm:w-56 sm:h-56 object-contain drop-shadow-2xl" style={{ filter: 'drop-shadow(0 0 30px rgba(255, 184, 0, 0.3))' }} src="/lovable-uploads/518567fe-7b99-45ff-92c1-2879711b6051.png" />
        </div>

        <h1 className="text-display-md sm:text-display-xl text-foreground mb-4">
          <span className="text-primary">GTO</span>{t.home.title}
        </h1>

        <p className="text-body-lg text-muted-foreground max-w-xl mb-4">
          {t.home.description}
        </p>

        <Button onClick={() => navigate('/treinar')} size="lg" className="text-xl px-10 py-7 font-bold bg-primary text-primary-foreground hover:bg-primary/90 glow-gold mb-12">
          {t.home.play}
        </Button>

        <div className="flex flex-col items-center gap-4 mb-8">
          <a href="https://www.instagram.com/gtorei/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors group">
            <Instagram className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
            <span className="font-medium">{t.home.followUs}</span>
          </a>
        </div>

        <Button onClick={() => navigate('/apoiar')} variant="outline" className="flex items-center gap-2 border-primary/50 hover:bg-primary/10 mb-8">
          <Heart className="h-4 w-4 text-destructive" />
          {t.home.supportProject}
        </Button>

        <div className="w-full max-w-lg p-6 rounded-xl bg-muted/30 border border-border">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Accessibility className="h-5 w-5 text-primary" />
            <h2 className="text-heading-md">{t.home.accessibility}</h2>
          </div>
          <p className="text-body-sm text-muted-foreground mb-4">{t.home.accessibilityDesc}</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/gtoreiacessibilidade')} className="gap-2">
            {t.home.learnMore}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee { animation: marquee 20s linear infinite; }
      `}</style>
    </div>;
}
