import { cn } from '@/lib/utils';
import type { TrainingMode } from './TrainingModeSelector';

/**
 * Ícones dos modos de treino.
 *
 * Em vez de arte genérica, cada ícone desenha a mesa que o modo usa de verdade:
 * oito assentos no treino de range, dois no heads-up, três no three hand, e a
 * mesa cheia com um alvo na cabeça de um jogador no bounty. A geometria segue a
 * mesa do treino — o seu lugar embaixo, os outros no sentido horário — então o
 * ícone já mostra como a tela vai ser.
 */

const TAU = Math.PI * 2;
const RAIO_X = 11.6;
const RAIO_Y = 8.4;

/**
 * Espaçar os assentos pelo ângulo amontoa todo mundo nas pontas da elipse,
 * porque ângulo igual não é distância igual. Aqui o perímetro é medido e os
 * lugares saem equidistantes de verdade.
 */
function angulosEquidistantes(quantidade: number): number[] {
  const amostras = 360;
  const acumulado = [0];
  for (let i = 1; i <= amostras; i++) {
    const anterior = ((i - 1) / amostras) * TAU;
    const atual = (i / amostras) * TAU;
    const dx = RAIO_X * (Math.cos(atual) - Math.cos(anterior));
    const dy = RAIO_Y * (Math.sin(atual) - Math.sin(anterior));
    acumulado.push(acumulado[i - 1] + Math.hypot(dx, dy));
  }
  const perimetro = acumulado[amostras];

  return Array.from({ length: quantidade }, (_, k) => {
    const alvo = (k / quantidade) * perimetro;
    const i = acumulado.findIndex((valor) => valor >= alvo);
    // Math.PI / 2 é a base da elipse: o primeiro lugar é sempre o seu
    return Math.PI / 2 + ((i < 0 ? amostras : i) / amostras) * TAU;
  });
}

const cache = new Map<number, { cx: number; cy: number }[]>();

function assentos(quantidade: number) {
  const guardado = cache.get(quantidade);
  if (guardado) return guardado;

  const lugares = angulosEquidistantes(quantidade).map((angulo) => ({
    cx: Number((16 + Math.cos(angulo) * RAIO_X).toFixed(2)),
    cy: Number((16 + Math.sin(angulo) * RAIO_Y).toFixed(2)),
  }));
  cache.set(quantidade, lugares);
  return lugares;
}

const ASSENTOS_POR_MODO: Record<TrainingMode, number> = {
  rangeTraining: 8,
  hu: 2,
  threeHand: 3,
  bounty: 8,
};

interface ModeIconProps {
  mode: TrainingMode;
  className?: string;
}

export function ModeIcon({ mode, className }: ModeIconProps) {
  const quantidade = ASSENTOS_POR_MODO[mode];
  const lugares = assentos(quantidade);
  // Mesa vazia tem espaço de sobra: assento maior quando há poucos jogadores
  const raioAssento = quantidade <= 3 ? 2.9 : 2.2;
  // O lugar de cima é o oposto ao seu: é nele que vai o alvo do bounty
  const alvo = lugares[Math.floor(lugares.length / 2)];

  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cn('h-10 w-10', className)}>
      <ellipse
        cx="16"
        cy="16"
        rx={RAIO_X}
        ry={RAIO_Y}
        className="fill-primary/10 stroke-current"
        strokeWidth="1.3"
        opacity="0.75"
      />

      {lugares.map((lugar, i) => {
        if (mode === 'bounty' && lugar === alvo) return null;
        const ehVoce = i === 0;
        return (
          <circle
            key={i}
            cx={lugar.cx}
            cy={lugar.cy}
            r={ehVoce ? raioAssento + 0.7 : raioAssento}
            className={ehVoce ? 'fill-primary' : 'fill-current'}
            opacity={ehVoce ? 1 : 0.85}
          />
        );
      })}

      {mode === 'bounty' && (
        <g className="stroke-primary" strokeWidth="1.1" strokeLinecap="round">
          <circle cx={alvo.cx} cy={alvo.cy} r="3.5" className="fill-primary/20 stroke-primary" />
          <circle cx={alvo.cx} cy={alvo.cy} r="1.2" className="fill-primary stroke-none" />
          <line x1={alvo.cx - 5.6} y1={alvo.cy} x2={alvo.cx - 4.3} y2={alvo.cy} />
          <line x1={alvo.cx + 4.3} y1={alvo.cy} x2={alvo.cx + 5.6} y2={alvo.cy} />
          <line x1={alvo.cx} y1={alvo.cy - 5.6} x2={alvo.cx} y2={alvo.cy - 4.3} />
          <line x1={alvo.cx} y1={alvo.cy + 4.3} x2={alvo.cx} y2={alvo.cy + 5.6} />
        </g>
      )}
    </svg>
  );
}
