import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EVENTO_SONS, ligarSons, sonsLigados } from '@/lib/sons';
import { cn } from '@/lib/utils';

/** Liga e desliga os sons da mesa (src/lib/sons.ts) */
export function BotaoDeSom({ className }: { className?: string }) {
  const [ligado, setLigado] = useState(sonsLigados);

  useEffect(() => {
    const atualizar = () => setLigado(sonsLigados());
    window.addEventListener(EVENTO_SONS, atualizar);
    return () => window.removeEventListener(EVENTO_SONS, atualizar);
  }, []);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('h-9 w-9 shrink-0', className)}
      aria-pressed={ligado}
      aria-label={ligado ? 'Desligar os sons' : 'Ligar os sons'}
      title={ligado ? 'Desligar os sons' : 'Ligar os sons'}
      onClick={() => ligarSons(!ligado)}
    >
      {ligado ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 text-muted-foreground" />}
    </Button>
  );
}
