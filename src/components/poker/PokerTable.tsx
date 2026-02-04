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
  className
}: PokerTableProps) {
  const navigate = useNavigate();

  return <div className={cn('relative w-full max-w-2xl mx-auto aspect-[2/1]', className)}>
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
            <span className="text-primary">GTO</span><span className="text-white">Rei</span>
          </span>
        </div>

        {/* Community Cards */}
        {street !== 'preflop' && communityCards.length > 0 && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <CommunityCards cards={communityCards} street={street} />
          </div>}

        {/* Pot no centro */}
        {pot > 0 && <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2">
            <ChipStack amount={pot} position="center" />
          </div>}
      </div>

      {/* Posições dos jogadores */}
      {POSITIONS.map(pos => {
      const isHero = pos === heroPosition;
      const isVillain = pos === villainPosition;
      const hasFolded = foldedPositions.includes(pos);
      const layout = positionLayout[pos];
      const activeBet = activeBets.find(b => b.position === pos);

      // Determinar cartas a mostrar
      let cardsToShow: CardType[] | undefined;
      if (isHero && heroCards) {
        cardsToShow = heroCards;
      } else if (isVillain && villainCards && (street === 'showdown' || villainCards.length > 0)) {
        cardsToShow = villainCards;
      }

      // Determinar stack a mostrar
      let stackToShow: number | undefined;
      if (isHero) {
        stackToShow = heroStack;
      } else if (isVillain && villainStack) {
        stackToShow = villainStack;
      }
      return <div key={pos} className="absolute transform -translate-x-1/2 -translate-y-1/2" style={{
        left: layout.left,
        top: layout.top
      }}>
            <PlayerSeat position={pos} isHero={isHero} isActive={isHero && street === 'preflop'} hasFolded={hasFolded} cards={cardsToShow} stack={stackToShow} showCards={isHero || isVillain && street === 'showdown'} lastAction={isVillain && villainAction ? villainAction : undefined} />
          </div>;
    })}

      {/* Fichas de apostas ativas */}
      {activeBets.map(bet => {
      const betPos = betPositions[bet.position];
      if (!betPos) return null;
      return <div key={`bet-${bet.position}`} className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10" style={{
        left: betPos.left,
        top: betPos.top
      }}>
            <PlayerBet amount={bet.amount} />
          </div>;
    })}

      {/* Cartas do herói destacadas na parte inferior */}
      {heroCards && heroCards.length > 0 && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 mx-[280px]">
          <div className="bg-background/80 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-primary/30 mx-0 my-0">
            <HandDisplay cards={heroCards} size="md" />
          </div>
        </div>}
    </div>;
}