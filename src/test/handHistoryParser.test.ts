import { describe, expect, it } from 'vitest';
import { detectPlatform, numero, parseHandHistory } from '@/utils/handHistoryParser';
import { contarSpots, escolherMaosParaAnalise, filtrarPorSpots, lerMaoDoHeroi } from '@/lib/spotsDoHeroi';

// Mãos no formato que cada sala exporta (apelidos trocados)

const GG_TORNEIO = `Poker Hand #TM5012345678: Tournament #212345678, Bounty Hunters Special $10.80 Hold'em No Limit - Level10(400/800(100)) - 2026/10/20 21:30:12
Table '12' 6-max Seat #3 is the button
Seat 1: 4f6a2b1c (24,500 in chips)
Seat 2: 9e8d7c6b (31,200 in chips)
Seat 3: 1a2b3c4d (15,800 in chips)
Seat 4: 5e6f7a8b (12,000 in chips)
Seat 5: Hero (18,200 in chips)
Seat 6: 7c8d9e0f (40,100 in chips)
4f6a2b1c: posts the ante 100
9e8d7c6b: posts the ante 100
1a2b3c4d: posts the ante 100
5e6f7a8b: posts the ante 100
Hero: posts the ante 100
7c8d9e0f: posts the ante 100
5e6f7a8b: posts small blind 400
Hero: posts big blind 800
*** HOLE CARDS ***
Dealt to 4f6a2b1c
Dealt to 9e8d7c6b
Dealt to 1a2b3c4d
Dealt to 5e6f7a8b
Dealt to Hero [Ah Qd]
Dealt to 7c8d9e0f
7c8d9e0f: folds
4f6a2b1c: folds
9e8d7c6b: raises 1,000 to 1,800
1a2b3c4d: folds
5e6f7a8b: folds
Hero: calls 1,000
*** FLOP *** [Qs 7h 2c]
Hero: checks
9e8d7c6b: bets 2,200
Hero: calls 2,200
*** TURN *** [Qs 7h 2c] [9d]
Hero: checks
9e8d7c6b: checks
*** RIVER *** [Qs 7h 2c 9d] [3s]
Hero: bets 4,500
9e8d7c6b: folds
Uncalled bet (4,500) returned to Hero
*** SHOWDOWN ***
Hero collected 9,000 from pot
*** SUMMARY ***
Total pot 9,000 | Rake 0 | Jackpot 0 | Bingo 0 | Fortune 0 | Tax 0
Board [Qs 7h 2c 9d 3s]
Seat 1: 4f6a2b1c folded before Flop
Seat 2: 9e8d7c6b folded on the River
Seat 3: 1a2b3c4d (button) folded before Flop
Seat 4: 5e6f7a8b (small blind) folded before Flop
Seat 5: Hero (big blind) won (9,000)
Seat 6: 7c8d9e0f folded before Flop

Poker Hand #TM5012345679: Tournament #212345678, Bounty Hunters Special $10.80 Hold'em No Limit - Level10(400/800(100)) - 2026/10/20 21:31:40
Table '12' 6-max Seat #4 is the button
Seat 1: 4f6a2b1c (24,400 in chips)
Seat 2: 9e8d7c6b (26,300 in chips)
Seat 3: 1a2b3c4d (15,700 in chips)
Seat 4: 5e6f7a8b (11,500 in chips)
Seat 5: Hero (23,100 in chips)
Seat 6: 7c8d9e0f (40,000 in chips)
4f6a2b1c: posts the ante 100
9e8d7c6b: posts the ante 100
1a2b3c4d: posts the ante 100
5e6f7a8b: posts the ante 100
Hero: posts the ante 100
7c8d9e0f: posts the ante 100
Hero: posts small blind 400
7c8d9e0f: posts big blind 800
*** HOLE CARDS ***
Dealt to Hero [Kc Jc]
4f6a2b1c: folds
9e8d7c6b: folds
1a2b3c4d: folds
5e6f7a8b: folds
Hero: raises 1,200 to 2,000
7c8d9e0f: raises 4,400 to 6,400
Hero: folds
Uncalled bet (4,400) returned to 7c8d9e0f
*** SHOWDOWN ***
7c8d9e0f collected 4,600 from pot
*** SUMMARY ***
Total pot 4,600 | Rake 0 | Jackpot 0 | Bingo 0 | Fortune 0 | Tax 0
Seat 5: Hero (small blind) folded before Flop
Seat 6: 7c8d9e0f (big blind) won (4,600)
`;

