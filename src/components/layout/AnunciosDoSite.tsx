import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSupporter } from '@/hooks/useSupporter';
import { ehApp } from '@/lib/nativo/plataforma';
import { podePersonalizarAnuncios } from '@/lib/consentimento';
import { definirAnuncios, ROTAS_SEM_ANUNCIO } from '@/lib/anuncios';

/** Libera o AdSense na área logada do site para quem não é PRO; pausa no resto (ver src/lib/anuncios.ts) */
export function AnunciosDoSite() {
  const { user } = useAuth();
  const { isSupporter, loading } = useSupporter();
  const { pathname } = useLocation();

  useEffect(() => {
    if (ehApp()) return;
    // Enquanto não sabe se é PRO, fica pausado (o head já começa assim)
    const mostrar = !!user && !loading && !isSupporter && !ROTAS_SEM_ANUNCIO.includes(pathname);
    definirAnuncios(mostrar, podePersonalizarAnuncios());
  }, [user, loading, isSupporter, pathname]);

  return null;
}
