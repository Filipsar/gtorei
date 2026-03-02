import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Hand, LayoutGrid, Droplets, Sun, Rainbow } from 'lucide-react';

type Suit = 's' | 'h' | 'd' | 'c';
type Rank = 'A' | 'K' | 'Q' | 'J' | 'T' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';

export interface SelectedCard {
  rank: Rank;
  suit: Suit;
}

interface CardSelectorProps {
  heroCards: SelectedCard[];
  boardCards: SelectedCard[];
  onHeroCardsChange: (cards: SelectedCard[]) => void;
  onBoardCardsChange: (cards: SelectedCard[]) => void;
  onClear: () => void;
}

const RANKS: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUITS: { suit: Suit; symbol: string; color: string; bg: string }[] = [
  { suit: 's', symbol: '♠', color: 'text-slate-900 dark:text-slate-100', bg: 'bg-white dark:bg-slate-100' },
  { suit: 'h', symbol: '♥', color: 'text-red-500', bg: 'bg-white dark:bg-slate-100' },
  { suit: 'd', symbol: '♦', color: 'text-blue-500', bg: 'bg-white dark:bg-slate-100' },
  { suit: 'c', symbol: '♣', color: 'text-green-600 dark:text-green-500', bg: 'bg-white dark:bg-slate-100' },
];

type SlotType = 'hero' | 'board';

function isCardEqual(a: SelectedCard, b: SelectedCard) {
  return a.rank === b.rank && a.suit === b.suit;
}

function getHandName(cards: SelectedCard[]): string | null {
  if (cards.length !== 2) return null;
  const [c1, c2] = cards;
  const r1Idx = RANKS.indexOf(c1.rank);
  const r2Idx = RANKS.indexOf(c2.rank);
  const highRank = r1Idx <= r2Idx ? c1.rank : c2.rank;
  const lowRank = r1Idx <= r2Idx ? c2.rank : c1.rank;

  if (c1.rank === c2.rank) return `${c1.rank}${c2.rank}`;
  const suited = c1.suit === c2.suit;
  return `${highRank}${lowRank}${suited ? 's' : 'o'}`;
}

