import { cn } from '@/lib/utils';
import type { ModeChoice, TrainingMode } from './TrainingModeSelector';

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

const ASSENTOS_POR_MODO: Record<ModeChoice, number> = {
  rangeTraining: 8,
  hu: 2,
  threeHand: 3,
  bounty: 8,
  // No aleatório a mesa é a cheia, mas os lugares ficam por definir: quem vai
  // sentar depende do modo que sair na mão.
  random: 8,
};

interface ModeIconProps {
  mode: ModeChoice;
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
        // No aleatório só o seu lugar é certo; os outros ficam pontilhados,
        // porque a mesa muda de tamanho a cada mão.
        if (mode === 'random' && !ehVoce) {
          return (
            <circle
              key={i}
              cx={lugar.cx}
              cy={lugar.cy}
              r={raioAssento}
              className="fill-none stroke-current"
              strokeWidth="1"
              strokeDasharray="1.6 1.4"
              opacity="0.65"
            />
          );
        }
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

      {mode === 'random' && (
        <g
          className="stroke-primary"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <path d="M11 13.6h2.1a2.5 2.5 0 0 1 2.1 1.2l1.2 2.4a2.5 2.5 0 0 0 2.1 1.2H21" />
          <path d="M11 18.4h2.1a2.5 2.5 0 0 0 2.1-1.2l1.2-2.4a2.5 2.5 0 0 1 2.1-1.2H21" />
          <path d="M19.5 12.2 21 13.6l-1.5 1.4" />
          <path d="M19.5 17 21 18.4l-1.5 1.4" />
        </g>
      )}

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
