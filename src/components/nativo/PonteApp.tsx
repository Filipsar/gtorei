import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSupporter, EVENTO_PRO_ATUALIZADO } from '@/hooks/useSupporter';
import { ehApp } from '@/lib/nativo/plataforma';
import { lerRetornoDeLogin, loginEhParaApp, marcarLoginParaApp } from '@/lib/nativo/loginApp';

/**
 * Liga o site ao app Android. Não desenha nada.
 *
 * No site: quando o login foi pedido pelo app (/auth?app=1), assim que a conta
 * entra manda para /app/retorno, que devolve a sessão ao app.
 *
 * No app: recebe a sessão de volta, abre direto no treino, mostra a faixa de
 * anúncio para quem não é PRO e reprocessa compras do PRO pendentes.
 */
export function PonteApp() {
  return ehApp() ? <PonteNativa /> : <PonteSite />;
}

function PonteSite() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (location.pathname === '/auth') marcarLoginParaApp(location.search);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (user && loginEhParaApp() && location.pathname !== '/app/retorno') {
      navigate('/app/retorno', { replace: true });
    }
  }, [user, location.pathname, navigate]);

  return null;
}

function PonteNativa() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isSupporter, loading: carregandoPro } = useSupporter();
  const restaurado = useRef(false);

  // Volta do login feito no Chrome: gtorei://login?access_token=…&refresh_token=…
  useEffect(() => {
    let remover: (() => void) | undefined;
    void (async () => {
      const { App } = await import('@capacitor/app');
      const { Browser } = await import('@capacitor/browser');
      const h = await App.addListener('appUrlOpen', async ({ url }) => {
        const sessao = lerRetornoDeLogin(url);
        if (!sessao) return;
        await supabase.auth.setSession(sessao);
        await Browser.close().catch(() => undefined);
        navigate('/treinar', { replace: true });
      });
      remover = () => void h.remove();
    })();
    return () => remover?.();
  }, [navigate]);

  // O app não tem página de apresentação: abre no treino, ou no login
  useEffect(() => {
    if (loading || location.pathname !== '/') return;
    navigate(user ? '/treinar' : '/auth', { replace: true });
  }, [loading, user, location.pathname, navigate]);

  // Compras do PRO pagas mas ainda não confirmadas (rede caiu, troca de celular)
  useEffect(() => {
    if (!user || restaurado.current) return;
    restaurado.current = true;
    void import('@/lib/nativo/compras').then(async ({ restaurarPro }) => {
      if (await restaurarPro()) window.dispatchEvent(new Event(EVENTO_PRO_ATUALIZADO));
    });
  }, [user]);

  // Faixa de anúncio só para quem não é PRO
  useEffect(() => {
    if (carregandoPro) return;
    void import('@/lib/nativo/anuncios').then(({ mostrarFaixa, esconderFaixa }) =>
      isSupporter ? esconderFaixa() : mostrarFaixa(),
    );
  }, [isSupporter, carregandoPro]);

  return null;
}
