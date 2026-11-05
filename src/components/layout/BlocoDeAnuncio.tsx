import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSupporter } from '@/hooks/useSupporter';
import { ehApp } from '@/lib/nativo/plataforma';
import { cn } from '@/lib/utils';
import { ADSENSE_CLIENTE, ROTAS_SEM_ANUNCIO, SLOT_RESPONSIVO } from '@/lib/anuncios';

/**
 * Bloco de anúncio responsivo do AdSense ("Teste Responsivo 1"), para o fim das
 * páginas de consulta da área logada. Só para quem não é PRO, nunca no app nem
 * na mesa de treino. Some se o Google não tiver anúncio para mostrar (CSS
 * .bloco-anuncio em index.css), em vez de deixar um buraco na página.
 */
export function BlocoDeAnuncio({ className }: { className?: string }) {
  const { user } = useAuth();
  const { isSupporter, loading } = useSupporter();
  const { pathname } = useLocation();
  const pedido = useRef(false);

  const mostrar = !ehApp() && !!user && !loading && !isSupporter && !ROTAS_SEM_ANUNCIO.includes(pathname);

  useEffect(() => {
    if (!mostrar || pedido.current) return;
    pedido.current = true;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch {
      // bloqueador de anúncio: a página segue sem o bloco
    }
  }, [mostrar]);

  if (!mostrar) return null;

  return (
    <aside className={cn('bloco-anuncio my-8', className)} aria-label="Publicidade">
      <p className="mb-1 text-center text-[11px] uppercase tracking-wider text-muted-foreground">Publicidade</p>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight: 100 }}
        data-ad-client={ADSENSE_CLIENTE}
        data-ad-slot={SLOT_RESPONSIVO}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