const GG_CASH = `Poker Hand #HD9876543: Hold'em No Limit ($0.02/$0.05) - 2026/10/21 10:05:33
Table 'NLHWhite3' 6-max Seat #1 is the button
Seat 1: a1b2c3 ($5.12 in chips)
Seat 2: Hero ($5 in chips)
Seat 3: d4e5f6 ($4.80 in chips)
Seat 5: g7h8i9 ($1.60 in chips)
Seat 6: j1k2l3 ($4.95 in chips)
Hero: posts small blind $0.02
d4e5f6: posts big blind $0.05
*** HOLE CARDS ***
Dealt to Hero [Td Th]
g7h8i9: raises $1.55 to $1.60 and is all-in
j1k2l3: folds
a1b2c3: folds
Hero: calls $1.58
d4e5f6: folds
*** FLOP *** [8c 4h 2s]
*** TURN *** [8c 4h 2s] [Jd]
*** RIVER *** [8c 4h 2s Jd] [5c]
*** SHOWDOWN ***
g7h8i9: shows [Ah Kc] (High card Ace)
Hero: shows [Td Th] (a Pair of Tens)
Hero collected $3.10 from pot
*** SUMMARY ***
Total pot $3.25 | Rake $0.15 | Jackpot $0 | Bingo $0 | Fortune $0 | Tax $0
Board [8c 4h 2s Jd 5c]
`;

const C888_CASH = `#Game No : 1987654321
***** 888poker Hand History for Game 1987654321 *****
$0.01/$0.02 Blinds No Limit Holdem - *** 22 10 2026 21:30:12
Table Oslo 6 Max (Real Money)
Seat 3 is the button
Total number of players : 6
Seat 1: player1 ( $2.13 )
Seat 2: Hero ( $2 )
Seat 3: player3 ( $1.97 )
Seat 4: player4 ( $3.40 )
Seat 5: player5 ( $2.05 )
Seat 6: player6 ( $2.50 )
player4 posts small blind [$0.01]
player5 posts big blind [$0.02]
** Dealing down cards **
Dealt to Hero [ 7d, Ah ]
player6 folds
player1 raises [$0.06]
Hero calls [$0.06]
player3 folds
player4 folds
player5 folds
** Dealing flop ** [ Qc, 8d, 2s ]
player1 bets [$0.08]
Hero folds
** Summary **
player1 collected [ $0.15 ]
player1 did not show his hand
`;

const C888_TORNEIO = `#Game No : 1987654400
***** 888poker Hand History for Game 1987654400 *****
1,000/2,000 Blinds No Limit Holdem - *** 22 10 2026 22:10:05
Tournament #301234567 $10 + $1 - Table #3 9 Max (Real Money)
Seat 5 is the button
Total number of players : 7
Seat 1: player1 ( 41,000 )
Seat 2: player2 ( 18,500 )
Seat 4: Hero ( 62,300 )
Seat 5: player5 ( 25,000 )
Seat 6: player6 ( 30,250 )
Seat 7: player7 ( 22,000 )
Seat 9: player9 ( 55,100 )
player1 posts ante [250]
player2 posts ante [250]
Hero posts ante [250]
player5 posts ante [250]
player6 posts ante [250]
player7 posts ante [250]
player9 posts ante [250]
player6 posts small blind [1,000]
player7 posts big blind [2,000]
** Dealing down cards **
Dealt to Hero [  Ks, Qs ]
player9 folds
player1 folds
player2 folds
Hero raises [4,400]
player5 folds
player6 raises [29,000]
player7 folds
Hero folds
** Summary **
player6 collected [ 12,550 ]
`;

