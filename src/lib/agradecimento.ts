// Pop-up de agradecimento às doações (04/11/2026): uma vez por conta, no site.
// Quem doou já está com o PRO liberado; quem doou e não vê o PRO fala com o
// Filipe no WhatsApp. Segue as regras dos outros pop-ups (ver avisoDoDiscord.ts).

export const WHATSAPP_URL = 'https://wa.me/5511988756938';

/** Link do WhatsApp com a mensagem já escrita (sem dado pessoal na URL) */
export const whatsappSemPro = () =>
  `${WHATSAPP_URL}?text=${encodeURIComponent('Olá! Fiz uma doação para o GTORei e o PRO não foi liberado na minha conta.')}`;

const chave = (userId: string) => `gtorei_obrigado_doacoes_${userId}`;

/** Sem storage o aviso não aparece: melhor que aparecer a cada página */
export function agradecimentoPendente(userId: string): boolean {
  try {
    return localStorage.getItem(chave(userId)) !== '1';
  } catch {
    return false;
  }
}

export function marcarAgradecimentoVisto(userId: string) {
  try {
    localStorage.setItem(chave(userId), '1');
  } catch {
    // sem storage, agradecimentoPendente já devolve false
  }
}
