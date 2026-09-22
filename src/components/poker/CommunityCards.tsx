import { cn } from '@/lib/utils';
import { PlayingCard, CardType } from './PlayingCard';

interface CommunityCardsProps {
  cards: CardType[];
  street?: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  className?: string;
}

export function CommunityCards({ cards, street = 'preflop', className }: CommunityCardsProps) {
  // Determina quantas cartas mostrar baseado no street
  const visibleCards = (() => {
    switch (street) {
      case 'flop':
        return cards.slice(0, 3);
      case 'turn':
        return cards.slice(0, 4);
      case 'river':
      case 'showdown':
        return cards.slice(0, 5);
      default:
        return [];
    }
  })();

  if (visibleCards.length === 0) return null;

  return (
    <div className={cn(
      'flex items-center justify-center gap-1 sm:gap-2',
      className
    )}>
      {visibleCards.map((card, index) => (
        <div
          key={`${card.rank}-${card.suit}-${index}`}
          // Quem anima a carta que acabou de sair é a mesa, que usa esta marca
          // para achar só as novas. A classe antiga animava todas de novo a
          // cada street, e metade dela (animate-scale-in) nem existia.
          data-carta-comunitaria
        >
          <PlayingCard
            rank={card.rank}
            suit={card.suit}
            size="sm"
          />
        </div>
      ))}

      {/* Placeholder para cartas ainda não reveladas */}
      {Array.from({ length: 5 - visibleCards.length }).map((_, index) => (
        <div
          key={`placeholder-${index}`}
          className="w-8 h-12 sm:w-10 sm:h-14 rounded-md bg-muted/30 border border-border/30"
        />
      ))}
    </div>
  );
}
