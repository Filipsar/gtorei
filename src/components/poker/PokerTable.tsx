import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Position, POSITIONS } from '@/data/gtoRanges';
import { PlayerSeat, getPositionColor } from './PlayerSeat';
import { PlayerBet } from './ChipStack';
import { CommunityCards } from './CommunityCards';
import { CardType } from './PlayingCard';
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
  playerStacks?: Record<string, number>;
  visiblePositions?: Position[];
  className?: string;
}

const TAU = Math.PI * 2;
// Raios em % do container. O feltro é a elipse inscrita, então esses valores
// deixam o assento encostado na borda, meio dentro meio fora.
const RAIO_ASSENTO = 45;
const RAIO_APOSTA = 31;
const RAIO_BOTAO = 37;
// Desloca o botao do dealer de lado: em cima do mesmo raio ele cobria a aposta
const DESVIO_BOTAO = 0.2;

/**
 * Distribui os assentos na elipse com o herói sempre na base.
 *
 * Antes as coordenadas eram fixas para 8-max, o que dava dois problemas: no
 * heads-up e no 3-handed os jogadores ficavam nos lugares do 8-max, e o herói
 * mudava de lugar a cada mão conforme a posição sorteada. Ter o próprio assento
 * sempre no mesmo ponto é o que torna a mesa jogável — é assim em qualquer sala.
 */
function anguloDosAssentos(visiveis: Position[], heroi: Position): Map<Position, number> {
  const ordem = POSITIONS.filter((p) => visiveis.includes(p));
  const i = ordem.indexOf(heroi);
  const girada = i >= 0 ? [...ordem.slice(i), ...ordem.slice(0, i)] : ordem;

  const mapa = new Map<Position, number>();
  girada.forEach((pos, k) => {
    // 90° é a base da elipse (y cresce para baixo) e o ângulo cresce no sentido
    // horário — o mesmo sentido em que a ação anda na mesa.
    mapa.set(pos, Math.PI / 2 + (k / girada.length) * TAU);
  });
  return mapa;
}

