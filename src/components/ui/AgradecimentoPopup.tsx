import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Heart, MessageCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSupporter } from '@/hooks/useSupporter';
import { introPendente } from '@/lib/testeDeNivel';
import { tourAtivo } from '@/lib/tour';
import { ehApp } from '@/lib/nativo/plataforma';
import { avisoDePrivacidadePendente } from '@/lib/consentimento';
import { jaTevePopupNestaVisita, marcarPopupNestaVisita, PAGINAS_SEM_POPUP } from '@/lib/avisoDoDiscord';
import { agradecimentoPendente, marcarAgradecimentoVisto, whatsappSemPro } from '@/lib/agradecimento';

/**
 * Agradece as doações. Para quem é PRO, confirma que está liberado; para quem
 * não é, avisa que quem doou já tem PRO e dá o WhatsApp para quem doou e não
 * vê o PRO. Só no site: no app o PRO é a compra do Google Play e não há Pix.
 */
export function AgradecimentoPopup() {
  const { user } = useAuth();
  const { isSupporter, loading } = useSupporter();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || loading || ehApp()) return;
    if (PAGINAS_SEM_POPUP.includes(location.pathname)) return;
    if (introPendente() || tourAtivo()) return;
    if (!agradecimentoPendente(user.id)) return;
    // Depois do de novidades (0,8 s) e antes do de indicação (1,2 s) e do Discord (1,5 s)
    const t = setTimeout(() => {
      if (jaTevePopupNestaVisita() || !agradecimentoPendente(user.id) || avisoDePrivacidadePendente(false) || tourAtivo()) return;
      marcarPopupNestaVisita();
      marcarAgradecimentoVisto(user.id);
      setOpen(true);
    }, 1000);
    return () => clearTimeout(t);
  }, [user, loading, location.pathname]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
        <div className="flex h-40 items-end justify-center bg-[radial-gradient(circle_at_50%_85%,hsl(var(--primary)/0.35),transparent_70%)]">
          <img
            src="/mascote/rei-joinha.webp"
            alt=""
            aria-hidden="true"
            width={324}
            height={420}
            className="h-36 w-auto drop-shadow-xl motion-safe:animate-rei-comemora"
          />
        </div>

        <div className="flex flex-col items-center px-6 pb-6 pt-5 text-center">
          <DialogTitle className="mb-2 flex items-center gap-2 text-heading-sm text-foreground">
            <Heart className="h-5 w-5 fill-red-500 text-red-500" aria-hidden="true" />
            Obrigado a quem doou!
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-body-sm text-muted-foreground">
              <p>
                São as doações que mantêm o GTORei no ar e grátis para todo mundo.{' '}
                {isSupporter ? (
                  <strong className="text-foreground">O seu PRO já está liberado. Bom treino!</strong>
                ) : (
                  'Quem doou já está com o PRO liberado na conta.'
                )}
              </p>
              <p>Doou e o PRO não apareceu? Fale comigo no WhatsApp que eu libero.</p>
            </div>
          </DialogDescription>

          <Button asChild className="mt-5 w-full bg-[#0F7A36] text-white hover:bg-[#0B6029]">
            <a href={whatsappSemPro()} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
              <MessageCircle className="mr-2 h-5 w-5" aria-hidden="true" />
              Falar no WhatsApp
            </a>
          </Button>
          <Button variant="ghost" className="mt-2 w-full" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
