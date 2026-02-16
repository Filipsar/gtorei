import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Position, POSITIONS } from '@/data/gtoRanges';
import { PlayerSeat, getPositionColor } from './PlayerSeat';
import { ChipStack, PlayerBet } from './ChipStack';
import { CommunityCards } from './CommunityCards';
import { CardType, HandDisplay } from './PlayingCard';
import gtoreiLogo from '@/assets/gtorei-logo.png';
import gtoreiCrown from '@/assets/gtorei-crown.png';

// Tipos de ação para o histórico
export interface ActionEntry {
  position: Position;
  action: string;
  amount?: number;
  isHero?: boolean;
}
interface PokerTableProps {
  heroPosition: Position;
  heroCards?: CardType[];
  pot?: number;
  heroStack?: number;
  villainPosition?: Position;
  villainCards?: CardType[];
  villainAction?: {
    action: string;
    amount: number;
  };
  villainStack?: number;
  communityCards?: CardType[];
  street?: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  foldedPositions?: Position[];
  activeBets?: {
    position: Position;
    amount: number;
  }[];
  bounties?: Record<string, number>;
  visiblePositions?: Position[];
  className?: string;
}

// Layout fixo de posições (8-max) - coordenadas em % do container
const positionLayout: Record<Position, {
  left: string;
  top: string;
}> = {
  BB: {
    left: '65%',
    top: '12%'
  },
  SB: {
    left: '35%',
    top: '12%'
  },
  BTN: {
    left: '10%',
    top: '40%'
  },
  CO: {
    left: '15%',
    top: '75%'
  },
  HJ: {
    left: '40%',
    top: '88%'
  },
  LJ: {
    left: '60%',
    top: '88%'
  },
  UTG1: {
    left: '85%',
    top: '75%'
  },
  UTG: {
    left: '90%',
    top: '40%'
  }
};

// Posições das apostas (fichas) próximas a cada jogador
const betPositions: Record<Position, {
  left: string;
  top: string;
}> = {
  BB: {
    left: '60%',
    top: '25%'
  },
  SB: {
    left: '40%',
    top: '25%'
  },
  BTN: {
    left: '20%',
    top: '45%'
  },
  CO: {
    left: '25%',
    top: '65%'
  },
  HJ: {
    left: '42%',
    top: '72%'
  },
  LJ: {
    left: '58%',
    top: '72%'
  },
  UTG1: {
    left: '75%',
    top: '65%'
  },
  UTG: {
    left: '80%',
    top: '45%'
  }
};
export function PokerTable({
  heroPosition,
  heroCards,
  pot = 0,
  heroStack = 0,
  villainPosition,
  villainCards,
  villainAction,
  villainStack,
  communityCards = [],
  street = 'preflop',
  foldedPositions = [],
  activeBets = [],
  bounties,
  visiblePositions,
  className
}: PokerTableProps) {
  const navigate = useNavigate();

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Container da mesa */}
      <div className="relative w-full max-w-2xl mx-auto aspect-[2/1]">
        {/* Mesa oval com feltro verde */}
        <div className="absolute inset-4 rounded-[50%] table-felt border-8 border-[hsl(var(--table-border))] shadow-2xl overflow-hidden">
          {/* Borda interna decorativa */}
          <div className="absolute inset-3 rounded-[50%] border-2 border-foreground/10" />
          
          {/* Padrão sutil do feltro */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,transparent_20%,hsl(var(--background)/0.3)_80%)]" />

          {/* Logo GTORei no centro - clickable */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[65%] flex items-center gap-2 cursor-pointer hover:opacity-30 transition-opacity"
            onClick={() => navigate('/')}
            title="Voltar ao início"
          >
            <img src={gtoreiCrown} alt="GTORei" className="w-10 h-10 sm:w-14 sm:h-14 opacity-20 object-contain" />
            <span className="text-xl sm:text-2xl font-bold tracking-[0.2em] uppercase opacity-20">
              <span className="text-primary">GTO</span><span className="text-white">REI</span>
            </span>
          </div>

          {/* Community Cards */}
          {street !== 'preflop' && communityCards.length > 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1]">
              <CommunityCards cards={communityCards} street={street} />
            </div>
          )}

          {/* Pot no centro - estilo GGPoker */}
          {pot > 0 && (
            <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-border/30 shadow-lg">
                <div className="flex -space-x-1">
                  <div className="w-3 h-3 rounded-full bg-red-500 border border-red-700" />
                  <div className="w-3 h-3 rounded-full bg-green-500 border border-green-700" />
                  <div className="w-3 h-3 rounded-full bg-blue-400 border border-blue-600" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-primary whitespace-nowrap">
                  {pot.toFixed(pot % 1 !== 0 ? 1 : 0)} BB
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Posições dos jogadores */}
        {(visiblePositions || POSITIONS).map(pos => {
          const isHero = pos === heroPosition;
          const isVillain = pos === villainPosition;
          const hasFolded = foldedPositions.includes(pos);
          const layout = positionLayout[pos];
          const activeBet = activeBets.find(b => b.position === pos);

          // Determinar cartas a mostrar abaixo do seat
          let cardsToShow: CardType[] | undefined;
          let shouldShowCards = false;
          if (isHero && heroCards && heroCards.length > 0) {
            cardsToShow = heroCards;
            shouldShowCards = true;
          } else if (isVillain && villainCards && villainCards.length > 0) {
            cardsToShow = villainCards;
            shouldShowCards = street === 'showdown'; // face down unless showdown
          }

          // Determinar stack a mostrar
          let stackToShow: number | undefined;
          if (isHero) {
            stackToShow = heroStack;
          } else if (isVillain && villainStack) {
            stackToShow = villainStack;
          }

          return (
            <div 
              key={pos} 
              className="absolute transform -translate-x-1/2 -translate-y-1/2" 
              style={{
                left: layout.left,
                top: layout.top
              }}
            >
              {/* Bounty badge - compact, inside seat */}
              {bounties && bounties[pos] !== undefined && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                  <div className="bg-rank-first/80 text-primary-foreground text-[8px] sm:text-[9px] font-bold px-1 py-px rounded-sm shadow whitespace-nowrap leading-none">
                    ${bounties[pos]}
                  </div>
                </div>
              )}
              <PlayerSeat 
                position={pos} 
                isHero={isHero} 
                isVillain={isVillain}
                isActive={isHero && street === 'preflop'} 
                hasFolded={hasFolded} 
                cards={cardsToShow} 
                stack={stackToShow} 
                showCards={shouldShowCards} 
                lastAction={isVillain && villainAction ? villainAction : undefined} 
              />
            </div>
          );
        })}

        {/* Fichas de apostas ativas */}
        {activeBets.filter(bet => !visiblePositions || visiblePositions.includes(bet.position)).map(bet => {
          const betPos = betPositions[bet.position];
          if (!betPos) return null;
          return (
            <div 
              key={`bet-${bet.position}`} 
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10" 
              style={{
                left: betPos.left,
                top: betPos.top
              }}
            >
              <PlayerBet amount={bet.amount} />
            </div>
          );
        })}
      </div>
    </div>
  );
}