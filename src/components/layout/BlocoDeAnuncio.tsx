import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSupporter } from '@/hooks/useSupporter';
import { ehApp } from '@/lib/nativo/plataforma';
import { cn } from '@/lib/utils';
import { ADSENSE_CLIENTE, LARGURA_DA_LATERAL, ROTAS_SEM_ANUNCIO, SLOT_LATERAL, SLOT_RESPONSIVO } from '@/lib/anuncios';

/** Anúncio só fora do app, com login, para quem não é PRO e fora da mesa de treino */
function usePodeMostrarAnuncio(): boolean {
  const { user } = useAuth();
  const { isSupporter, loading } = useSupporter();
  const { pathname } = useLocation();
  return !ehApp() && !!user && !loading && !isSupporter && !ROTAS_SEM_ANUNCIO.includes(pathname);
}

/** Pede o anúncio ao Google uma vez, quando o bloco aparece */
function usePedirAnuncio(mostrar: boolean) {
  const pedido = useRef(false);
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
}

/**
 * Bloco de anúncio responsivo do AdSense ("Teste Responsivo 1"), para o fim das
 * páginas de consulta da área logada. Some se o Google não tiver anúncio para
 * mostrar (CSS .bloco-anuncio em index.css), em vez de deixar um buraco na página.
 */
export function BlocoDeAnuncio({ className }: { className?: string }) {
  const mostrar = usePodeMostrarAnuncio();
  usePedirAnuncio(mostrar);

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

function telaLarga(): boolean {
  try {
    return window.matchMedia(`(min-width: ${LARGURA_DA_LATERAL}px)`).matches;
  } catch {
    return false;
  }
}

/**
 * Lateral 160x600 à direita do conteúdo da área logada (MainLayout), fixa na
 * rolagem. Só em tela de 1500px para cima: abaixo disso apertaria o conteúdo.
 * O anúncio só é pedido com a lateral visível (o Google recusa bloco escondido).
 */
export function LateralDeAnuncio() {
  const [larga, setLarga] = useState(telaLarga);
  useEffect(() => {
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia(`(min-width: ${LARGURA_DA_LATERAL}px)`);
    } catch {
      return;
    }
    const mudou = () => setLarga(mq.matches);
    mq.addEventListener('change', mudou);
    return () => mq.removeEventListener('change', mudou);
  }, []);

  const mostrar = usePodeMostrarAnuncio() && larga;
  usePedirAnuncio(mostrar);

  if (!mostrar) return null;

  return (
    <aside className="bloco-anuncio shrink-0 w-40 mr-4 pt-6" aria-label="Publicidade">
      <div className="sticky top-6">
        <p className="mb-1 text-center text-[11px] uppercase tracking-wider text-muted-foreground">Publicidade</p>
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: 160, height: 600 }}
          data-ad-client={ADSENSE_CLIENTE}
          data-ad-slot={SLOT_LATERAL}
        />
      </div>
    </aside>
  );
}
