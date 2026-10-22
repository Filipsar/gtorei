// Edge function: confere a compra do PRO no Google Play e libera a conta.
//
// O app manda o token da compra; esta função pergunta ao Google se o
// pagamento existe e é desta conta, confirma a compra (sem confirmação em 3
// dias o Google estorna) e põe a conta em supporters, que é o que o site e o
// app leem para tirar anúncios e liberar os modos.
//
// Precisa de dois segredos no projeto (Lovable / Supabase), nunca no repo:
//   GOOGLE_PLAY_SERVICE_ACCOUNT  JSON da conta de serviço com acesso ao app no
//                                Play Console (permissão "Ver dados financeiros"
//                                e "Gerenciar pedidos")
//   SUPABASE_SERVICE_ROLE_KEY    já existe no projeto
//
// Depende da migration 20261021130000_pro_google_play (tabela play_purchases).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const PACOTE = 'br.com.gtorei.app';
const PRODUTOS = new Set(['gtorei_pro']);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// ---------- Token de acesso do Google (conta de serviço, JWT RS256) ----------

const b64url = (dados: Uint8Array | string) => {
  const bytes = typeof dados === 'string' ? new TextEncoder().encode(dados) : dados;
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function tokenDoGoogle(conta: { client_email: string; private_key: string }): Promise<string> {
  const pem = conta.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const chave = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const corpo = b64url(
    JSON.stringify({
      iss: conta.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: agora,
      exp: agora + 3600,
    }),
  );
  const assinatura = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', chave, new TextEncoder().encode(`${cabecalho}.${corpo}`)),
  );
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${cabecalho}.${corpo}.${b64url(assinatura)}`,
    }),
  });
  if (!r.ok) throw new Error(`token do Google: ${r.status} ${await r.text()}`);
  return (await r.json()).access_token as string;
}

// Campos que usamos da resposta purchases.products.get
interface CompraGoogle {
  purchaseState?: number; // 0 comprado, 1 cancelado, 2 pendente
  acknowledgementState?: number; // 0 não confirmada, 1 confirmada
  obfuscatedExternalAccountId?: string;
  orderId?: string;
  purchaseType?: number; // 0 = compra de teste (testador de licença)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const contaJson = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT');
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !contaJson) {
      console.error('Variáveis faltando', {
        url: !!supabaseUrl, anon: !!anonKey, service: !!serviceRoleKey, google: !!contaJson,
      });
      return json({ error: 'Serviço indisponível no momento.' }, 500);
    }

    // 1. Quem está pedindo (usuário logado; a chave anon não serve)
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Entre na sua conta.' }, 401);
    const supabaseUser = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: claimsError } = await supabaseUser.auth.getClaims(authHeader.slice(7));
    const userId = claims?.claims?.sub;
    if (claimsError || !userId || claims?.claims?.role !== 'authenticated') {
      return json({ error: 'Entre na sua conta.' }, 401);
    }

    // 2. O pedido
    let corpo: { purchaseToken?: unknown; productId?: unknown };
    try {
      corpo = await req.json();
    } catch {
      return json({ error: 'Pedido inválido.' }, 400);
    }
    const token = typeof corpo.purchaseToken === 'string' ? corpo.purchaseToken : '';
    const produto = typeof corpo.productId === 'string' ? corpo.productId : '';
    if (!token || token.length > 4096 || !PRODUTOS.has(produto)) return json({ error: 'Pedido inválido.' }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // 3. Token já usado por outra conta: um pagamento libera uma conta só
    const { data: jaVisto } = await admin
      .from('play_purchases')
      .select('user_id')
      .eq('purchase_token', token)
      .maybeSingle();
    if (jaVisto && jaVisto.user_id !== userId) {
      return json({ pro: false, motivo: 'compra_de_outra_conta' }, 409);
    }

    // 4. Pergunta ao Google
    const acesso = await tokenDoGoogle(JSON.parse(contaJson));
    const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACOTE}/purchases/products/${encodeURIComponent(produto)}/tokens/${encodeURIComponent(token)}`;
    const r = await fetch(base, { headers: { Authorization: `Bearer ${acesso}` } });
    if (r.status === 404 || r.status === 400) return json({ pro: false, motivo: 'compra_nao_encontrada' }, 404);
    if (!r.ok) throw new Error(`Play: ${r.status} ${await r.text()}`);
    const compra = (await r.json()) as CompraGoogle;

    if (compra.purchaseState === 2) return json({ pro: false, motivo: 'pagamento_pendente' });
    if (compra.purchaseState !== 0) return json({ pro: false, motivo: 'compra_cancelada' });
    // O app manda o id da conta na compra (appAccountToken). Conferir aqui
    // impede que um token comprado por uma conta seja usado em outra.
    if (compra.obfuscatedExternalAccountId !== userId) {
      return json({ pro: false, motivo: 'compra_de_outra_conta' }, 409);
    }

    // 5. Grava e libera
    const teste = compra.purchaseType === 0;
    const { error: erroCompra } = await admin.from('play_purchases').upsert({
      purchase_token: token,
      user_id: userId,
      product_id: produto,
      order_id: compra.orderId ?? null,
      estado: teste ? 'teste' : 'comprado',
    });
    if (erroCompra) throw erroCompra;

    const { error: erroApoio } = await admin
      .from('supporters')
      .upsert(
        { user_id: userId, note: teste ? 'PRO Google Play (compra de teste)' : `PRO Google Play ${compra.orderId ?? ''}`.trim() },
        { onConflict: 'user_id', ignoreDuplicates: true },
      );
    if (erroApoio) throw erroApoio;

    // 6. Confirma a compra no Google (senão ela é estornada em 3 dias)
    if (compra.acknowledgementState === 0) {
      const ack = await fetch(`${base}:acknowledge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${acesso}`, 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!ack.ok) console.error('Acknowledge falhou', ack.status, await ack.text());
    }

    return json({ pro: true });
  } catch (e) {
    console.error('verify-play-purchase falhou', e);
    return json({ error: 'Não foi possível conferir a compra agora.' }, 500);
  }
});
