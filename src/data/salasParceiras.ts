// Links de indicação do Filipe nas salas (05/11/2026). Só no site: a Play
// Store recusa app que leve a site de aposta com dinheiro real, então nada
// disto aparece dentro do app (ehApp()).
//
// As páginas de notícia (api/_noticias.ts) repetem os dois links, porque a
// pasta api/ não importa de src/. O teste salasParceiras.test.ts confere que
// são iguais.

export const GGPOKER_URL = 'https://signup.ggpass.com?qtag1=RFBR3103784&lang=pt-br&brand-id=GGPCOM';
export const WPT_GLOBAL_URL = 'https://wptglobal.com/poker-download?referralCode=79F94E';

/** Arte da oferta de boas-vindas da WPT Global (enviada pelo Filipe) */
export const WPT_OFERTA_IMG = '/parceiros/wpt-oferta.webp';

/** Link de indicação: o Google pede rel="sponsored" e a pessoa precisa saber */
export const REL_PATROCINADO = 'sponsored noopener noreferrer';

export const AVISO_PARCEIROS =
  'Links de indicação: o GTORei pode receber comissão se você se cadastrar, sem custo para você. Só para maiores de 18 anos. Jogue com responsabilidade.';
