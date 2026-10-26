// Edge function: analisa hand histories via Lovable AI Gateway (Gemini)
//
// Segurança (05/10/2026): até aqui a função respondia a qualquer chamada, até
// sem token, e cada chamada gasta crédito de IA do projeto. Agora exige
// usuário logado (a chave pública anon não serve), limita quantas análises
// cada um faz por dia (tabela ai_analysis_usage, que já existia sem uso) e
// corta o tamanho do que vai para a IA.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Análises por usuário por dia (dia de Brasília). PRO (apoiador, inclusive
// quem comprou no Google Play) tem mais; admin não tem limite.
const LIMITE_DIARIO = 5;
const LIMITE_PRO = 30;
const MAX_MAOS = 30;
// ~30 mãos parseadas cabem com folga; acima disso é abuso ou lixo
const MAX_BYTES = 300_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface ParsedHandLite {
  handId: string;
  platform: string;
  isTournament: boolean;
  smallBlind: number;
  bigBlind: number;
  level?: number;
  heroName: string;
  holeCards: string[];
  board: string[];
  players: Array<{ seat: number; name: string; chips: number; isHero: boolean }>;
  actions: Array<{ street: string; player: string; action: string; amount?: number; totalBet?: number; allIn?: boolean; isHero: boolean }>;
  pot: number;
  result: number;
  posicaoDoHeroi?: string | null;
  spotsDoHeroi?: string[];
  stackEfetivoBb?: number | null;
}

