import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Instagram, Heart, Accessibility, ArrowRight } from 'lucide-react';
import gtoreiLogo from '@/assets/gtorei-crown.png';
export default function HomePage() {
  const navigate = useNavigate();
  return <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Animated tech background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `
              linear-gradient(rgba(255, 184, 0, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 184, 0, 0.1) 1px, transparent 1px)
            `,
        backgroundSize: '50px 50px'
      }} />

        {/* Floating particles */}
        {Array.from({
        length: 20
      }).map((_, i) => <div key={i} className="absolute w-1 h-1 rounded-full bg-primary/30" style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
        animationDelay: `${Math.random() * 2}s`
      }} />)}

        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{
        animationDelay: '1s'
      }} />

        {/* Connecting lines */}
        <svg className="absolute inset-0 w-full h-full opacity-5">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          {Array.from({
          length: 5
        }).map((_, i) => <line key={i} x1={`${i * 25}%`} y1="0" x2={`${(i + 1) * 25}%`} y2="100%" stroke="url(#lineGradient)" strokeWidth="1" className="animate-pulse" style={{
          animationDelay: `${i * 0.5}s`
        }} />)}
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6 text-center">
        {/* Floating Logo */}
        <div className="mb-8 animate-float">
          <img alt="GTORei Logo" className="w-40 h-40 sm:w-56 sm:h-56 object-contain drop-shadow-2xl" style={{
          filter: 'drop-shadow(0 0 30px rgba(255, 184, 0, 0.3))'
        }} src="/lovable-uploads/bedf00eb-3f1f-4389-955b-e4b51a3122e9.png" />
        </div>

        {/* Title */}
        <h1 className="text-display-md sm:text-display-xl text-foreground mb-4">
          <span className="text-primary">GTO</span>Rei
        </h1>

        {/* Description */}
        <p className="text-body-lg text-muted-foreground max-w-xl mb-4">
          Treinador de Poker GTO gratuito para jogadores que querem evoluir no poker.
        </p>
        

        {/* CTA Button */}
        <Button onClick={() => navigate('/treinar')} size="lg" className="text-xl px-10 py-7 font-bold bg-primary text-primary-foreground hover:bg-primary/90 glow-gold mb-12">
          Jogar
        </Button>

        {/* Accessibility section */}
        <div className="w-full max-w-lg mb-8 p-6 rounded-xl bg-muted/30 border border-border">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Accessibility className="h-5 w-5 text-primary" />
            <h2 className="text-heading-md">Acessibilidade</h2>
          </div>
          <p className="text-body-sm text-muted-foreground mb-4">O GTORei apoia projetos para deficientes e promove a inclusão no poker.</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/gtoreiacessibilidade')} className="gap-2">
            Saiba mais
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Creator info */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <p className="text-body-sm text-muted-foreground">Criado por</p>
          <a href="https://www.instagram.com/filiperubini/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors group">
            <Instagram className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
            <span className="font-medium">Filipe Rubini</span>
          </a>
        </div>

        {/* Support button */}
        <Button onClick={() => navigate('/apoiar')} variant="outline" className="flex items-center gap-2 border-primary/50 hover:bg-primary/10">
          <Heart className="h-4 w-4 text-destructive" />
          Ajude o projeto a se manter
        </Button>
      </div>

      {/* CSS for floating animation */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-20px) scale(1.05);
          }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>;
}