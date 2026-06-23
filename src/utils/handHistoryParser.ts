// GTORei - Hand History Parser (multi-plataforma)

export type Platform = 'pokerstars' | 'ggpoker' | 'acr' | 'partypoker' | '888poker' | 'winamax' | 'unknown';

export type ParsedAction = {
  street: 'preflop' | 'flop' | 'turn' | 'river';
  player: string;
  action: 'fold' | 'call' | 'raise' | 'check' | 'bet' | 'allin' | 'blind' | 'ante';
  amount?: number;
  totalBet?: number;
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
  result: number;
  isTournament: boolean;
  summary: string;
};

export function detectPlatform(text: string): Platform {
  if (text.includes('PokerStars Hand #') || text.includes('PokerStars Game #')) return 'pokerstars';
  if (text.includes('GGPoker Hand #') || text.includes('Ggpoker') || (text.includes('Game Hand #') && text.includes('NLH'))) return 'ggpoker';
  if (
    (text.includes('***** Hand History') && text.includes('ACR')) ||
    text.includes("America's Cardroom") ||
    text.includes('BlackChip Poker') ||
    text.includes('True Poker') ||
    text.includes('Winning Poker Network')
  ) return 'acr';
  if (text.includes('Party Poker Hand #') || text.includes('PartyPoker Hand #')) return 'partypoker';
  if (text.includes('888poker') || text.includes('***** 888Poker Hand History')) return '888poker';
  if (text.includes('Winamax Poker') || text.includes('Winamax Hand #')) return 'winamax';
  return 'unknown';
}

export function parseHandHistory(text: string): ParsedHand[] {
  const platform = detectPlatform(text);
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
    return parsers[platform](text);
  } catch (e) {
    console.warn(`Erro ao parsear ${platform}:`, e);
    return parseGeneric(text);
  }
}

