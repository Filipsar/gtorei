import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Crown, Gift } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { ehApp } from '@/lib/nativo/plataforma';
import { avisoDePrivacidadePendente } from '@/lib/consentimento';
import { introPendente } from '@/lib/testeDeNivel';
import { tourAtivo } from '@/lib/tour';
import { jaTevePopupNestaVisita, marcarPopupNestaVisita, PAGINAS_SEM_POPUP } from '@/lib/avisoDoDiscord';
import { avisoDeIndicacaoPendente, marcarIndicacaoVista, marcarQueAbriuIndicacao } from '@/lib/avisoDeIndicacao';

const PREMIOS = [
  { quantos: 15, premio: '7 dias de PRO' },
  { quantos: 100, premio: 'PRO para sempre' },
];

/** "Indique e ganhe": uma vez por semana, mesmas regras dos outros pop-ups */
export function IndiquePopup() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (location.pathname === '/indicar' || PAGINAS_SEM_POPUP.includes(location.pathname)) return;
    if (introPendente() || tourAtivo()) return;
    if (!avisoDeIndicacaoPendente()) return;
    // Antes do Discord (1,5 s) e depois do de novidades (0,8 s): um por visita
    const t = setTimeout(() => {
      if (jaTevePopupNestaVisita() || !avisoDeIndicacaoPendente() || avisoDePrivacidadePendente(ehApp()) || tourAtivo()) return;
      marcarPopupNestaVisita();
      marcarIndicacaoVista();
      setOpen(true);
    }, 1200);
    return () => clearTimeout(t);
  }, [user, location.pathname]);

  const abrir = () => {
    marcarQueAbriuIndicacao();
    setOpen(false);
    navigate('/indicar');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
        <div className="relative flex h-40 items-end justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_85%,hsl(var(--primary)/0.35),transparent_70%)]">
          <img
            src="/mascote/rei-bau.webp"
            alt=""
            aria-hidden="true"
            width={480}
            height={468}
            className="relative h-36 w-auto drop-shadow-xl motion-safe:animate-rei-sobe"
          />
        </div>

        <div className="flex flex-col items-center px-6 pb-6 pt-5 text-center">
          <Badge className="mb-3 bg-feedback-best text-background">
            <Gift className="mr-1 h-3 w-3" aria-hidden="true" />
            Indique e ganhe
          </Badge>
          <DialogTitle className="mb-2 text-heading-sm text-foreground">Traga seus amigos e ganhe PRO</DialogTitle>
          <DialogDescription className="text-body-sm text-muted-foreground">
            Cada amigo que cria a conta pelo seu link e treina 50 mãos conta como indicado. No caminho você ainda ganha XP e conquistas.
          </DialogDescription>

          <ul className="mt-4 grid w-full grid-cols-2 gap-2">
            {PREMIOS.map((p) => (
              <li key={p.quantos} className="rounded-xl border border-primary/30 bg-primary/10 p-3">
                <p className="text-2xl font-bold text-primary">{p.quantos}</p>
                <p className="text-xs text-muted-foreground">indicados</p>
                <p className="mt-1 flex items-center justify-center gap-1 text-sm font-semibold">
                  <Crown className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  {p.premio}
                </p>
              </li>
            ))}
          </ul>

          <Button onClick={abrir} className="mt-5 w-full">
            Pegar meu link
          </Button>
          <Button variant="ghost" className="mt-2 w-full" onClick={() => setOpen(false)}>
            Agora não
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
