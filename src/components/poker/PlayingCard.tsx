import { cn } from '@/lib/utils';

// Export CardType para uso em outros componentes
export type CardType = {
  rank: string;
  suit: 's' | 'h' | 'd' | 'c';
};
interface PlayingCardProps {
  rank: string;
  suit: 's' | 'h' | 'd' | 'c';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  faceDown?: boolean;
  className?: string;
}
const suitSymbols: Record<string, {
  symbol: string;
  color: string;
}> = {
  s: {
    symbol: '♠',
    color: 'text-slate-900'
  },
  h: {
    symbol: '♥',
    color: 'text-red-500'
  },
  d: {
    symbol: '♦',
    color: 'text-red-500'
  },
  c: {
    symbol: '♣',
    color: 'text-slate-900'
  }
};
const sizeClasses = {
  xs: 'w-6 h-9 text-[8px]',
  sm: 'w-10 h-14 text-sm',
  md: 'w-14 h-20 text-lg',
  lg: 'w-20 h-28 text-2xl'
};
export function PlayingCard({
  rank,
  suit,
  size = 'md',
  faceDown = false,
  className
}: PlayingCardProps) {
  const suitInfo = suitSymbols[suit];
  if (faceDown) {
    return <div className={cn('rounded-lg border-2 border-slate-600', 'bg-gradient-to-br from-secondary to-secondary/80', 'flex items-center justify-center', 'shadow-lg', sizeClasses[size], className)}>
        <div className="text-white/20 font-bold">?</div>
      </div>;
  }
  return <div className={cn('rounded-lg border-2 border-slate-300', 'bg-white', 'flex flex-col items-center justify-center gap-0.5', 'shadow-lg', 'relative overflow-hidden', sizeClasses[size], className)}>
      {/* Top-left corner */}
      <div className={cn('absolute top-1 left-1 flex flex-col items-center leading-none', suitInfo.color)}>
        <span className="font-bold">{rank}</span>
        
      </div>

      {/* Center suit */}
      <span className={cn('text-[1.5em]', suitInfo.color)}>
        {suitInfo.symbol}
      </span>

      {/* Bottom-right corner (upside down) */}
      <div className={cn('absolute bottom-1 right-1 flex flex-col items-center leading-none rotate-180', suitInfo.color)}>
        <span className="font-bold">{rank}</span>
        <span className="text-[0.6em]">{suitInfo.symbol}</span>
      </div>
    </div>;
}

// Component for displaying a hand (2 cards)
interface HandDisplayProps {
  cards: CardType[];
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}
export function HandDisplay({
  cards,
  size = 'md',
  className
}: HandDisplayProps) {
  return <div className={cn('flex gap-2', className)}>
      {cards.map((card, idx) => <PlayingCard key={idx} rank={card.rank} suit={card.suit} size={size} />)}
    </div>;
}

// Generate random cards for a hand name (e.g., "AKs" -> random suits)
export function generateCardsFromHand(hand: string): Array<{
  rank: string;
  suit: 's' | 'h' | 'd' | 'c';
}> {
  const suits: Array<'s' | 'h' | 'd' | 'c'> = ['s', 'h', 'd', 'c'];
  const randomSuit = () => suits[Math.floor(Math.random() * 4)];

  // Parse hand name
  const rank1 = hand[0];
  const rank2 = hand[1];
  const isSuited = hand.includes('s');
  const isPair = rank1 === rank2 && !hand.includes('s') && !hand.includes('o');
  if (isPair) {
    // For pairs, pick two different suits
    const suit1 = randomSuit();
    let suit2 = randomSuit();
    while (suit2 === suit1) {
      suit2 = randomSuit();
    }
    return [{
      rank: rank1,
      suit: suit1
    }, {
      rank: rank2,
      suit: suit2
    }];
  }
  if (isSuited) {
    const suit = randomSuit();
    return [{
      rank: rank1,
      suit
    }, {
      rank: rank2,
      suit
    }];
  }

  // Offsuit
  const suit1 = randomSuit();
  let suit2 = randomSuit();
  while (suit2 === suit1) {
    suit2 = randomSuit();
  }
  return [{
    rank: rank1,
    suit: suit1
  }, {
    rank: rank2,
    suit: suit2
  }];
}