// ============================================================
// POKERSTARS
// ============================================================
function parsePokerStars(text: string): ParsedHand[] {
  const hands: ParsedHand[] = [];
  const blocks = text.split(/(?=PokerStars (?:Hand|Game) #)/);
  for (const block of blocks) {
    if (!block.trim()) continue;
    try {
      const hand = parsePokerStarsHand(block);
      if (hand) hands.push(hand);
    } catch (e) {
      console.warn('Erro PokerStars:', e);
    }
  }
  return hands;
}

function parsePokerStarsHand(text: string): ParsedHand | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const headerTournament = lines[0]?.match(
    /PokerStars Hand #(\d+): Tournament #(\d+), \$?([\d.+$]+) .* - Level ([IVXLCDM]+) \((\d+)\/(\d+)\) - (.+)/
  );
  const headerCash = lines[0]?.match(
    /PokerStars Hand #(\d+): Hold'em No Limit \(\$?([\d.]+)\/\$?([\d.]+)\) - (.+)/
  );
  if (!headerTournament && !headerCash) return null;
  const isTournament = !!headerTournament;
  const hand: ParsedHand = {
    handId: headerTournament?.[1] || headerCash?.[1] || '',
    platform: 'pokerstars',
    tournamentId: headerTournament?.[2],
    isTournament,
    smallBlind: isTournament ? parseInt(headerTournament![5]) : parseFloat(headerCash![2]) * 100,
    bigBlind: isTournament ? parseInt(headerTournament![6]) : parseFloat(headerCash![3]) * 100,
    level: isTournament ? romanToInt(headerTournament![4]) : undefined,
    date: isTournament ? headerTournament![7] : headerCash![4],
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
  return fillHandFromLines(hand, lines);
}

// ============================================================
// GGPOKER
// ============================================================
function parseGGPoker(text: string): ParsedHand[] {
  const hands: ParsedHand[] = [];
  const blocks = text.split(/(?=Game Hand #|GGPoker Hand #)/);
  for (const block of blocks) {
    if (!block.trim()) continue;
    try {
      const hand = parseGGPokerHand(block);
      if (hand) hands.push(hand);
    } catch (e) {
      console.warn('Erro GGPoker:', e);
    }
  }
  return hands;
}

function parseGGPokerHand(text: string): ParsedHand | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const headerMatch = lines[0]?.match(/(?:Game Hand|GGPoker Hand) #(\w+).*?Blinds?\s+(?:\$)?([\d.]+)\/(?:\$)?([\d.]+)/i);
  const tournamentMatch = lines[0]?.match(/Tournament #(\w+)/i);
  if (!headerMatch) return null;
  const hand: ParsedHand = {
    handId: headerMatch[1],
    platform: 'ggpoker',
    tournamentId: tournamentMatch?.[1],
    isTournament: !!tournamentMatch,
    smallBlind: parseFloat(headerMatch[2]),
    bigBlind: parseFloat(headerMatch[3]),
    date: extractDateFromLines(lines),
    tableName: '',
    maxSeats: 6,
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
  for (const line of lines) {
    if (line.startsWith('Seat ') && line.includes('in chips')) {
      const m = line.match(/Seat (\d+): (.+?) \(\$?([\d,.]+) in chips\)/);
      if (m) {
        hand.players.push({
          seat: parseInt(m[1]),
          name: m[2].trim(),
          chips: parseFloat(m[3].replace(',', '')),
          isHero: m[2].trim() === 'Hero',
        });
      }
    }
    if (line.includes('Card dealt') || line.startsWith('Dealt to')) {
      const m = line.match(/(?:Dealt to |Card dealt to )?(.+?)[\s:].*\[(.+?)\]/);
      if (m) {
        hand.heroName = m[1].trim();
        hand.holeCards = m[2].split(' ');
      }
    }
  }
  return fillHandFromLines(hand, lines);
}

// ============================================================
// ACR
// ============================================================
function parseACR(text: string): ParsedHand[] {
  const hands: ParsedHand[] = [];
  const blocks = text.split(/(?=\*{5} Hand History)/);
  for (const block of blocks) {
    if (!block.trim()) continue;
    try {
      const hand = parseACRHand(block);
      if (hand) hands.push(hand);
    } catch (e) {
      console.warn('Erro ACR:', e);
    }
  }
  return hands;
}

function parseACRHand(text: string): ParsedHand | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const headerMatch = lines[0]?.match(/Hand History for Game (\d+)/);
  const blindsMatch = lines.find((l) => l.includes('Blinds'))?.match(/\((\d+)\/(\d+)\)/);
  const tournamentMatch = lines.find((l) => l.includes('Trny:'))?.match(/Trny:\s*(\w+)/i);
  if (!headerMatch) return null;
  const hand: ParsedHand = {
    handId: headerMatch[1],
    platform: 'acr',
    tournamentId: tournamentMatch?.[1],
    isTournament: !!tournamentMatch,
    smallBlind: blindsMatch ? parseInt(blindsMatch[1]) : 0,
    bigBlind: blindsMatch ? parseInt(blindsMatch[2]) : 0,
    date: extractDateFromLines(lines),
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
  for (const line of lines) {
    if (line.startsWith('Seat ') && line.includes('(')) {
      const m = line.match(/Seat (\d+): (.+?) \(\s*\$?([\d,]+)\s*\)/);
      if (m) {
        hand.players.push({
          seat: parseInt(m[1]),
          name: m[2].trim(),
          chips: parseInt(m[3].replace(',', '')),
          isHero: m[2].trim() === 'Hero',
        });
      }
    }
    if (line.includes('receives card:')) {
      const m = line.match(/(.+?) receives card: \[(.+?)\]/);
      if (m && m[1].trim() === 'Hero') hand.holeCards.push(m[2]);
    }
    if (line.includes('is the button')) {
      const m = line.match(/Seat (\d+) is the button/);
      if (m) hand.buttonSeat = parseInt(m[1]);
    }
  }
  return fillHandFromLines(hand, lines);
}

// ============================================================
// PARTYPOKER
// ============================================================
function parsePartyPoker(text: string): ParsedHand[] {
  const hands: ParsedHand[] = [];
  const blocks = text.split(/(?=Party Poker Hand #|PartyPoker Hand #)/);
  for (const block of blocks) {
    if (!block.trim()) continue;
    try {
      const hand = parsePartyPokerHand(block);
      if (hand) hands.push(hand);
    } catch (e) {
      console.warn('Erro PartyPoker:', e);
    }
  }
  return hands;
}

function parsePartyPokerHand(text: string): ParsedHand | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const headerMatch = lines[0]?.match(/Party\s*Poker Hand #(\d+)/i);
  const blindsMatch = lines.find((l) => l.includes('Blinds are'))?.match(/Blinds are \$?([\d.]+)\/([\d.]+)/);
  const isTournament = lines[0]?.toLowerCase().includes('tournament') ?? false;
  if (!headerMatch) return null;
  const hand: ParsedHand = {
    handId: headerMatch[1],
    platform: 'partypoker',
    isTournament,
    smallBlind: blindsMatch ? parseFloat(blindsMatch[1]) : 0,
    bigBlind: blindsMatch ? parseFloat(blindsMatch[2]) : 0,
    date: extractDateFromLines(lines),
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
  for (const line of lines) {
    if (line.startsWith('Seat ') && line.includes('(')) {
      const m = line.match(/Seat (\d+): (.+?) \(\s*\$?([\d,]+)\s*\)/);
      if (m) {
        hand.players.push({
          seat: parseInt(m[1]),
          name: m[2].trim(),
          chips: parseInt(m[3].replace(',', '')),
          isHero: m[2].trim() === 'Hero',
        });
      }
    }
    if (line.includes('was dealt [')) {
      const m = line.match(/(.+?) was dealt \[(.+?)\]/);
      if (m) {
        hand.heroName = m[1].trim();
        hand.holeCards = m[2].split(' ');
      }
    }
  }
  return fillHandFromLines(hand, lines);
}

// ============================================================
// 888POKER
// ============================================================
function parse888Poker(text: string): ParsedHand[] {
  const hands: ParsedHand[] = [];
  const blocks = text.split(/(?=\*{5} 888Poker Hand History)/);
  for (const block of blocks) {
    if (!block.trim()) continue;
    try {
      const hand = parse888PokerHand(block);
      if (hand) hands.push(hand);
    } catch (e) {
      console.warn('Erro 888Poker:', e);
    }
  }
  return hands;
}

function parse888PokerHand(text: string): ParsedHand | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const headerMatch = text.match(/Hand History for Game (\d+)/);
  const blindsLine = lines.find((l) => l.match(/\d+\/\d+/));
  const blindsMatch = blindsLine?.match(/(\d+)\/(\d+)/);
  if (!headerMatch) return null;
  const hand: ParsedHand = {
    handId: headerMatch[1],
    platform: '888poker',
    isTournament: text.includes('Tournament'),
    smallBlind: blindsMatch ? parseInt(blindsMatch[1]) : 0,
    bigBlind: blindsMatch ? parseInt(blindsMatch[2]) : 0,
    date: extractDateFromLines(lines),
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
  for (const line of lines) {
    if (line.startsWith('Seat ') && line.includes('(')) {
      const m = line.match(/Seat (\d+): (.+?) \(\$?([\d,]+)\)/);
      if (m) {
        hand.players.push({
          seat: parseInt(m[1]),
          name: m[2].trim(),
          chips: parseInt(m[3].replace(',', '')),
          isHero: m[2].trim() === 'Hero',
        });
      }
    }
    if (line.startsWith('Dealt to ')) {
      const m = line.match(/Dealt to (.+?) \[(.+?)\]/);
      if (m) {
        hand.heroName = m[1].trim();
        hand.holeCards = m[2].split(' ');
      }
    }
  }
  return fillHandFromLines(hand, lines);
}

// ============================================================
// WINAMAX
// ============================================================
function parseWinamax(text: string): ParsedHand[] {
  const hands: ParsedHand[] = [];
  const blocks = text.split(/(?=Winamax Poker)/);
  for (const block of blocks) {
    if (!block.trim()) continue;
    try {
      const hand = parseWinamaxHand(block);
      if (hand) hands.push(hand);
    } catch (e) {
      console.warn('Erro Winamax:', e);
    }
  }
  return hands;
}

function parseWinamaxHand(text: string): ParsedHand | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const headerMatch = lines[0]?.match(/HandId: #(\w+)/);
  const blindsMatch =
    lines[0]?.match(/blinds: (\d+)\/(\d+)/i) ||
    lines.find((l) => l.includes('ante'))?.match(/(\d+)\/(\d+)/);
  if (!headerMatch) return null;
  const hand: ParsedHand = {
    handId: headerMatch[1],
    platform: 'winamax',
    isTournament: lines[0]?.toLowerCase().includes('tournament') ?? false,
    smallBlind: blindsMatch ? parseInt(blindsMatch[1]) : 0,
    bigBlind: blindsMatch ? parseInt(blindsMatch[2]) : 0,
    date: extractDateFromLines(lines),
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
  for (const line of lines) {
    if (line.startsWith('Seat ') && line.includes('(')) {
      const m = line.match(/Seat (\d+): (.+?) \((\d+)\)/);
      if (m) {
        hand.players.push({
          seat: parseInt(m[1]),
          name: m[2].trim(),
          chips: parseInt(m[3]),
          isHero: m[2].trim() === 'Hero',
        });
      }
    }
    if (line.startsWith('Dealt to ')) {
      const m = line.match(/Dealt to (.+?) \[(.+?)\]/);
      if (m) {
        hand.heroName = m[1].trim();
        hand.holeCards = m[2].split(' ');
      }
    }
  }
  return fillHandFromLines(hand, lines);
}

// ============================================================
// GENÉRICO
// ============================================================
function parseGeneric(text: string): ParsedHand[] {
  const hands: ParsedHand[] = [];
  const idMatch = text.match(/(?:Hand|Game|History)[\s#]+(\w+)/i);
  const blindsMatch = text.match(/(\d+)\/(\d+)/);
  if (!idMatch) return hands;
  const hand: ParsedHand = {
    handId: idMatch[1],
    platform: 'unknown',
    isTournament: /tournament|torneio|tourney/i.test(text),
    smallBlind: blindsMatch ? parseInt(blindsMatch[1]) : 0,
    bigBlind: blindsMatch ? parseInt(blindsMatch[2]) : 0,
    date: new Date().toISOString(),
    tableName: 'Unknown',
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
    summary: 'Formato desconhecido - análise parcial',
  };
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return [fillHandFromLines(hand, lines) || hand];
}

// ============================================================
// HELPERS
// ============================================================
function fillHandFromLines(hand: ParsedHand, lines: string[]): ParsedHand {
  let currentStreet: 'preflop' | 'flop' | 'turn' | 'river' = 'preflop';
  for (const line of lines) {
    if (line.toLowerCase().startsWith('table')) {
      const m = line.match(/['"]?(.+?)['"]?\s+(\d+)-max/i);
      if (m) {
        hand.tableName = m[1];
        hand.maxSeats = parseInt(m[2]);
      }
      const btnMatch = line.match(/Seat #(\d+) is the button/i);
      if (btnMatch) hand.buttonSeat = parseInt(btnMatch[1]);
    }
    if (/\*{2,3} HOLE CARDS \*{2,3}|--- HOLE CARDS ---/.test(line)) currentStreet = 'preflop';
    if (/\*{2,3} FLOP \*{2,3}|--- FLOP ---/.test(line)) {
      currentStreet = 'flop';
      const m = line.match(/\[([^\]]+)\]/);
      if (m) hand.board.push(...m[1].split(' '));
    }
    if (/\*{2,3} TURN \*{2,3}|--- TURN ---/.test(line)) {
      currentStreet = 'turn';
      const m = line.match(/\[([^\]]+)\]\s+\[([^\]]+)\]/);
      if (m) hand.board.push(m[2].trim());
    }
    if (/\*{2,3} RIVER \*{2,3}|--- RIVER ---/.test(line)) {
      currentStreet = 'river';
      const m = line.match(/\[([^\]]+)\]\s+\[([^\]]+)\]/);
      if (m) hand.board.push(m[2].trim());
    }

    const actionPatterns = [
      /^(.+?): (folds|calls|raises|checks|bets)(?: (\d+))?(?: to (\d+))?/,
      /^(.+?) (folds|calls|raises|checks|bets)(?: \$?(\d+))?(?: to \$?(\d+))?/,
      /^(.+?): (fold|call|raise|check|bet)(?:s)?(?: \$?(\d+))?(?: to \$?(\d+))?/i,
    ];

    for (const pattern of actionPatterns) {
      const m = line.match(pattern);
      if (m && !line.includes('***') && !line.includes('---')) {
        const rawAction = m[2].toLowerCase().replace(/s$/, '');
        const isAllin = line.toLowerCase().includes('all-in') || line.toLowerCase().includes('allin');
        hand.actions.push({
          street: currentStreet,
          player: m[1].trim(),
          action: isAllin ? 'allin' : (rawAction as ParsedAction['action']),
          amount: m[3] ? parseInt(m[3]) : undefined,
          totalBet: m[4] ? parseInt(m[4]) : undefined,
          isHero: m[1].trim() === hand.heroName,
        });
        break;
      }
    }

    const collectMatch = line.match(/(.+?) (?:collected|wins) \$?(\d+)/i);
    if (collectMatch && collectMatch[1].trim() === hand.heroName) {
      hand.result = parseInt(collectMatch[2]);
    }
    const potMatch = line.match(/Total pot \$?(\d+)/i);
    if (potMatch) hand.pot = parseInt(potMatch[1]);
    const rakeMatch = line.match(/Rake \$?([\d.]+)/i);
    if (rakeMatch) hand.rake = parseFloat(rakeMatch[1]);
  }
  return hand;
}

function extractDateFromLines(lines: string[]): string {
  for (const line of lines) {
    const patterns = [
      /(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/,
      /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/,
      /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/,
      /(\w+ \d+, \d{4} \d{2}:\d{2}:\d{2})/,
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
