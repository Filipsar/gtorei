import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSupporter } from '@/hooks/useSupporter';
import { ehApp } from '@/lib/nativo/plataforma';
import { podePersonalizarAnuncios } from '@/lib/consentimento';
import { carregarAdSense, ROTAS_SEM_ANUNCIO } from '@/lib/anuncios';

/** Carrega o AdSense na área logada do site para quem não é PRO (ver src/lib/anuncios.ts) */
export function AnunciosDoSite() {
  const { user } = useAuth();
  const { isSupporter, loading } = useSupporter();
  const { pathname } = useLocation();

  useEffect(() => {
    if (ehApp() || !user || loading || isSupporter) return;
    if (ROTAS_SEM_ANUNCIO.includes(pathname)) return;
    carregarAdSense(podePersonalizarAnuncios());
  }, [user, loading, isSupporter, pathname]);

  return null;
}