function pontoNaElipse(angulo: number, raio: number) {
  return {
    left: `${50 + Math.cos(angulo) * raio}%`,
    top: `${50 + Math.sin(angulo) * raio}%`
  };
}

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
  playerStacks,
  visiblePositions,
  className
}: PokerTableProps) {
  const navigate = useNavigate();

  const visiveis = visiblePositions?.length ? visiblePositions : POSITIONS;
  const angulos = anguloDosAssentos(visiveis, heroPosition);
  const mesaCheia = visiveis.length >= 7;

  // Em heads-up quem tem o botão é o SB
  const posicaoDoBotao = visiveis.includes('BTN') ? 'BTN' : visiveis.includes('SB') ? 'SB' : undefined;
  const anguloDoBotao = posicaoDoBotao ? angulos.get(posicaoDoBotao) : undefined;

  const mostrarComunitarias = street !== 'preflop' && communityCards.length > 0;

  return (
    <div className={cn('flex flex-col items-center gap-2 sm:gap-4', className)}>
      <div className="relative mx-auto aspect-[2/1] w-full max-w-2xl px-6 sm:px-8">
        {/* Feltro */}
        <div className="absolute inset-x-6 inset-y-3 overflow-hidden rounded-[50%] border-[6px] border-[hsl(var(--table-border))] table-felt shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] sm:inset-x-8 sm:inset-y-4">
          {/* Fio dourado interno, no lugar da borda marrom que destoava do resto do site */}
          <div className="pointer-events-none absolute inset-2 rounded-[50%] border border-primary/20" />
          <div className="pointer-events-none absolute inset-0 rounded-[50%] shadow-[inset_0_0_60px_rgba(0,0,0,0.55)]" />

          {/* Marca d'água no centro */}
          <button
            type="button"
            onClick={() => navigate('/')}
            title="Voltar ao início"
            className="absolute left-1/2 top-1/2 z-0 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 opacity-[0.13] transition-opacity hover:opacity-[0.22]"
          >
            <img src={gtoreiCrown} alt="" className="h-8 w-8 object-contain sm:h-12 sm:w-12" />
            <span className="text-lg font-bold uppercase tracking-[0.2em] sm:text-2xl">
              <span className="text-primary">GTO</span>
              <span className="text-white">REI</span>
            </span>
          </button>
        </div>

        {/* Cartas comunitárias e pote, empilhados no centro */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[5] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5">
          {mostrarComunitarias && <CommunityCards cards={communityCards} street={street} />}
          {pot > 0 && (
            <div className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-black/70 px-3 py-1 shadow-lg backdrop-blur-sm">
              <span className="flex -space-x-1">
                <span className="h-2.5 w-2.5 rounded-full border border-red-700 bg-red-500" />
                <span className="h-2.5 w-2.5 rounded-full border border-green-700 bg-green-500" />
                <span className="h-2.5 w-2.5 rounded-full border border-blue-600 bg-blue-400" />
              </span>
              <span className="whitespace-nowrap text-xs font-bold text-primary tabular-nums sm:text-sm">
                {pot.toFixed(pot % 1 !== 0 ? 1 : 0)} BB
              </span>
            </div>
          )}
        </div>

        {/* Botão do dealer */}
        {anguloDoBotao !== undefined && (
          <div
            className="absolute z-[6] -translate-x-1/2 -translate-y-1/2"
            style={pontoNaElipse(anguloDoBotao + DESVIO_BOTAO, RAIO_BOTAO)}
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full border border-black/30 bg-white text-[10px] font-black text-black shadow-md"
              title="Botão do dealer"
            >
              D
            </span>
          </div>
        )}

        {/* Apostas: mesmo ângulo do assento, puxadas para o centro */}
        {activeBets
          .filter((bet) => visiveis.includes(bet.position) && angulos.has(bet.position))
          .map((bet) => (
            <div
              key={`bet-${bet.position}`}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={pontoNaElipse(angulos.get(bet.position)!, RAIO_APOSTA)}
            >
              <PlayerBet amount={bet.amount} />
            </div>
          ))}

        {/* Assentos */}
        {visiveis.map((pos) => {
          const angulo = angulos.get(pos);
          if (angulo === undefined) return null;

          const isHero = pos === heroPosition;
          const isVillain = pos === villainPosition;
          const hasFolded = foldedPositions.includes(pos);

          let cardsToShow: CardType[] | undefined;
          let shouldShowCards = false;
          if (isHero && heroCards && heroCards.length > 0) {
            cardsToShow = heroCards;
            shouldShowCards = true;
          } else if (isVillain && villainCards && villainCards.length > 0) {
            cardsToShow = villainCards;
            shouldShowCards = street === 'showdown';
          }

          let stackToShow: number | undefined;
          if (isHero) {
            stackToShow = heroStack;
          } else if (isVillain && villainStack) {
            stackToShow = villainStack;
          } else if (playerStacks && playerStacks[pos]) {
            stackToShow = playerStacks[pos];
          }

          return (
            <div
              key={pos}
              className={cn(
                'absolute z-[15] -translate-x-1/2 -translate-y-1/2',
                mesaCheia && 'scale-[0.82] sm:scale-100'
              )}
              style={pontoNaElipse(angulo, RAIO_ASSENTO)}
            >
              {bounties && bounties[pos] !== undefined && (
                <div className="absolute -top-3 left-1/2 z-20 -translate-x-1/2">
                  <span className="rounded-sm bg-rank-first/90 px-1 py-px text-[8px] font-bold leading-none text-primary-foreground shadow sm:text-[9px]">
                    ${bounties[pos]}
                  </span>
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
                half={Math.sin(angulo) < 0 ? 'top' : 'bottom'}
                lastAction={isVillain && villainAction ? villainAction : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
