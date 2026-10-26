// GTORei - Hand History Parser (multi-plataforma)
//
// Cada sala tem o seu cabeçalho (id, blinds, torneio, data), lido pela função
// da sala. O corpo da mão é parecido em todas e passa por fillHandFromLines:
// assentos, botão, herói, posts, ações, board, pote e resultado.

export type Platform = 'pokerstars' | 'ggpoker' | 'acr' | 'partypoker' | '888poker' | 'winamax' | 'unknown';

export type ParsedAction = {
  street: 'preflop' | 'flop' | 'turn' | 'river';
  player: string;
  action: 'fold' | 'call' | 'raise' | 'check' | 'bet' | 'allin' | 'blind' | 'ante';
  amount?: number;
  totalBet?: number;
  /** A ação pôs o jogador all-in (call, bet ou raise) */
  allIn?: boolean;
  isHero: boolean;
};

export type ParsedPlayer = {
  seat: number;
  name: string;
  chips: number;
  isHero: boolean;
  finalAction?: string;
  amountWon?: number;
};

export type ParsedHand = {
  handId: string;
  platform: Platform;
  tournamentId?: string;
  buyIn?: number;
  level?: number;
  smallBlind: number;
  bigBlind: number;
  ante?: number;
  date: string;
  tableName: string;
  maxSeats: number;
  buttonSeat: number;
  players: ParsedPlayer[];
  heroName: string;
  holeCards: string[];
  actions: ParsedAction[];
  board: string[];
  pot: number;
  rake: number;
  /** Saldo do herói na mão: o que recolheu menos o que pôs (blinds e ante incluídos) */
  result: number;
  isTournament: boolean;
  summary: string;
};

/**
 * Valor de um hand history: "1,250" (vírgula de milhar), "$0.06", "€2,50" e
 * "1.20€" viram número. Antes só os dígitos do começo contavam e "raises
 * 3,750 to 6,250" virava 3 e 6.
 */