const PS_TORNEIO = `PokerStars Hand #251234567890: Tournament #3812345678, $4.40+$0.60 USD Hold'em No Limit - Level XV (1,000/2,000) - 2026/10/23 20:15:01 BRT [2026/10/23 19:15:01 ET]
Table '3812345678 12' 9-max Seat #2 is the button
Seat 1: VilaoA (45,210 in chips)
Seat 2: VilaoB (38,000 in chips)
Seat 3: MeuNick (52,300 in chips)
Seat 4: VilaoC (21,050 in chips)
VilaoA: posts the ante 250
VilaoB: posts the ante 250
MeuNick: posts the ante 250
VilaoC: posts the ante 250
MeuNick: posts small blind 1,000
VilaoC: posts big blind 2,000
*** HOLE CARDS ***
Dealt to MeuNick [9s 9c]
VilaoA: raises 2,400 to 4,400
VilaoB: folds
MeuNick: raises 9,600 to 14,000
VilaoC: folds
VilaoA: raises 30,960 to 44,960 and is all-in
MeuNick: calls 30,960
*** FLOP *** [Ad 7c 3h]
*** TURN *** [Ad 7c 3h] [Ks]
*** RIVER *** [Ad 7c 3h Ks] [2d]
*** SHOW DOWN ***
VilaoA: shows [Ac Jd] (a pair of Aces)
MeuNick: shows [9s 9c] (a pair of Nines)
VilaoA collected 92,920 from pot
*** SUMMARY ***
Total pot 92,920 | Rake 0
Board [Ad 7c 3h Ks 2d]
Seat 1: VilaoA showed [Ac Jd] and won (92,920) with a pair of Aces
Seat 3: MeuNick (small blind) showed [9s 9c] and lost with a pair of Nines
`;

const WINAMAX = `Winamax Poker - Tournament "Monster Stack" buyIn: 4.50€ + 0.50€ level: 7 - HandId: #1234567-89-1700000000 - Holdem no limit (50/200/400) - 2026/10/23 21:00:00 UTC
Table: 'Monster Stack(123456)#004' 6-max (real money) Seat #1 is the button
Seat 1: VilaoX (12000)
Seat 2: Heroi (9800)
Seat 3: VilaoY (15000)
*** ANTE/BLINDS ***
VilaoX posts ante 50
Heroi posts ante 50
VilaoY posts ante 50
Heroi posts small blind 200
VilaoY posts big blind 400
Dealt to Heroi [Ah 5h]
*** PRE-FLOP ***
VilaoX raises 400 to 800
Heroi folds
VilaoY folds
VilaoX collected 1550 from pot
*** SUMMARY ***
Total pot 1550 | No rake
`;

describe('numero', () => {
  it('lê vírgula de milhar, moeda e decimal', () => {
    expect(numero('1,250')).toBe(1250);
    expect(numero('30,960')).toBe(30960);
    expect(numero('$0.06')).toBe(0.06);
    expect(numero('1,250.50')).toBe(1250.5);
    expect(numero('2,50')).toBe(2.5);
    expect(numero('1.20€')).toBe(1.2);
    expect(numero('R$0.10')).toBe(0.1);
  });
});

describe('detectPlatform', () => {
  it('reconhece o formato atual do GGPoker e do 888poker', () => {
    expect(detectPlatform(GG_TORNEIO)).toBe('ggpoker');
    expect(detectPlatform(GG_CASH)).toBe('ggpoker');
    expect(detectPlatform(C888_CASH)).toBe('888poker');
    expect(detectPlatform(C888_TORNEIO)).toBe('888poker');
    expect(detectPlatform(PS_TORNEIO)).toBe('pokerstars');
    expect(detectPlatform(WINAMAX)).toBe('winamax');
  });
});

describe('GGPoker', () => {
  it('lê torneio com vírgula de milhar e ante no nível', () => {
    const [m1, m2] = parseHandHistory(GG_TORNEIO);
    expect(m1.handId).toBe('TM5012345678');
    expect(m1.isTournament).toBe(true);
    expect(m1.tournamentId).toBe('212345678');
    expect([m1.smallBlind, m1.bigBlind, m1.ante, m1.level]).toEqual([400, 800, 100, 10]);
    expect(m1.buttonSeat).toBe(3);
    expect(m1.players).toHaveLength(6);
    expect(m1.players.find((p) => p.name === '4f6a2b1c')?.chips).toBe(24500);
    expect(m1.heroName).toBe('Hero');
    expect(m1.holeCards).toEqual(['Ah', 'Qd']);
    expect(m1.board).toEqual(['Qs', '7h', '2c', '9d', '3s']);
    expect(m1.pot).toBe(9000);
    const raise = m1.actions.find((a) => a.action === 'raise');
    expect(raise).toMatchObject({ player: '9e8d7c6b', amount: 1000, totalBet: 1800, street: 'preflop' });
    expect(m1.actions.filter((a) => a.isHero && a.street === 'flop').map((a) => a.action)).toEqual(['check', 'call']);
    // Recolheu 9.000 e pôs 100 + 800 + 1.000 + 2.200 (a aposta do river voltou)
    expect(m1.result).toBe(4900);
    expect(m2.result).toBe(-2100);
    expect(m1.players.find((p) => p.isHero)?.name).toBe('Hero');
  });

  it('lê cash com $ e all-in', () => {
    const [m] = parseHandHistory(GG_CASH);
    expect(m.isTournament).toBe(false);
    expect([m.smallBlind, m.bigBlind]).toEqual([0.02, 0.05]);
    expect(m.players.find((p) => p.name === 'a1b2c3')?.chips).toBe(5.12);
    expect(m.actions.find((a) => a.player === 'g7h8i9')).toMatchObject({ action: 'raise', totalBet: 1.6, allIn: true });
    expect(m.pot).toBe(3.25);
    expect(m.rake).toBe(0.15);
    expect(m.result).toBe(1.5);
  });

  it('aceita arquivo do Windows (\\r\\n) com BOM', () => {
    const windows = '﻿' + GG_TORNEIO.replace(/\n/g, '\r\n');
    const maos = parseHandHistory(windows);
    expect(maos).toHaveLength(2);
    expect(maos[0].holeCards).toEqual(['Ah', 'Qd']);
  });
});

