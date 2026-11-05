// Anúncios do Google AdSense no site (05/11/2026), só para quem não é PRO.
//
// O script está no <head> do index.html (o AdSense verifica o site por ele),
// com os pedidos de anúncio PAUSADOS (pauseAdRequests = 1). Na área logada, o
// componente AnunciosDoSite (no MainLayout) chama definirAnuncios a cada página:
// libera para quem não é PRO fora da mesa de treino e pausa de novo no resto.
// Notícias: HTML do servidor (api/_noticias.ts), com carregador próprio.
// Nunca no app Android (lá é o AdMob). Onde os anúncios entram é decidido pelos
// Anúncios automáticos no painel do AdSense.

export const ADSENSE_CLIENTE = 'ca-pub-7415553208405657';

/** Bloco responsivo ("Teste Responsivo 1"): fim das páginas de consulta da área logada */
export const SLOT_RESPONSIVO = '1479150812';
/** Bloco in-article: dentro das notícias (api/_noticias.ts repete o número) */
export const SLOT_NOTICIAS = '2904125157';
/** Lateral 160x600 ("Lateral anúncios"): à direita da área logada e dos dois lados nas notícias */
export const SLOT_LATERAL = '4504981437';
/** Largura mínima da tela para a lateral não apertar o conteúdo */
export const LARGURA_DA_LATERAL = 1500;

/** Mesa de treino e páginas de entrada: anúncio ali atrapalha. Ficam pausados */
export const ROTAS_SEM_ANUNCIO = ['/', '/treinar', '/duelo', '/trilha', '/auth', '/apoiar', '/pro'];

type FilaDoAdSense = unknown[] & { pauseAdRequests?: number; requestNonPersonalizedAds?: number };

function fila(): FilaDoAdSense {
  const w = window as unknown as { adsbygoogle?: FilaDoAdSense };
  w.adsbygoogle = w.adsbygoogle || ([] as FilaDoAdSense);
  return w.adsbygoogle;
}

/** Sem o script no head (ex.: build antigo em cache), põe uma vez */
function garantirScript() {
  if (document.querySelector('script[src*="adsbygoogle.js"]')) return;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENTE}`;
  document.head.appendChild(s);
}

/** Libera (mostrar = true) ou pausa os pedidos de anúncio */
export function definirAnuncios(mostrar: boolean, personalizado: boolean): void {
  if (typeof document === 'undefined') return;
  const a = fila();
  if (!mostrar) {
    a.pauseAdRequests = 1;
    return;
  }
  // Sem "Permitir" no aviso de privacidade, anúncio não personalizado
  a.requestNonPersonalizedAds = personalizado ? 0 : 1;
  garantirScript();
  a.pauseAdRequests = 0;
}
