// Edge function: analisa hand histories via Lovable AI Gateway (Gemini)
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

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
  actions: Array<{ street: string; player: string; action: string; amount?: number; totalBet?: number; isHero: boolean }>;
  pot: number;
  result: number;
}

const SYSTEM_PROMPT = `Você é um coach de poker GTO especialista em torneios, análise ICM e situações de bubble.
Analise cada mão do histórico fornecido considerando stack sizes, posição na estrutura do torneio, pressão de ICM,
bubble factor, e qualidade das decisões preflop e postflop do herói.

Para cada mão, retorne JSON estritamente válido (sem texto fora do JSON), com a estrutura:
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

Seja objetivo. Não invente mãos que não estejam no input.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const hands: ParsedHandLite[] = body?.hands ?? [];
    if (!Array.isArray(hands) || hands.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhuma mão para analisar' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Limita para evitar prompts gigantes
    const trimmed = hands.slice(0, 30);

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
      const errText = await aiRes.text();
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500;
      const msg =
        aiRes.status === 429
          ? 'Limite de requisições atingido. Tente novamente em instantes.'
          : aiRes.status === 402
            ? 'Créditos de IA esgotados. Adicione créditos no workspace.'
            : `Erro IA: ${errText}`;
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiRes.json();
    const content: string = aiJson?.choices?.[0]?.message?.content ?? '{}';
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { raw: content };
    }

    return new Response(JSON.stringify({ analysis: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
