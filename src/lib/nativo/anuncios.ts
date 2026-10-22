// Anúncios do app grátis (AdMob). Só existe dentro do app Android; no site
// nada disto é carregado, e quem é PRO não vê anúncio nenhum.
//
// Dois formatos, nada além disso:
//   * faixa (banner adaptativo) no rodapé das telas;
//   * tela cheia (intersticial) ao terminar um treino, no máximo uma a cada 3
//     treinos e com 4 minutos de intervalo. Nunca no meio de uma mão.
//
// Os IDs vêm das variáveis VITE_ADMOB_BANNER_ID e VITE_ADMOB_INTERSTICIAL_ID
// (conta AdMob do Filipe). Sem elas, o app usa os IDs de teste públicos do
// Google, que mostram anúncio de exemplo e não geram receita nem risco.

import { podePersonalizarAnuncios } from '@/lib/consentimento';

const TESTE_BANNER = 'ca-app-pub-3940256099942544/6300978111';
const TESTE_INTERSTICIAL = 'ca-app-pub-3940256099942544/1033173712';

const BANNER_ID = import.meta.env.VITE_ADMOB_BANNER_ID as string | undefined;
const INTERSTICIAL_ID = import.meta.env.VITE_ADMOB_INTERSTICIAL_ID as string | undefined;
const EM_TESTE = !BANNER_ID || !INTERSTICIAL_ID;

const TREINOS_ENTRE_INTERSTICIAIS = 3;
const INTERVALO_MINIMO_MS = 4 * 60 * 1000;

let iniciado: Promise<boolean> | null = null;
let bannerVisivel = false;
let treinosDesdeUltimo = 0;
let ultimoIntersticial = 0;

const admob = () => import('@capacitor-community/admob');

/** Inicia o AdMob e pede o consentimento quando a lei exige (UMP do Google) */
function iniciar(): Promise<boolean> {
  if (!iniciado) {
    iniciado = (async () => {
      try {
        const { AdMob, MaxAdContentRating, BannerAdPluginEvents } = await admob();
        await AdMob.initialize({ maxAdContentRating: MaxAdContentRating.Teen });
        const consentimento = await AdMob.requestConsentInfo();
        if (consentimento.isConsentFormAvailable && !consentimento.canRequestAds) {
          await AdMob.showConsentForm();
        }
        // A faixa tem altura variável: a página reserva o espaço exato dela
        await AdMob.addListener(BannerAdPluginEvents.SizeChanged, (tamanho) => {
          document.documentElement.style.setProperty('--altura-anuncio', `${bannerVisivel ? tamanho.height : 0}px`);
        });
        return true;
      } catch (e) {
        console.warn('AdMob não iniciou', e);
        return false;
      }
    })();
  }
  return iniciado;
}

export async function mostrarFaixa(): Promise<void> {
  if (bannerVisivel || !(await iniciar())) return;
  const { AdMob, BannerAdPosition, BannerAdSize } = await admob();
  try {
    bannerVisivel = true;
    await AdMob.showBanner({
      adId: BANNER_ID ?? TESTE_BANNER,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      isTesting: EM_TESTE,
      // Sem consentimento registrado, anúncio não personalizado (src/lib/consentimento.ts)
      npa: !podePersonalizarAnuncios(),
    });
  } catch (e) {
    bannerVisivel = false;
    console.warn('Faixa de anúncio falhou', e);
  }
}

export async function esconderFaixa(): Promise<void> {
  if (!bannerVisivel) return;
  bannerVisivel = false;
  document.documentElement.style.setProperty('--altura-anuncio', '0px');
  try {
    const { AdMob } = await admob();
    await AdMob.removeBanner();
  } catch {
    // já não estava na tela
  }
}

/** Chamar quando um treino termina. Decide sozinho se é hora de mostrar. */
export async function talvezMostrarIntersticial(agora = Date.now()): Promise<void> {
  treinosDesdeUltimo += 1;
  if (treinosDesdeUltimo < TREINOS_ENTRE_INTERSTICIAIS) return;
  if (agora - ultimoIntersticial < INTERVALO_MINIMO_MS) return;
  if (!(await iniciar())) return;
  try {
    const { AdMob } = await admob();
    await AdMob.prepareInterstitial({ adId: INTERSTICIAL_ID ?? TESTE_INTERSTICIAL, isTesting: EM_TESTE, npa: !podePersonalizarAnuncios() });
    await AdMob.showInterstitial();
    treinosDesdeUltimo = 0;
    ultimoIntersticial = agora;
  } catch (e) {
    console.warn('Intersticial falhou', e);
  }
}
