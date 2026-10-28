import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { introPendente } from '@/lib/testeDeNivel';
import { tourAtivo } from '@/lib/tour';
import { ehApp } from '@/lib/nativo/plataforma';
import { avisoDePrivacidadePendente } from '@/lib/consentimento';
import {
  avisoDoDiscordPendente,
  DISCORD_URL,
  jaTevePopupNestaVisita,
  marcarAvisoVistoHoje,
  marcarPopupNestaVisita,
  marcarQueEntrou,
  PAGINAS_SEM_POPUP,
} from '@/lib/avisoDoDiscord';

// Logo do Discord (Simple Icons, CC0)
function LogoDiscord({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.1.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

// Confete em volta do rei: posição, cor, atraso e duração de cada papel
const CONFETE = [
  { left: '8%', cor: 'bg-primary', atraso: '0s', duracao: '2.6s' },
  { left: '18%', cor: 'bg-[#5865F2]', atraso: '0.7s', duracao: '2.2s' },
  { left: '27%', cor: 'bg-foreground/80', atraso: '1.3s', duracao: '2.8s' },
  { left: '36%', cor: 'bg-primary', atraso: '0.4s', duracao: '2.4s' },
  { left: '63%', cor: 'bg-[#5865F2]', atraso: '1s', duracao: '2.5s' },
  { left: '72%', cor: 'bg-primary', atraso: '0.2s', duracao: '2.3s' },
  { left: '81%', cor: 'bg-foreground/80', atraso: '0.9s', duracao: '2.7s' },
  { left: '91%', cor: 'bg-primary', atraso: '1.5s', duracao: '2.4s' },
];

export function DiscordPopup() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (PAGINAS_SEM_POPUP.includes(location.pathname)) return;
    // Pop-up do Radix por cima do teste de nível congela o teste (ver UpdatesPopup)
    if (introPendente() || tourAtivo()) return;
    if (!avisoDoDiscordPendente()) return;
    // Depois do de novidades, que abre em 800 ms: se ele abriu, este fica para outra
    // visita. Com o aviso de privacidade aberto, espera a próxima página
    const t = setTimeout(() => {
      if (jaTevePopupNestaVisita() || !avisoDoDiscordPendente() || avisoDePrivacidadePendente(ehApp()) || tourAtivo()) return;
      marcarPopupNestaVisita();
      marcarAvisoVistoHoje();
      setOpen(true);
    }, 1500);
    return () => clearTimeout(t);
  }, [user, location.pathname]);

  const entrar = (e: React.MouseEvent) => {
    marcarQueEntrou();
    setOpen(false);
    // No app, link com target _blank não sai do WebView: abre no navegador do celular
    if (ehApp()) {
      e.preventDefault();
      void import('@capacitor/browser').then(({ Browser }) => Browser.open({ url: DISCORD_URL }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
        <div className="relative h-44 overflow-hidden bg-[radial-gradient(circle_at_50%_85%,hsl(var(--primary)/0.35),transparent_70%)] flex items-end justify-center">
          {CONFETE.map((c, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`absolute top-0 h-2.5 w-1.5 rounded-[1px] opacity-0 motion-safe:animate-confete motion-reduce:hidden ${c.cor}`}
              style={{ left: c.left, animationDelay: c.atraso, animationDuration: c.duracao }}
            />
          ))}
          <img
            src="/mascote/rei-acertou.webp"
            alt=""
            aria-hidden="true"
            width={445}
            height={372}
            className="relative h-40 w-auto drop-shadow-xl motion-safe:animate-rei-comemora"
          />
        </div>

        <div className="px-6 pt-5 pb-6 text-center flex flex-col items-center">
          <Badge className="mb-3 bg-feedback-best text-background">NOVO</Badge>
          <DialogTitle className="text-heading-sm text-foreground mb-2">
            O GTORei agora tem servidor no Discord!
          </DialogTitle>
          <DialogDescription className="text-body-sm text-muted-foreground">
            Chegue para conversar sobre mãos, tirar dúvidas de spot e acompanhar as novidades junto com a comunidade.
          </DialogDescription>

          <Button asChild className="mt-5 w-full bg-[#5865F2] text-white hover:bg-[#4752C4]">
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" onClick={entrar}>
              <LogoDiscord className="h-5 w-5 mr-2" />
              Entrar no servidor
            </a>
          </Button>
          <Button variant="ghost" className="mt-2 w-full" onClick={() => setOpen(false)}>
            Agora não
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