describe('888poker', () => {
  it('lê cash: assento com espaços, cartas com vírgula e valores entre colchetes', () => {
    const [m] = parseHandHistory(C888_CASH);
    expect(m.platform).toBe('888poker');
    expect(m.handId).toBe('1987654321');
    expect([m.smallBlind, m.bigBlind]).toEqual([0.01, 0.02]);
    expect(m.tableName).toBe('Oslo');
    expect(m.maxSeats).toBe(6);
    expect(m.buttonSeat).toBe(3);
    expect(m.players).toHaveLength(6);
    expect(m.players.find((p) => p.name === 'player1')?.chips).toBe(2.13);
    expect(m.heroName).toBe('Hero');
    expect(m.holeCards).toEqual(['7d', 'Ah']);
    expect(m.board).toEqual(['Qc', '8d', '2s']);
    expect(m.date).toBe('2026/10/22 21:30:12');
    expect(m.actions.find((a) => a.player === 'player1')).toMatchObject({ action: 'raise', amount: 0.06 });
    expect(m.pot).toBe(0.15);
    expect(m.result).toBe(-0.06);
  });

  it('lê torneio com milhar e ante', () => {
    const [m] = parseHandHistory(C888_TORNEIO);
    expect(m.isTournament).toBe(true);
    expect(m.tournamentId).toBe('301234567');
    expect([m.smallBlind, m.bigBlind, m.ante]).toEqual([1000, 2000, 250]);
    expect(m.maxSeats).toBe(9);
    expect(m.players).toHaveLength(7);
    expect(m.holeCards).toEqual(['Ks', 'Qs']);
    // O 888 não escreve all-in: sai das fichas (250 + 1.000 + 29.000 = 30.250)
    expect(m.actions.find((a) => a.player === 'player6' && a.action === 'raise')?.allIn).toBe(true);
    expect(m.result).toBe(-4650);
  });

  it('lê várias mãos do mesmo arquivo', () => {
    expect(parseHandHistory(C888_CASH + '\n\n' + C888_TORNEIO)).toHaveLength(2);
  });
});

describe('PokerStars e Winamax', () => {
  it('lê nível em romano com vírgula nos blinds', () => {
    const [m] = parseHandHistory(PS_TORNEIO);
    expect([m.level, m.smallBlind, m.bigBlind, m.ante]).toEqual([15, 1000, 2000, 250]);
    expect(m.heroName).toBe('MeuNick');
    expect(m.pot).toBe(92920);
    expect(m.result).toBe(-45210);
    expect(m.actions.find((a) => a.totalBet === 44960)?.allIn).toBe(true);
  });

  it('lê cash do PokerStars com moeda depois dos blinds', () => {
    const cash = PS_TORNEIO.replace(
      /^.*\n/,
      "PokerStars Hand #251234567891: Hold'em No Limit ($0.01/$0.02 USD) - 2026/10/23 20:20:00 BRT [2026/10/23 19:20:00 ET]\n"
    );
    const [m] = parseHandHistory(cash);
    expect(m.isTournament).toBe(false);
    expect([m.smallBlind, m.bigBlind]).toEqual([0.01, 0.02]);
  });

  it('lê o Winamax (ante/sb/bb no cabeçalho, ação sem dois-pontos)', () => {
    const [m] = parseHandHistory(WINAMAX);
    expect([m.ante, m.smallBlind, m.bigBlind]).toEqual([50, 200, 400]);
    expect(m.heroName).toBe('Heroi');
    expect(m.tableName).toBe('Monster Stack(123456)#004');
    expect(m.actions.find((a) => a.player === 'VilaoX' && a.action === 'raise')).toMatchObject({ totalBet: 800 });
    expect(m.result).toBe(-250);
  });
});

