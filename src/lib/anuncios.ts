// Anúncios do Google AdSense no site (05/11/2026), só para quem não é PRO.
//
// Notícias: HTML do servidor (api/_noticias.ts), que carrega o mesmo script.
// Área logada: o componente AnunciosDoSite (no MainLayout) chama
// carregarAdSense depois de saber que a conta não é PRO. Nunca no app Android
// (lá é o AdMob). Onde os anúncios entram é decidido pelos Anúncios automáticos
// no painel do AdSense (formatos e páginas excluídas são configurados lá).

export const ADSENSE_CLIENTE = 'ca-pub-7415553208405657';

/** Mesa de treino: anúncio ali atrapalha a decisão. O script não é carregado a partir destas */
export const ROTAS_SEM_ANUNCIO = ['/', '/treinar', '/duelo', '/trilha', '/auth', '/apoiar', '/pro'];

// O layout remonta a cada página: o script entra uma vez por visita
let carregado = false;

export function carregarAdSense(personalizado: boolean): boolean {
  if (carregado || typeof document === 'undefined') return false;
  carregado = true;
  const w = window as unknown as { adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number } };
  w.adsbygoogle = w.adsbygoogle || [];
  // Sem "Permitir" no aviso de privacidade, anúncio não personalizado
  if (!personalizado) w.adsbygoogle.requestNonPersonalizedAds = 1;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENTE}`;
  document.head.appendChild(s);
  return true;
}