const SYSTEM_PROMPT = `Você é um coach de poker GTO especialista em torneios, ICM e bubble. Analise as decisões do herói ("Herói") em cada mão recebida.

Como ler cada mão:
- spotsDoHeroi é calculado pelo site direto das ações e é a verdade sobre o spot. Valores possíveis: "Open raise (primeiro a entrar)", "Contra limp", "Vs open raise", "Vs open shove", "Vs 3-bet (depois de abrir)", "Vs 4-bet (depois de dar 3-bet)", "Vs open + 3-bet (sem ter entrado)", "Limp e levou raise". Lista vazia = o herói não tomou decisão no pré-flop (walk).
- posicaoDoHeroi e stackEfetivoBb também vêm calculados; use-os em vez de deduzir.
- actions traz os posts ("blind", "ante") e as ações. Em raise, amount é o aumento e totalBet é o total da aposta na rua ("raises 1000 to 1800" = amount 1000, totalBet 1800). allIn: true marca a ação que pôs o jogador all-in.
- result é o saldo do herói na mão (o que recolheu menos tudo o que pôs, blinds e ante incluídos), na mesma unidade de smallBlind e bigBlind. Divida por bigBlind para falar em bb.

Retorne JSON estritamente válido (sem texto fora do JSON), com a estrutura:
{
  "hands": [
    {
      "handId": "string",
      "verdict": "best" | "correct" | "inaccuracy" | "mistake" | "blunder",
      "summary": "string curta (1-2 frases) descrevendo a decisão do herói",
      "gtoPlay": "string descrevendo a jogada GTO ideal",
      "evDelta": number  // EV ganho (positivo) ou perdido (negativo) em bb
    }
  ],
  "overall": {
    "leaks": ["string", ...],          // principais vazamentos identificados
    "recommendations": ["string", ...], // sugestões específicas de estudo
    "evTotal": number                  // EV total acumulado em bb
  }
}

Regras:
1. Nunca diga que o herói enfrentou um spot que não está em spotsDoHeroi daquela mão. Se nenhuma mão tem "Vs 3-bet", não fale de jogo contra 3-bet; o mesmo vale para 4-bet, shove e limp.
2. overall.leaks e overall.recommendations só podem citar spots presentes em pelo menos uma mão enviada. Em cada leak, diga o spot e em quantas mãos ele apareceu (ex.: "Vs open raise no BB (6 mãos): ...").
3. Com menos de 3 mãos de um spot, não chame de leak: diga que a amostra é pequena.
4. evDelta e evTotal em big blinds.
5. Não invente mãos, cartas, ações ou stacks que não estejam no input. Responda só o JSON.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const key = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!key || !supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('Variáveis faltando', { key: !!key, url: !!supabaseUrl, anon: !!anonKey, service: !!serviceRoleKey });
      return json({ error: 'Serviço indisponível no momento.' }, 500);
    }

    // 1. Quem está pedindo. getClaims valida a assinatura do token; a chave
    // anon também é um JWT válido, por isso o teste é ter um usuário (sub).
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Entre na sua conta para usar a análise.' }, 401);
    const token = authHeader.slice('Bearer '.length);
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    if (claimsError || !userId || claimsData?.claims?.role !== 'authenticated') {
      return json({ error: 'Entre na sua conta para usar a análise.' }, 401);
    }

    // 2. Tamanho do pedido, antes de ler o corpo inteiro
    const tamanho = Number(req.headers.get('Content-Length') ?? '0');
    if (tamanho > MAX_BYTES) return json({ error: `Arquivo grande demais. Envie até ${MAX_MAOS} mãos por vez.` }, 413);
    const bruto = await req.text();
    if (bruto.length > MAX_BYTES) return json({ error: `Arquivo grande demais. Envie até ${MAX_MAOS} mãos por vez.` }, 413);

    let body: { hands?: unknown };
    try {
      body = JSON.parse(bruto);
    } catch {
      return json({ error: 'Pedido inválido.' }, 400);
    }
    const hands = body?.hands as ParsedHandLite[] | undefined;
    if (!Array.isArray(hands) || hands.length === 0) return json({ error: 'Nenhuma mão para analisar' }, 400);

    // 3. Limite diário. Conta e registra com a service role: a tabela não
    // tem política para o usuário, então ninguém apaga o próprio registro.
    const admin = createClient(supabaseUrl, serviceRoleKey);
    let usoId: string | null = null;
    const { data: ehAdmin } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!ehAdmin) {
      // Direto na tabela: is_supporter não tem permissão para a service role
      const { data: ehPro } = await admin.from('supporters').select('user_id').eq('user_id', userId).maybeSingle();
      const limite = ehPro ? LIMITE_PRO : LIMITE_DIARIO;
      const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
      const { count, error: erroConta } = await admin
        .from('ai_analysis_usage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('used_on', hoje);
      if (erroConta) throw erroConta;
      if ((count ?? 0) >= limite) {
        return json({ error: `Você já fez ${limite} análises hoje. O limite renova à meia-noite.` }, 429);
      }
      const { data: uso, error: erroRegistro } = await admin
        .from('ai_analysis_usage')
        .insert({ user_id: userId, used_on: hoje })
        .select('id')
        .single();
      if (erroRegistro) throw erroRegistro;
      usoId = uso.id;
    }
    // Se a IA falhar, a tentativa não conta no limite do dia
    const devolverUso = async () => {
      if (usoId) await admin.from('ai_analysis_usage').delete().eq('id', usoId);
    };

    // Limita para evitar prompts gigantes
    const trimmed = hands.slice(0, MAX_MAOS);

    const userPrompt = `Analise as seguintes ${trimmed.length} mão(s) de poker:\n\n${JSON.stringify(trimmed, null, 2)}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      // O texto de erro do gateway fica só no log: ele pode trazer detalhe
      // interno da conta de IA, que não é para o usuário ver
      console.error('Erro do gateway de IA', aiRes.status, await aiRes.text());
      await devolverUso();
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 502;
      const msg =
        aiRes.status === 429
          ? 'Muitas análises ao mesmo tempo. Tente novamente em instantes.'
          : aiRes.status === 402
            ? 'A análise por IA está temporariamente indisponível.'
            : 'A IA não respondeu. Tente novamente.';
      return json({ error: msg }, status);
    }

    const aiJson = await aiRes.json();
    const content: string = aiJson?.choices?.[0]?.message?.content ?? '{}';
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { raw: content };
    }

    return json({ analysis: parsed });
  } catch (e) {
    console.error('Falha na análise', e);
    return json({ error: 'Não foi possível concluir a análise. Tente novamente.' }, 500);
  }
});
