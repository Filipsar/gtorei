import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Selo dourado de conta PRO, ao lado do nome (menu, ranking e perfil) */
export function SeloPro({ grande = false, className }: { grande?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 font-extrabold leading-none tracking-wide text-amber-950 shadow-sm align-middle',
        grande ? 'px-2 py-1 text-xs' : 'px-1.5 py-0.5 text-[10px]',
        className,
      )}
      title="Conta PRO"
    >
      <Crown className={grande ? 'h-3.5 w-3.5' : 'h-3 w-3'} aria-hidden="true" />
      PRO
    </span>
  );
}