export function CardSelector({ heroCards, boardCards, onHeroCardsChange, onBoardCardsChange, onClear }: CardSelectorProps) {
  const [activeSlot, setActiveSlot] = useState<{ type: SlotType; index: number }>({ type: 'hero', index: 0 });

  const allSelected = [...heroCards, ...boardCards];

  const isUsed = useCallback((rank: Rank, suit: Suit) => {
    return allSelected.some(c => c.rank === rank && c.suit === suit);
  }, [allSelected]);

  const handleCardClick = useCallback((rank: Rank, suit: Suit) => {
    if (isUsed(rank, suit)) return;

    const card: SelectedCard = { rank, suit };

    if (activeSlot.type === 'hero') {
      const newCards = [...heroCards];
      if (activeSlot.index < 2) {
        newCards[activeSlot.index] = card;
        onHeroCardsChange(newCards);
        // Auto-advance
        if (activeSlot.index === 0) {
          setActiveSlot(newCards.length >= 2 ? { type: 'board', index: boardCards.length } : { type: 'hero', index: 1 });
        } else {
          setActiveSlot({ type: 'board', index: boardCards.length });
        }
      }
    } else {
      if (boardCards.length < 5) {
        const newCards = [...boardCards, card];
        onBoardCardsChange(newCards);
        if (newCards.length < 5) {
          setActiveSlot({ type: 'board', index: newCards.length });
        }
      }
    }
  }, [activeSlot, heroCards, boardCards, onHeroCardsChange, onBoardCardsChange, isUsed]);

  const removeHeroCard = (index: number) => {
    const newCards = heroCards.filter((_, i) => i !== index);
    onHeroCardsChange(newCards);
    setActiveSlot({ type: 'hero', index: Math.min(index, newCards.length) });
  };

  const removeBoardCard = (index: number) => {
    const newCards = boardCards.filter((_, i) => i !== index);
    onBoardCardsChange(newCards);
    setActiveSlot({ type: 'board', index: Math.min(index, newCards.length) });
  };

  const handName = getHandName(heroCards);

  // Board texture analysis
  const boardTexture = useMemo(() => {
    if (boardCards.length < 3) return null;

    const flopCards = boardCards.slice(0, 3);
    const allBoardCards = boardCards;
    const suits = allBoardCards.map(c => c.suit);
    const flopSuits = flopCards.map(c => c.suit);
    const uniqueFlopSuits = new Set(flopSuits).size;
    const uniqueSuits = new Set(suits).size;

    // Suit texture
    let suitTexture: 'monotone' | 'two-tone' | 'rainbow';
    if (uniqueFlopSuits === 1) suitTexture = 'monotone';
    else if (uniqueFlopSuits === 2) suitTexture = 'two-tone';
    else suitTexture = 'rainbow';

    // Flush draw possibility
    const suitCounts: Record<string, number> = {};
    suits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1; });
    const maxSuitCount = Math.max(...Object.values(suitCounts));
    const flushComplete = maxSuitCount >= 5;
    const flushDraw = maxSuitCount >= 4 && !flushComplete;
    const backdoorFlush = maxSuitCount === 3 && allBoardCards.length === 3;

    // Connectedness / straight potential
    const rankValues = allBoardCards.map(c => {
      const idx = RANKS.indexOf(c.rank);
      return 12 - idx; // A=12, K=11, ..., 2=0
    }).sort((a, b) => a - b);

    const gaps = [];
    for (let i = 1; i < rankValues.length; i++) {
      gaps.push(rankValues[i] - rankValues[i - 1]);
    }
    const maxGap = gaps.length > 0 ? Math.max(...gaps) : 0;
    const spread = rankValues.length > 0 ? rankValues[rankValues.length - 1] - rankValues[0] : 0;

    let connectivity: 'connected' | 'semi-connected' | 'disconnected';
    if (spread <= 4 && maxGap <= 2) connectivity = 'connected';
    else if (spread <= 7 && maxGap <= 3) connectivity = 'semi-connected';
    else connectivity = 'disconnected';

    // Pairing
    const rankCounts: Record<string, number> = {};
    allBoardCards.forEach(c => { rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1; });
    const paired = Object.values(rankCounts).some(v => v >= 2);
    const trips = Object.values(rankCounts).some(v => v >= 3);

    // High cards
    const highCards = allBoardCards.filter(c => ['A', 'K', 'Q'].includes(c.rank)).length;
    let highness: 'high' | 'medium' | 'low';
    if (highCards >= 2) highness = 'high';
    else if (highCards === 1) highness = 'medium';
    else highness = 'low';

    return {
      suitTexture,
      connectivity,
      paired,
      trips,
      highness,
      flushDraw,
      flushComplete,
      backdoorFlush,
    };
  }, [boardCards]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-heading-xs flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Cartas da Simulação
          </CardTitle>
          {allSelected.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClear} className="h-7 text-xs text-muted-foreground">
              <X className="h-3 w-3 mr-1" /> Limpar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Hero cards */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Hand className="h-3.5 w-3.5" /> Mão do Herói
            {handName && (
              <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">
                {handName}
              </span>
            )}
          </label>
          <div className="flex gap-2">
            {[0, 1].map((idx) => {
              const card = heroCards[idx];
              const isActive = activeSlot.type === 'hero' && activeSlot.index === idx;
              return (
                <button
                  key={`hero-${idx}`}
                  onClick={() => setActiveSlot({ type: 'hero', index: idx })}
                  className={cn(
                    'w-12 h-16 rounded-lg border-2 flex flex-col items-center justify-center text-sm font-bold transition-all',
                    isActive ? 'border-primary bg-primary/10 shadow-md' : 'border-border bg-card',
                    card ? '' : 'border-dashed'
                  )}
                >
                  {card ? (
                    <>
                      <span>{card.rank}</span>
                      <span className={SUITS.find(s => s.suit === card.suit)?.color}>
                        {SUITS.find(s => s.suit === card.suit)?.symbol}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeHeroCard(idx); }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center"
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">?</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Board cards */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Board</label>
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map((idx) => {
              const card = boardCards[idx];
              const isActive = activeSlot.type === 'board' && activeSlot.index === idx;
              const streetLabel = idx < 3 ? '' : idx === 3 ? 'T' : 'R';
              return (
                <button
                  key={`board-${idx}`}
                  onClick={() => setActiveSlot({ type: 'board', index: idx })}
                  className={cn(
                    'w-10 h-14 rounded-lg border-2 flex flex-col items-center justify-center text-xs font-bold transition-all relative',
                    isActive ? 'border-primary bg-primary/10 shadow-md' : 'border-border bg-card',
                    card ? '' : 'border-dashed',
                    idx === 3 && 'ml-2',
                    idx === 4 && 'ml-1'
                  )}
                >
                  {card ? (
                    <>
                      <span>{card.rank}</span>
                      <span className={SUITS.find(s => s.suit === card.suit)?.color}>
                        {SUITS.find(s => s.suit === card.suit)?.symbol}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeBoardCard(idx); }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center"
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <span className="text-muted-foreground">{streetLabel || '?'}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Board Texture Analysis */}
        {boardTexture && (
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-border">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Textura do Board</p>

            <div className="flex flex-wrap gap-1.5">
              {/* Suit texture badge */}
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border',
                boardTexture.suitTexture === 'monotone' && 'bg-destructive/15 text-destructive border-destructive/30',
                boardTexture.suitTexture === 'two-tone' && 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
                boardTexture.suitTexture === 'rainbow' && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
              )}>
                {boardTexture.suitTexture === 'monotone' && <Droplets className="h-3 w-3" />}
                {boardTexture.suitTexture === 'two-tone' && <Sun className="h-3 w-3" />}
                {boardTexture.suitTexture === 'rainbow' && <Rainbow className="h-3 w-3" />}
                {boardTexture.suitTexture === 'monotone' ? 'Monotone' : boardTexture.suitTexture === 'two-tone' ? 'Two-Tone' : 'Rainbow'}
              </span>

              {/* Connectivity */}
              <span className={cn(
                'inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold border',
                boardTexture.connectivity === 'connected' && 'bg-destructive/15 text-destructive border-destructive/30',
                boardTexture.connectivity === 'semi-connected' && 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
                boardTexture.connectivity === 'disconnected' && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
              )}>
                {boardTexture.connectivity === 'connected' ? 'Conectado' : boardTexture.connectivity === 'semi-connected' ? 'Semi-conectado' : 'Desconectado'}
              </span>

              {/* Highness */}
              <span className={cn(
                'inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold border',
                boardTexture.highness === 'high' && 'bg-primary/15 text-primary border-primary/30',
                boardTexture.highness === 'medium' && 'bg-muted text-muted-foreground border-border',
                boardTexture.highness === 'low' && 'bg-muted text-muted-foreground border-border',
              )}>
                {boardTexture.highness === 'high' ? 'High Board' : boardTexture.highness === 'medium' ? 'Medium' : 'Low Board'}
              </span>

              {/* Pairing */}
              {boardTexture.trips && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold border bg-destructive/15 text-destructive border-destructive/30">
                  Trips no Board
                </span>
              )}
              {boardTexture.paired && !boardTexture.trips && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold border bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                  Pareado
                </span>
              )}

              {/* Draws */}
              {boardTexture.flushComplete && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold border bg-destructive/15 text-destructive border-destructive/30">
                  Flush Completo
                </span>
              )}
              {boardTexture.flushDraw && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold border bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                  Flush Draw
                </span>
              )}
              {boardTexture.backdoorFlush && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold border bg-muted text-muted-foreground border-border">
                  Backdoor Flush
                </span>
              )}
            </div>
          </div>
        )}

        {/* Card picker grid */}
        <div className="space-y-1">
          {SUITS.map(({ suit, symbol, color, bg }) => (
            <div key={suit} className="flex gap-0.5">
              {RANKS.map((rank) => {
                const used = isUsed(rank, suit);
                return (
                  <button
                    key={`${rank}${suit}`}
                    disabled={used}
                    onClick={() => handleCardClick(rank, suit)}
                    className={cn(
                      'w-full aspect-[3/4] rounded text-[10px] sm:text-xs font-semibold flex flex-col items-center justify-center gap-0 transition-all border border-border/50',
                      used
                        ? 'opacity-20 cursor-not-allowed bg-muted'
                        : cn('cursor-pointer hover:scale-110 hover:shadow-md', bg)
                    )}
                  >
                    <span className="text-slate-900">{rank}</span>
                    <span className={cn('text-[8px] sm:text-[10px]', color)}>{symbol}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export { getHandName };
