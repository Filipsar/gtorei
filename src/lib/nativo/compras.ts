// Compra do PRO dentro do app (Google Play Billing).
//
// PRO é um produto de compra única ("gtorei_pro", tipo inapp) cadastrado no
// Play Console. Quem compra vira apoiador no banco (tabela supporters), então
// o PRO vale também no site, na mesma conta: tira os anúncios do app e libera
// os modos de apoiador.
//
// Quem libera é o servidor, nunca o celular: o app manda o token da compra
// para a função verify-play-purchase, que confere com o Google, confirma
// (acknowledge) e grava o acesso. Compra não confirmada em 3 dias o Google
// estorna sozinho; por isso, ao abrir o app, compras pendentes são reenviadas.

import { supabase } from '@/integrations/supabase/client';

export const PRODUTO_PRO = 'gtorei_pro';

const compras = () => import('@capgo/native-purchases');

export interface ProdutoPro {
  titulo: string;
  preco: string;
}

export async function carregarProdutoPro(): Promise<ProdutoPro | null> {
  try {
    const { NativePurchases, PURCHASE_TYPE } = await compras();
    const { products } = await NativePurchases.getProducts({
      productIdentifiers: [PRODUTO_PRO],
      productType: PURCHASE_TYPE.INAPP,
    });
    const p = products[0];
    return p ? { titulo: p.title, preco: p.priceString } : null;
  } catch (e) {
    console.warn('Produto PRO indisponível', e);
    return null;
  }
}

async function validarNoServidor(purchaseToken: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('verify-play-purchase', {
    body: { purchaseToken, productId: PRODUTO_PRO },
  });
  if (error) {
    console.warn('Validação da compra falhou', error);
    return false;
  }
  return (data as { pro?: boolean } | null)?.pro === true;
}

/**
 * Abre a compra do Google Play e, se pagar, valida no servidor.
 * O id da conta vai como appAccountToken: o servidor confere que o token da
 * compra é desta conta, e o mesmo pagamento não libera duas contas.
 */
export async function comprarPro(userId: string): Promise<'pro' | 'cancelada' | 'pendente'> {
  const { NativePurchases, PURCHASE_TYPE } = await compras();
  let token: string | undefined;
  try {
    const t = await NativePurchases.purchaseProduct({
      productIdentifier: PRODUTO_PRO,
      productType: PURCHASE_TYPE.INAPP,
      appAccountToken: userId,
      // Quem confirma a compra é o servidor, depois de conferir com o Google
      autoAcknowledgePurchases: false,
    });
    token = t.purchaseToken;
  } catch {
    return 'cancelada';
  }
  if (!token) return 'pendente';
  return (await validarNoServidor(token)) ? 'pro' : 'pendente';
}

/** Reenvia compras do PRO já feitas (troca de celular, falha de rede, reinstalação) */
export async function restaurarPro(): Promise<boolean> {
  try {
    const { NativePurchases, PURCHASE_TYPE } = await compras();
    const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP });
    let pro = false;
    for (const c of purchases) {
      if (c.productIdentifier === PRODUTO_PRO && c.purchaseToken) {
        pro = (await validarNoServidor(c.purchaseToken)) || pro;
      }
    }
    return pro;
  } catch (e) {
    console.warn('Restaurar compras falhou', e);
    return false;
  }
}
