import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/seo/SEO';
import { supabase } from '@/integrations/supabase/client';
import { esquecerLoginParaApp, linkDeVoltaAoApp, loginEhParaApp } from '@/lib/nativo/loginApp';

/**
 * Fim do login pedido pelo app: devolve a sessão ao app GTORei no celular.
 * Aberta no Chrome, nunca dentro do app. Ver src/lib/nativo/loginApp.ts.
 */
export default function AppReturnPage() {
  const [link, setLink] = useState<string | null>(null);
  const [semPedido, setSemPedido] = useState(false);

  useEffect(() => {
    if (!loginEhParaApp()) {
      setSemPedido(true);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      if (!s) {
        setSemPedido(true);
        return;
      }
      const destino = linkDeVoltaAoApp(s.access_token, s.refresh_token);
      setLink(destino);
      // O pedido acaba aqui: navegar pelo site depois disto não volta para cá
      esquecerLoginParaApp();
      // Tenta abrir sozinho; se o Chrome exigir um toque, o botão está ali
      window.location.href = destino;
    });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <SEO title="Voltar ao app — GTORei" description="Volte ao app GTORei." path="/app/retorno" noindex />
      <div className="max-w-sm text-center">
        <Smartphone className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
        {semPedido ? (
          <>
            <h1 className="mt-4 text-2xl font-bold">Nada para devolver ao app</h1>
            <p className="mt-2 text-muted-foreground">
              Esta página serve para terminar o login do app GTORei no celular.
            </p>
            <Button asChild className="mt-6">
              <Link to="/treinar">Continuar no site</Link>
            </Button>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-2xl font-bold">Login feito</h1>
            <p className="mt-2 text-muted-foreground">Toque para voltar ao app e começar a treinar.</p>
            <Button asChild size="lg" className="mt-6 w-full">
              <a href={link ?? '#'}>Voltar ao app GTORei</a>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
