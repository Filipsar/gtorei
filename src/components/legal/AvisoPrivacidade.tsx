import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ehApp } from '@/lib/nativo/plataforma';
import {
  avisoDePrivacidadePendente,
  EVENTO_ABRIR_PREFERENCIAS,
  lerConsentimento,
  salvarConsentimento,
} from '@/lib/consentimento';

/**
 * Aviso de privacidade e cookies, no rodapé da tela.
 *
 * Pede a escolha sobre anúncio personalizado (app: AdMob; site: AdSense nas
 * notícias, desde 05/11/2026), com "Permitir" e "Não permitir" do mesmo tamanho
 * e cor. Nada fica escolhido sem a pessoa escolher.
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
        <p className="font-medium text-foreground">Anúncios personalizados</p>
        <p className="mt-1 text-muted-foreground">
          {app
            ? 'O app grátis mostra anúncios do Google AdMob. Com sua permissão, eles podem ser personalizados pelo ID de publicidade do aparelho. Sem ela, os anúncios continuam, mas genéricos. O PRO não tem anúncios.'
            : 'O site mostra anúncios do Google AdSense para quem não é PRO (a mesa de treino fica sem). Com sua permissão, eles podem ser personalizados com cookies do Google. Sem ela, os anúncios continuam, mas genéricos.'}{' '}
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
      </div>
    </section>
  );
}