export function numero(bruto: string | undefined): number {
  if (!bruto) return 0;
  let s = bruto.replace(/[^\d.,]/g, '');
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, ''); // 1,250 / 1,250.50
  else if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); // 1.250,50
  else s = s.replace(/[.,]$/, '').replace(',', '.'); // 2,50 / "20000," antes do bounty
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function detectPlatform(text: string): Platform {
  if (/PokerStars (?:Zoom |Home Game )?(?:Hand|Game) #/.test(text)) return 'pokerstars';
  // O GGPoker exporta "Poker Hand #TM123…" (torneio), "#HD…" (cash), "#RC…" (Rush & Cash)
  if (
    /(^|\n)\s*Poker Hand #[A-Z]{1,3}\d+/.test(text) ||
    text.includes('GGPoker Hand #') ||
    text.includes('Ggpoker') ||
    (text.includes('Game Hand #') && text.includes('NLH'))
  ) return 'ggpoker';
  if (/888[\w.]*[^\n]*Hand History for Game/i.test(text) || /(^|\n)\s*#Game No\s*:/.test(text)) return '888poker';
  if (
    (text.includes('***** Hand History') && text.includes('ACR')) ||
    text.includes("America's Cardroom") ||
    text.includes('BlackChip Poker') ||
    text.includes('True Poker') ||
    text.includes('Winning Poker Network')
  ) return 'acr';
  if (text.includes('Party Poker Hand #') || text.includes('PartyPoker Hand #')) return 'partypoker';
  if (text.includes('Winamax Poker') || text.includes('Winamax Hand #')) return 'winamax';
  return 'unknown';
}

export function parseHandHistory(text: string): ParsedHand[] {
  // Arquivo salvo no Windows (\r\n) e com BOM no começo: o mesmo texto
  const limpo = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const platform = detectPlatform(limpo);
  const parsers: Record<Platform, (t: string) => ParsedHand[]> = {
    pokerstars: parsePokerStars,
    ggpoker: parseGGPoker,
    acr: parseACR,
    partypoker: parsePartyPoker,
    '888poker': parse888Poker,
    winamax: parseWinamax,
    unknown: parseGeneric,
  };
  try {
    return parsers[platform](limpo).map(marcarHeroi);
  } catch (e) {
    console.warn(`Erro ao parsear ${platform}:`, e);
    return parseGeneric(limpo).map(marcarHeroi);
  }
}

/** O herói só é conhecido na linha "Dealt to": marca assento e ações depois de tudo lido */
function marcarHeroi(hand: ParsedHand): ParsedHand {
  return {
    ...hand,
    players: hand.players.map((p) => ({ ...p, isHero: p.name === hand.heroName })),
    actions: hand.actions.map((a) => ({ ...a, isHero: a.player === hand.heroName })),
  };
}

/** Corta o arquivo nas linhas que abrem mão e lê cada bloco; bloco que não é mão vira null */
function lerBlocos(text: string, inicio: RegExp, lerMao: (linhas: string[]) => ParsedHand | null, sala: string): ParsedHand[] {
  const hands: ParsedHand[] = [];
  for (const block of text.split(inicio)) {
    if (!block.trim()) continue;
    try {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      const hand = lerMao(lines);
      if (hand) hands.push(hand);
    } catch (e) {
      console.warn(`Erro ${sala}:`, e);
    }
  }
  return hands;
}

function maoVazia(platform: Platform, handId: string): ParsedHand {
  return {
    handId,
    platform,
    isTournament: false,
    smallBlind: 0,
    bigBlind: 0,
    date: '',
    tableName: '',
    maxSeats: 9,
    buttonSeat: 0,
    players: [],
    heroName: 'Hero',
    holeCards: [],
    actions: [],
    board: [],
    pot: 0,
    rake: 0,
    result: 0,
    summary: '',
  };
}

// ============================================================
// POKERSTARS
// ============================================================
function parsePokerStars(text: string): ParsedHand[] {
  return lerBlocos(text, /\n(?=PokerStars (?:Zoom |Home Game )?(?:Hand|Game) #)/, parsePokerStarsHand, 'PokerStars');
}

function parsePokerStarsHand(lines: string[]): ParsedHand | null {
  const header = lines[0] ?? '';
  const id = header.match(/PokerStars (?:Zoom |Home Game )?(?:Hand|Game) #(\d+)/);
  if (!id) return null;
  const hand = maoVazia('pokerstars', id[1]);
  const torneio = header.match(/Tournament #(\d+)/);
  hand.isTournament = !!torneio;
  hand.tournamentId = torneio?.[1];
  const nivel = header.match(/Level ([IVXLCDM]+|\d+)\s*\(([\d.,]+)\/([\d.,]+)\)/);
  // Cash: "($0.01/$0.02 USD)", "(€0.05/€0.10)", "(R$0.05/R$0.10 BRL)"
  const cash = header.match(/\(([^()/]*?\d[\d.,]*)\/([^()/]*?\d[\d.,]*)(?:\s+[A-Z]{3})?\)/);
  if (nivel) {
    hand.level = /^\d+$/.test(nivel[1]) ? parseInt(nivel[1]) : romanToInt(nivel[1]);
    hand.smallBlind = numero(nivel[2]);
    hand.bigBlind = numero(nivel[3]);
  } else if (cash) {
    hand.smallBlind = numero(cash[1]);
    hand.bigBlind = numero(cash[2]);
  }
  hand.date = extractDateFromLines([header]);
  return fillHandFromLines(hand, lines);
}

// ============================================================
// GGPOKER
// ============================================================
// Torneio: Poker Hand #TM5012345678: Tournament #212345678, Bounty Hunters $10.80 Hold'em No Limit - Level10(400/800(100)) - 2024/03/15 21:30:12
// Cash:    Poker Hand #HD1234567: Hold'em No Limit ($0.02/$0.05) - 2024/03/15 21:30:12
function parseGGPoker(text: string): ParsedHand[] {
  return lerBlocos(text, /\n(?=(?:GGPoker |Poker |Game )Hand #)/, parseGGPokerHand, 'GGPoker');
}

function parseGGPokerHand(lines: string[]): ParsedHand | null {
  const header = lines[0] ?? '';
  const id = header.match(/(?:GGPoker |Poker |Game )Hand #(\w+)/);
  if (!id) return null;
  const hand = maoVazia('ggpoker', id[1]);
  hand.maxSeats = 6;
  const torneio = header.match(/Tournament #(\w+)/i);
  hand.isTournament = !!torneio;
  hand.tournamentId = torneio?.[1];
  const nivel = header.match(/Level\s*(\d+)\s*\(([\d.,]+)\/([\d.,]+)(?:\(([\d.,]+)\))?\)/i);
  const cash = header.match(/\(([^()/]*?\d[\d.,]*)\/([^()/]*?\d[\d.,]*)\)/);
  const antigo = header.match(/Blinds?\s+\$?([\d.,]+)\/\$?([\d.,]+)/i);
  if (nivel) {
    hand.level = parseInt(nivel[1]);
    hand.smallBlind = numero(nivel[2]);
    hand.bigBlind = numero(nivel[3]);
    if (nivel[4]) hand.ante = numero(nivel[4]);
  } else if (cash) {
    hand.smallBlind = numero(cash[1]);
    hand.bigBlind = numero(cash[2]);
  } else if (antigo) {
    hand.smallBlind = numero(antigo[1]);
    hand.bigBlind = numero(antigo[2]);
  }
  hand.date = extractDateFromLines([header]);
  return fillHandFromLines(hand, lines);
}

// ============================================================
// ACR
// ============================================================
function parseACR(text: string): ParsedHand[] {
  return lerBlocos(text, /\n(?=\*{5} Hand History)/, parseACRHand, 'ACR');
}

function parseACRHand(lines: string[]): ParsedHand | null {
  const headerMatch = lines[0]?.match(/Hand History for Game (\d+)/);
  if (!headerMatch) return null;
  const hand = maoVazia('acr', headerMatch[1]);
  const blindsMatch = lines.find((l) => l.includes('Blinds'))?.match(/\(\$?([\d.,]+)\/\$?([\d.,]+)\)/);
  const tournamentMatch = lines.find((l) => l.includes('Trny:'))?.match(/Trny:\s*(\w+)/i);
  hand.tournamentId = tournamentMatch?.[1];
  hand.isTournament = !!tournamentMatch;
  hand.smallBlind = numero(blindsMatch?.[1]);
  hand.bigBlind = numero(blindsMatch?.[2]);
  hand.date = extractDateFromLines(lines);
  for (const line of lines) {
    // O ACR antigo dá uma carta por linha
    const m = line.match(/^(.+?) receives card: \[(.+?)\]/);
    if (m) {
      hand.heroName = m[1].trim();
      hand.holeCards.push(m[2].trim());
    }
  }
  return fillHandFromLines(hand, lines);
}

// ============================================================
// PARTYPOKER
// ============================================================
function parsePartyPoker(text: string): ParsedHand[] {
  return lerBlocos(text, /\n(?=Party\s*Poker Hand #)/i, parsePartyPokerHand, 'PartyPoker');
}

function parsePartyPokerHand(lines: string[]): ParsedHand | null {
  const headerMatch = lines[0]?.match(/Party\s*Poker Hand #(\d+)/i);
  if (!headerMatch) return null;
  const hand = maoVazia('partypoker', headerMatch[1]);
  const blindsMatch = lines.find((l) => l.includes('Blinds are'))?.match(/Blinds are \$?([\d.,]+)\/\$?([\d.,]+)/);
  hand.isTournament = lines[0]?.toLowerCase().includes('tournament') ?? false;
  hand.smallBlind = numero(blindsMatch?.[1]);
  hand.bigBlind = numero(blindsMatch?.[2]);
  hand.date = extractDateFromLines(lines);
  for (const line of lines) {
    const m = line.match(/^(.+?) was dealt \[\s*(.+?)\s*\]/);
    if (m) {
      hand.heroName = m[1].trim();
      hand.holeCards = cartas(m[2]);
    }
  }
  return fillHandFromLines(hand, lines);
}

// ============================================================
// 888POKER
// ============================================================
// #Game No : 1234567890
// ***** 888poker Hand History for Game 1234567890 *****
// $0.01/$0.02 Blinds No Limit Holdem - *** 15 03 2024 21:30:12      (torneio: 400/800 Blinds ...)
// Tournament #123456789 $10 + $1 - Table #3 9 Max (Real Money)     (cash: Table Oslo 6 Max (Real Money))
// Seat 3 is the button
// Seat 1: player1 ( $2.13 )
// player4 posts small blind [$0.01]
// ** Dealing down cards **
// Dealt to Hero [ 7d, Ah ]
// player6 raises [$0.06]
// ** Dealing flop ** [ Qc, 8d, 2s ]
// ** Summary **
// player6 collected [ $0.33 ]
function parse888Poker(text: string): ParsedHand[] {
  return lerBlocos(text, /\n(?=#Game No\s*:|\*{5}\s*888)/i, parse888PokerHand, '888poker');
}

function parse888PokerHand(lines: string[]): ParsedHand | null {
  const id = lines.slice(0, 3).join('\n').match(/Hand History for Game (\d+)/i);
  if (!id) return null;
  const hand = maoVazia('888poker', id[1]);
  const blinds = lines.find((l) => /Blinds/i.test(l))?.match(/([^\s/]*\d[\d.,]*)\/([^\s/]*\d[\d.,]*)\s+Blinds/i);
  hand.smallBlind = numero(blinds?.[1]);
  hand.bigBlind = numero(blinds?.[2]);
  const torneio = lines.find((l) => /^Tournament #/i.test(l))?.match(/Tournament #(\d+)/i);
  hand.isTournament = !!torneio;
  hand.tournamentId = torneio?.[1];
  const mesa = lines.find((l) => /Table .+ \d+ Max/i.test(l))?.match(/Table (.+?) (\d+) Max/i);
  if (mesa) {
    hand.tableName = mesa[1];
    hand.maxSeats = parseInt(mesa[2]);
  }
  const data = lines.join('\n').match(/\*\*\* (\d{2}) (\d{2}) (\d{4}) (\d{1,2}:\d{2}:\d{2})/);
  hand.date = data ? `${data[3]}/${data[2]}/${data[1]} ${data[4]}` : extractDateFromLines(lines);
  return fillHandFromLines(hand, lines);
}

// ============================================================
// WINAMAX
// ============================================================
// Winamax Poker - Tournament "WPO" buyIn: 4.50€ + 0.50€ level: 5 - HandId: #123-45-678 - Holdem no limit (25/100/200) - 2024/03/15 21:30:12 UTC
function parseWinamax(text: string): ParsedHand[] {
  return lerBlocos(text, /\n(?=Winamax Poker)/, parseWinamaxHand, 'Winamax');
}

function parseWinamaxHand(lines: string[]): ParsedHand | null {
  const header = lines[0] ?? '';
  const headerMatch = header.match(/HandId: #([\w-]+)/);
  if (!headerMatch) return null;
  const hand = maoVazia('winamax', headerMatch[1]);
  hand.isTournament = header.toLowerCase().includes('tournament');
  // (ante/sb/bb) no torneio, (sb/bb) no cash
  const partes = header.match(/\(([^()]*\d[^()]*\/[^()]*\d[^()]*)\)/)?.[1].split('/') ?? [];
  if (partes.length >= 3) {
    hand.ante = numero(partes[0]);
    hand.smallBlind = numero(partes[1]);
    hand.bigBlind = numero(partes[2]);
  } else if (partes.length === 2) {
    hand.smallBlind = numero(partes[0]);
    hand.bigBlind = numero(partes[1]);
  }
  const nivel = header.match(/level: (\d+)/i);
  if (nivel) hand.level = parseInt(nivel[1]);
  hand.date = extractDateFromLines([header]);
  return fillHandFromLines(hand, lines);
}

// ============================================================
// GENÉRICO
// ============================================================
function parseGeneric(text: string): ParsedHand[] {
  const idMatch = text.match(/(?:Hand|Game|History)[\s#]+(\w+)/i);
  if (!idMatch) return [];
  const hand = maoVazia('unknown', idMatch[1]);
  const blindsMatch = text.match(/([\d.,]+)\/([\d.,]+)/);
  hand.isTournament = /tournament|torneio|tourney/i.test(text);
  hand.smallBlind = numero(blindsMatch?.[1]);
  hand.bigBlind = numero(blindsMatch?.[2]);
  hand.date = new Date().toISOString();
  hand.tableName = 'Unknown';
  hand.summary = 'Formato desconhecido - análise parcial';
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return [fillHandFromLines(hand, lines)];
}

// ============================================================
// CORPO DA MÃO (comum a todas as salas)
// ============================================================

// Valor com moeda dos dois lados: 1,250 · $0.06 · R$0.10 · 1.20€. Sem espaço no
// fim: se ele entrasse no valor, o " to 5,400" de "raises 3,600 to 5,400" sumia.
const VALOR = String.raw`(?:R\$|[$€£])?\s?\d[\d.,]*€?`;
const RE_ACAO = new RegExp(
  String.raw`^(.+?):? (folds|checks|calls|bets|raises)\b(?:\s+\[?\s*(${VALOR})(?:\s*\])?)?(?:\s+to\s+\[?\s*(${VALOR})(?:\s*\])?)?`
);
const RE_POST = new RegExp(
  String.raw`^(.+?):? posts (?:the )?(small & big blinds|small blind|big blind|dead big blind|dead small blind|ante|straddle)\s*\[?\s*(${VALOR})`,
  'i'
);
const RE_ASSENTO = /^Seat (\d+): (.+?) \(\s*([^\s)]*?\d[\d.,]*\s?€?)\s*(?:in chips)?[^)]*\)/;
const RE_DEALT = /^Dealt to (.+?) \[\s*([^\]]+?)\s*\]/;
const RE_RUA = /^(?:\*{2,3}\s*(?:FIRST\s+)?(FLOP|TURN|RIVER)\s*\*{2,3}|\*\*\s*Dealing (flop|turn|river)\s*\*\*|-{2,3}\s*(FLOP|TURN|RIVER)\s*-{2,3})/i;
const RE_CARTAS_DO_HEROI = /HOLE CARDS|Dealing down cards|PRE-?FLOP/i;
const RE_RESUMO = /^\*{2,3}\s*SUMMARY\s*\*{2,3}|^\*\*\s*Summary\s*\*\*/i;
const RE_RECOLHEU = new RegExp(String.raw`^(.+?):? collected \[?\s*\(?\s*(${VALOR})`);
const RE_DEVOLVIDO = new RegExp(String.raw`^Uncalled bet \(\s*(${VALOR})\s*\) returned to (.+)$`);

function cartas(texto: string): string[] {
  return texto.split(/[\s,]+/).filter(Boolean);
}

const arred = (n: number) => Math.round(n * 100) / 100;

function fillHandFromLines(hand: ParsedHand, lines: string[]): ParsedHand {
  let street: ParsedAction['street'] = 'preflop';
  let antesDasCartas = true; // assentos só antes das cartas; no resumo a linha "Seat" é outra
  let noResumo = false;
  const herois: { nome: string; cartas: string[] }[] = [];
  // Fichas na rua atual (zera a cada rua) e no total da mão (para o saldo)
  let naRua: Record<string, number> = {};
  const investido: Record<string, number> = {};
  const recolhido: Record<string, number> = {};
  const assentos = new Set(hand.players.map((p) => p.seat));

  for (const line of lines) {
    if (RE_RESUMO.test(line)) noResumo = true;

    if (!noResumo) {
      const botao = line.match(/Seat #?(\d+) is the button/i);
      if (botao) hand.buttonSeat = parseInt(botao[1]);
      if (/^Table\b/i.test(line)) {
        const max = line.match(/(\d+)[- ]max/i);
        if (max) hand.maxSeats = parseInt(max[1]);
        const nome = line.match(/^Table:?\s*'([^']+)'/i);
        if (nome) hand.tableName = nome[1];
      }
    }

    if (antesDasCartas && RE_CARTAS_DO_HEROI.test(line)) antesDasCartas = false;
    if (antesDasCartas) {
      const s = line.match(RE_ASSENTO);
      if (s && !assentos.has(parseInt(s[1]))) {
        assentos.add(parseInt(s[1]));
        hand.players.push({ seat: parseInt(s[1]), name: s[2].trim(), chips: numero(s[3]), isHero: false });
        continue;
      }
    }

    const dealt = line.match(RE_DEALT);
    if (dealt) {
      herois.push({ nome: dealt[1].trim(), cartas: cartas(dealt[2]) });
      continue;
    }

    const rua = line.match(RE_RUA);
    if (rua && !noResumo) {
      antesDasCartas = false;
      street = (rua[1] || rua[2] || rua[3]).toLowerCase() as ParsedAction['street'];
      naRua = {};
      // Turn e river repetem o board antes: a carta nova é o último colchete
      const grupos = [...line.matchAll(/\[([^\]]+)\]/g)];
      const ultimo = grupos[grupos.length - 1];
      if (ultimo) hand.board.push(...cartas(ultimo[1]));
      continue;
    }

    const recolheu = line.match(RE_RECOLHEU);
    if (recolheu && !line.startsWith('Seat ')) {
      const nome = recolheu[1].trim();
      recolhido[nome] = (recolhido[nome] ?? 0) + numero(recolheu[2]);
      continue;
    }

    const pote = line.match(/^Total pot\s+([^\s|]+)/i);
    if (pote) hand.pot = numero(pote[1]);
    const rake = line.match(/\bRake\s+([^\s|]+)/i);
    if (rake) hand.rake = numero(rake[1]);
    if (noResumo) continue;

    const devolvido = line.match(RE_DEVOLVIDO);
    if (devolvido) {
      const nome = devolvido[2].trim();
      investido[nome] = (investido[nome] ?? 0) - numero(devolvido[1]);
      continue;
    }

    const post = line.match(RE_POST);
    if (post) {
      const nome = post[1].trim();
      const valor = numero(post[3]);
      const tipo = post[2].toLowerCase();
      investido[nome] = (investido[nome] ?? 0) + valor;
      if (tipo === 'ante') {
        if (!hand.ante) hand.ante = valor;
        hand.actions.push({ street: 'preflop', player: nome, action: 'ante', amount: valor, isHero: false });
      } else {
        naRua[nome] = (naRua[nome] ?? 0) + valor;
        hand.actions.push({ street: 'preflop', player: nome, action: 'blind', amount: valor, isHero: false });
      }
      continue;
    }

    const acao = line.match(RE_ACAO);
    if (acao) {
      const nome = acao[1].trim();
      const tipo = acao[2].toLowerCase().replace(/s$/, '') as ParsedAction['action'];
      const valor = acao[3] ? numero(acao[3]) : undefined;
      const total = acao[4] ? numero(acao[4]) : undefined;
      const antes = naRua[nome] ?? 0;
      // "raises 3,600 to 5,400" traz o total; o 888 só dá o que entrou agora
      let poe = 0;
      if (tipo === 'raise') poe = total !== undefined ? total - antes : valor ?? 0;
      else if (tipo === 'call' || tipo === 'bet') poe = valor ?? 0;
      naRua[nome] = antes + poe;
      investido[nome] = (investido[nome] ?? 0) + poe;
      const fichas = hand.players.find((p) => p.name === nome)?.chips ?? 0;
      const allIn = /all-in|all in|allin/i.test(line) || (poe > 0 && fichas > 0 && investido[nome] >= fichas - 1e-9);
      hand.actions.push({
        street,
        player: nome,
        action: tipo,
        amount: valor,
        totalBet: total,
        ...(allIn ? { allIn: true } : {}),
        isHero: false,
      });
    }
  }

  // Herói: quem recebeu cartas. Se mais de um aparece com cartas, vale o "Hero" do GG
  const comCartas = herois.filter((h) => h.cartas.length > 0);
  const heroi = comCartas.find((h) => h.nome === 'Hero') ?? comCartas[0];
  if (heroi) {
    hand.heroName = heroi.nome;
    hand.holeCards = heroi.cartas;
  }

  if (!hand.pot) hand.pot = arred(Object.values(recolhido).reduce((a, b) => a + b, 0));
  if (Object.keys(investido).length > 0 || Object.keys(recolhido).length > 0) {
    hand.result = arred((recolhido[hand.heroName] ?? 0) - (investido[hand.heroName] ?? 0));
  }
  if (!hand.date) hand.date = extractDateFromLines(lines);
  return hand;
}

function extractDateFromLines(lines: string[]): string {
  for (const line of lines) {
    const patterns = [
      /(\d{4}\/\d{2}\/\d{2}\s+\d{1,2}:\d{2}:\d{2})/,
      /(\d{2}\/\d{2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2})/,
      /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/,
      /(\w+ \d+, \d{4} \d{1,2}:\d{2}:\d{2})/,
    ];
    for (const pattern of patterns) {
      const m = line.match(pattern);
      if (m) return m[1];
    }
  }
  return new Date().toISOString();
}

function romanToInt(roman: string): number {
  const values: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let result = 0;
  for (let i = 0; i < roman.length; i++) {
    const curr = values[roman[i]];
    const next = values[roman[i + 1]];
    result += curr < next ? -curr : curr;
  }
  return result;
}

export const PLATFORM_INFO: Record<Platform, { name: string; logo: string; color: string }> = {
  pokerstars: { name: 'PokerStars', logo: '♠', color: '#E62222' },
  ggpoker: { name: 'GGPoker', logo: '🐼', color: '#F5A623' },
  acr: { name: 'ACR / WPN', logo: '🦅', color: '#1E3A8A' },
  partypoker: { name: 'PartyPoker', logo: '🎉', color: '#7B2FBE' },
  '888poker': { name: '888Poker', logo: '8️⃣', color: '#F97316' },
  winamax: { name: 'Winamax', logo: '🎰', color: '#EF4444' },
  unknown: { name: 'Plataforma Desconhecida', logo: '🃏', color: '#64748B' },
};
