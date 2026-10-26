import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ehApp } from '@/lib/nativo/plataforma';
import {
  avisoDePrivacidadePendente,
  CHAVE_AVISO_DO_SITE_VISTO,
  EVENTO_ABRIR_PREFERENCIAS,
  lerConsentimento,
  salvarConsentimento,
} from '@/lib/consentimento';

/**
 * Aviso de privacidade e cookies, no rodapé da tela.
 *
 * Site: só informa (não há cookie opcional para consentir) e some ao fechar.
 * App: pede a escolha sobre anúncio personalizado, com "Permitir" e "Não
 * permitir" do mesmo tamanho e cor. Nada fica escolhido sem a pessoa escolher.
 * Reabre por "Preferências de privacidade" (rodapé, configurações, política).
 */
export function AvisoPrivacidade() {
  const app = ehApp();
  const [aberto, setAberto] = useState(() => avisoDePrivacidadePendente(app));

  useEffect(() => {
    const abrir = () => setAberto(true);
    window.addEventListener(EVENTO_ABRIR_PREFERENCIAS, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_PREFERENCIAS, abrir);
  }, []);

  if (!aberto) return null;

  const fecharSite = () => {
    try {
      localStorage.setItem(CHAVE_AVISO_DO_SITE_VISTO, '1');
    } catch {
      // volta a aparecer na próxima visita
    }
    setAberto(false);
  };

  const escolher = (permitir: boolean) => {
    salvarConsentimento(permitir);
    setAberto(false);
  };

  const atual = lerConsentimento();

  return (
    <section
      role="region"
      aria-label="Privacidade e cookies"
      className="fixed inset-x-0 z-[60] p-3 sm:p-4"
      // No app, acima das abas e da faixa de anúncio
      style={{ bottom: 'calc(var(--altura-anuncio, 0px) + var(--altura-abas, 0px))' }}
    >
      <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-4 text-sm shadow-xl">
        {app ? (
          <>
            <p className="font-medium text-foreground">Anúncios personalizados</p>
            <p className="mt-1 text-muted-foreground">
              O app grátis mostra anúncios do Google AdMob. Com sua permissão, eles podem ser personalizados pelo ID de
              publicidade do aparelho. Sem ela, os anúncios continuam, mas genéricos. O PRO não tem anúncios.{' '}
              <Link to="/cookies" className="text-primary underline">Saiba mais</Link>.
            </p>
            {atual && (
              <p className="mt-1 text-xs text-muted-foreground">
                Escolha atual: {atual.anunciosPersonalizados ? 'permitidos' : 'não permitidos'}.
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => escolher(false)}>Não permitir</Button>
              <Button variant="outline" onClick={() => escolher(true)}>Permitir</Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="flex-1 text-muted-foreground">
              O GTORei guarda no navegador só o necessário para funcionar (login e preferências). Não usamos cookies de
              rastreamento ou publicidade.{' '}
              <Link to="/cookies" className="text-primary underline">Política de cookies</Link> ·{' '}
              <Link to="/privacidade" className="text-primary underline">Privacidade</Link>
            </p>
            <Button variant="outline" onClick={fecharSite} className="shrink-0">Entendi</Button>
          </div>
        )}
      </div>
    </section>
  );
}
