import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Hand, LayoutGrid } from 'lucide-react';

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
  { suit: 's', symbol: '♠', color: 'text-slate-900 dark:text-slate-200', bg: 'bg-slate-100 dark:bg-slate-700' },
  { suit: 'h', symbol: '♥', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
  { suit: 'd', symbol: '♦', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { suit: 'c', symbol: '♣', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30' },
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
                      'w-full aspect-[3/4] rounded text-[10px] sm:text-xs font-semibold flex flex-col items-center justify-center gap-0 transition-all',
                      used
                        ? 'opacity-20 cursor-not-allowed bg-muted'
                        : cn('cursor-pointer hover:scale-110 hover:shadow-md', bg)
                    )}
                  >
                    <span>{rank}</span>
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