describe('spot do herói', () => {
  it('BB que paga open está em vs open raise, nunca vs 3-bet', () => {
    const [m1] = parseHandHistory(GG_TORNEIO);
    const l = lerMaoDoHeroi(m1);
    expect(l.posicao).toBe('BB');
    expect(l.spots).toEqual(['vsOpenRaise']);
    expect(l.stackEfetivoBb).toBe(22.8);
    expect(l.entrouNoPote).toBe(true);
  });

  it('abriu e levou 3-bet: open raise e depois vs 3-bet', () => {
    const [, m2] = parseHandHistory(GG_TORNEIO);
    expect(lerMaoDoHeroi(m2)).toMatchObject({ posicao: 'SB', spots: ['openRaise', 'vs3bet'] });
    const [t888] = parseHandHistory(C888_TORNEIO);
    expect(lerMaoDoHeroi(t888)).toMatchObject({ posicao: 'CO', spots: ['openRaise', 'vs3bet'] });
  });

  it('all-in antes do herói é vs open shove', () => {
    const [m] = parseHandHistory(GG_CASH);
    expect(lerMaoDoHeroi(m)).toMatchObject({ posicao: 'SB', spots: ['vsOpenShove'] });
  });

  it('deu 3-bet e levou 4-bet', () => {
    const [m] = parseHandHistory(PS_TORNEIO);
    expect(lerMaoDoHeroi(m)).toMatchObject({ posicao: 'SB', spots: ['vsOpenRaise', 'vs4bet'] });
  });

  it('posições de uma mesa de 6 contadas a partir do big blind', () => {
    const [c] = parseHandHistory(C888_CASH);
    expect(lerMaoDoHeroi(c)).toMatchObject({ posicao: 'CO', spots: ['vsOpenRaise'] });
  });

  it('conta os spots do arquivo', () => {
    const maos = parseHandHistory(GG_TORNEIO + '\n' + GG_CASH);
    expect(contarSpots(maos)).toEqual([
      { spot: 'openRaise', maos: 1 },
      { spot: 'vsOpenRaise', maos: 1 },
      { spot: 'vsOpenShove', maos: 1 },
      { spot: 'vs3bet', maos: 1 },
    ]);
  });
});

describe('resumo da IA', () => {
  it('tira o leak de vs 3-bet quando nenhuma mão teve 3-bet', () => {
    const leaks = [
      'Precisa melhorar em vs 3-bet',
      'Folda demais diante de uma 3-bet',
      'Defende pouco o BB contra open raise',
      'Frequência de 3-bet baixa contra opens do botão',
    ];
    const { itens, removidos } = filtrarPorSpots(leaks, new Set(['vsOpenRaise']));
    expect(removidos).toBe(2);
    expect(itens).toEqual(['Defende pouco o BB contra open raise', 'Frequência de 3-bet baixa contra opens do botão']);
  });

  it('mantém o leak quando o spot existe', () => {
    const { removidos } = filtrarPorSpots(['Precisa melhorar em vs 3-bet'], new Set(['openRaise', 'vs3bet']));
    expect(removidos).toBe(0);
  });

  it('manda para a IA primeiro as mãos em que o herói decidiu', () => {
    const maos = parseHandHistory(GG_TORNEIO + '\n' + GG_CASH);
    const ids = escolherMaosParaAnalise(maos, 2).map((m) => m.handId);
    // As três entraram no pote; ficam as duas primeiras, na ordem do arquivo
    expect(ids).toEqual(['TM5012345678', 'TM5012345679']);
    // Mão de fold no open vai para o fim da fila
    const soFold = { ...maos[2], handId: 'fold', actions: maos[2].actions.map((a) => (a.isHero ? { ...a, action: 'fold' as const } : a)) };
    expect(escolherMaosParaAnalise([soFold, maos[0]], 1).map((m) => m.handId)).toEqual(['TM5012345678']);
  });
});
