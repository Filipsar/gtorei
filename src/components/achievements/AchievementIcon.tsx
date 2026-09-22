import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Um desenho para cada conquista.
 *
 * Antes eram emojis do sistema: mudavam de cara em cada aparelho, não aceitavam
 * cor e se repetiam (a coroa servia para "Mestre" e para "GTO Rei", o escudo
 * para "Inabalável" e para "Ironman"). Aqui cada chave tem um desenho próprio,
 * em traço, herdando a cor de quem usa.
 *
 * As famílias seguem a categoria: cartas e coroas para nível, fogo e energia
 * para sequência, fichas e ferramentas para volume, alvos e joias para
 * precisão. Dentro de cada família o desenho cresce junto com a dificuldade.
 */

function estrela(cx: number, cy: number, raio: number, pontas = 5): string {
  const pontos: string[] = [];
  for (let i = 0; i < pontas * 2; i++) {
    const r = i % 2 === 0 ? raio : raio * 0.44;
    const angulo = -Math.PI / 2 + (i * Math.PI) / pontas;
    pontos.push(`${(cx + Math.cos(angulo) * r).toFixed(2)},${(cy + Math.sin(angulo) * r).toFixed(2)}`);
  }
  return pontos.join(' ');
}

const Carta = ({ x, y, rot = 0 }: { x: number; y: number; rot?: number }) => (
  <rect x={x} y={y} width="9.5" height="14" rx="2" transform={`rotate(${rot} ${x + 4.75} ${y + 7})`} />
);

const Ficha = ({ cx, cy, r = 6.5 }: { cx: number; cy: number; r?: number }) => (
  <>
    <circle cx={cx} cy={cy} r={r} />
    <circle cx={cx} cy={cy} r={r * 0.45} className="fill-primary/25" />
    {[0, 90, 180, 270].map((g) => (
      <line
        key={g}
        x1={cx + Math.cos((g * Math.PI) / 180) * (r - 1.6)}
        y1={cy + Math.sin((g * Math.PI) / 180) * (r - 1.6)}
        x2={cx + Math.cos((g * Math.PI) / 180) * r}
        y2={cy + Math.sin((g * Math.PI) / 180) * r}
      />
    ))}
  </>
);

const Coroa = ({ y = 0, escala = 1 }: { y?: number; escala?: number }) => (
  <g transform={`translate(16 ${16 + y}) scale(${escala}) translate(-16 -16)`}>
    <path d="M7 23 L8.5 11 L13 15.5 L16 8 L19 15.5 L23.5 11 L25 23 Z" />
    <line x1="8" y1="26" x2="24" y2="26" />
  </g>
);

const Chama = ({ escala = 1 }: { escala?: number }) => (
  <g transform={`translate(16 17) scale(${escala}) translate(-16 -17)`}>
    <path d="M16 5c3.2 3.6 5.8 6.4 5.8 10.2a5.8 5.8 0 0 1-11.6 0C10.2 11.4 12.8 8.6 16 5z" />
    <path d="M16 14.5c1.3 1.5 2.1 2.6 2.1 3.9a2.1 2.1 0 0 1-4.2 0c0-1.3.8-2.4 2.1-3.9z" className="fill-primary/30" />
  </g>
);

const Escudo = () => <path d="M16 4l9 3.4v7.4c0 5.6-3.7 9.6-9 11.6-5.3-2-9-6-9-11.6V7.4z" />;

const DESENHOS: Record<string, ReactNode> = {
  /* ---------- Nível: da primeira carta à coroa ---------- */
  level_2: (
    <>
      <Carta x={11.25} y={9} />
      <polygon points={estrela(16, 16, 3)} className="fill-primary stroke-none" />
    </>
  ),
  level_3: (
    <>
      <Carta x={7} y={10} rot={-14} />
      <Carta x={15.5} y={10} rot={14} />
    </>
  ),
  level_4: (
    <>
      <Carta x={4.5} y={11} rot={-20} />
      <Carta x={11.25} y={9} />
      <Carta x={18} y={11} rot={20} />
    </>
  ),
  level_5: (
    <>
      <Carta x={9} y={10} rot={-8} />
      <circle cx={22} cy={10} r="5.5" className="fill-primary/20" />
      <polygon points={estrela(22, 10, 3.6)} className="fill-primary stroke-none" />
    </>
  ),
  level_6: <Coroa escala={0.9} />,
  level_7: (
    <>
      <Coroa y={3} escala={0.82} />
      <path
        d="M16 2c2 2.3 3.4 3.9 3.4 5.9a3.4 3.4 0 0 1-6.8 0C12.6 5.9 14 4.3 16 2z"
        className="fill-primary/25"
      />
    </>
  ),
  level_8: (
    <>
      <Coroa y={1.5} escala={0.92} />
      <polygon points={estrela(16, 12.5, 2.6)} className="fill-primary stroke-none" />
      <circle cx="6" cy="8" r="1" className="fill-primary stroke-none" />
      <circle cx="26" cy="8" r="1" className="fill-primary stroke-none" />
      <circle cx="16" cy="3.5" r="1.2" className="fill-primary stroke-none" />
    </>
  ),

  /* ---------- Sequência: o fogo vira energia, depois armadura ---------- */
  streak_5: <Chama escala={0.72} />,
  streak_10: (
    <>
      <g transform="translate(3 0)">
        <Chama escala={0.82} />
      </g>
      <path d="M8.5 13.5c1.9 2.1 3.1 3.7 3.1 5.7a3.1 3.1 0 0 1-6.2 0c0-2 1.2-3.6 3.1-5.7z" />
    </>
  ),
  streak_25: <path d="M18.5 3 L9 17.5h5.2L13 29l9.5-14.5h-5.2z" className="fill-primary/20" />,
  streak_50: (
    <>
      <rect x="8" y="11" width="16" height="14" rx="3.5" />
      <line x1="16" y1="11" x2="16" y2="6.5" />
      <circle cx="16" cy="5" r="1.6" className="fill-primary stroke-none" />
      <circle cx="12.5" cy="17.5" r="1.6" className="fill-primary stroke-none" />
      <circle cx="19.5" cy="17.5" r="1.6" className="fill-primary stroke-none" />
      <line x1="13" y1="21.5" x2="19" y2="21.5" />
    </>
  ),
  streak_100: (
    <>
      <Escudo />
      <path d="M17.5 10 L13 17h3.4l-1 5 4.6-7h-3.4z" className="fill-primary/30" />
    </>
  ),
  streak_200: (
    <>
      <polygon points={estrela(20.5, 11.5, 6.5)} className="fill-primary/20" />
      <line x1="12" y1="19" x2="5" y2="26" />
      <line x1="15" y1="22" x2="10" y2="27" />
      <line x1="9.5" y1="16" x2="4.5" y2="21" />
    </>
  ),

  /* ---------- Volume: começa a caminhada, termina em bigorna ---------- */
  hands_10: (
    <>
      <ellipse cx="11" cy="20.5" rx="3.2" ry="5" transform="rotate(-10 11 20.5)" />
      <ellipse cx="10.2" cy="13.5" rx="2.3" ry="1.8" className="fill-primary/30" />
      <ellipse cx="21" cy="15.5" rx="3.2" ry="5" transform="rotate(10 21 15.5)" />
      <ellipse cx="21.8" cy="8.5" rx="2.3" ry="1.8" className="fill-primary/30" />
    </>
  ),
  hands_50: (
    <>
      <line x1="11" y1="16" x2="21" y2="16" />
      <rect x="6" y="11" width="4.5" height="10" rx="1.6" />
      <rect x="21.5" y="11" width="4.5" height="10" rx="1.6" />
      <line x1="4" y1="13.5" x2="4" y2="18.5" />
      <line x1="28" y1="13.5" x2="28" y2="18.5" />
    </>
  ),
  hands_100: (
    <>
      <ellipse cx="16" cy="22" rx="8.5" ry="3.4" />
      <ellipse cx="16" cy="17.5" rx="8.5" ry="3.4" />
      <ellipse cx="16" cy="13" rx="8.5" ry="3.4" className="fill-primary/20" />
    </>
  ),
  hands_500: (
    <>
      <circle cx="16" cy="16" r="6.5" />
      <circle cx="16" cy="16" r="2.4" className="fill-primary/30" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((g) => (
        <line
          key={g}
          x1={16 + Math.cos((g * Math.PI) / 180) * 7}
          y1={16 + Math.sin((g * Math.PI) / 180) * 7}
          x2={16 + Math.cos((g * Math.PI) / 180) * 10}
          y2={16 + Math.sin((g * Math.PI) / 180) * 10}
        />
      ))}
    </>
  ),
  hands_1000: (
    <>
      <line x1="8" y1="5" x2="8" y2="28" />
      <path d="M8 6h16v11H8z" />
      <rect x="8" y="6" width="8" height="5.5" className="fill-primary/30 stroke-none" />
      <rect x="16" y="11.5" width="8" height="5.5" className="fill-primary/30 stroke-none" />
    </>
  ),
  hands_2500: (
    <>
      <rect x="5" y="11" width="22" height="14" rx="2.5" />
      <path d="M12.5 11V8.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2V11" />
      <line x1="5" y1="17.5" x2="27" y2="17.5" />
      <rect x="14" y="15.5" width="4" height="4" rx="1" className="fill-primary/30" />
    </>
  ),
  hands_5000: (
    <>
      {/* Duas espadas cruzadas: lâmina, guarda e pomo em cada uma, senão vira um X */}
      <path d="M6 4.5L20.5 21" />
      <line x1="17.5" y1="22" x2="24" y2="18.5" />
      <line x1="20.5" y1="21" x2="23" y2="24" />
      <circle cx="23.8" cy="25.2" r="1.7" className="fill-primary/25" />
      <path d="M26 4.5L11.5 21" />
      <line x1="14.5" y1="22" x2="8" y2="18.5" />
      <line x1="11.5" y1="21" x2="9" y2="24" />
      <circle cx="8.2" cy="25.2" r="1.7" className="fill-primary/25" />
    </>
  ),
  hands_10000: (
    <>
      <path d="M5 12h16c2.8 0 4.5 1.6 6 3.5-2.4.6-3.6 1.8-5.2 3.5H9c-2.6 0-4-1.6-4-3.5z" className="fill-primary/15" />
      <path d="M13 19v4" />
      <path d="M8.5 27h11l-2-4h-7z" />
    </>
  ),

  /* ---------- Precisão: mira, joia e as estrelas dos "Best" ---------- */
  session_perfect: (
    <>
      <path d="M16 4l2.4 8.6L27 15l-8.6 2.4L16 26l-2.4-8.6L5 15l8.6-2.4z" className="fill-primary/20" />
      <circle cx="25" cy="24" r="1.6" className="fill-primary stroke-none" />
      <circle cx="7.5" cy="8" r="1.2" className="fill-primary stroke-none" />
    </>
  ),
  accuracy_90: (
    <>
      <circle cx="15" cy="17" r="9.5" />
      <circle cx="15" cy="17" r="5" />
      <circle cx="15" cy="17" r="1.4" className="fill-primary stroke-none" />
      <path d="M15 17L26 6" />
      <path d="M22.5 6h3.8v3.8" />
    </>
  ),
  accuracy_95: (
    <>
      <circle cx="16" cy="16" r="8.5" />
      <line x1="16" y1="3.5" x2="16" y2="10" />
      <line x1="16" y1="22" x2="16" y2="28.5" />
      <line x1="3.5" y1="16" x2="10" y2="16" />
      <line x1="22" y1="16" x2="28.5" y2="16" />
      <circle cx="16" cy="16" r="1.5" className="fill-primary stroke-none" />
    </>
  ),
  accuracy_98: (
    <>
      {/* Dois lobos espelhados com uma fenda no meio: a forma única virava folha */}
      <path d="M15 6.5a4.2 4.2 0 0 0-4.2 4.2 3.6 3.6 0 0 0-2 6.4 3.7 3.7 0 0 0 1.4 5.8A3.5 3.5 0 0 0 15 25.5z" />
      <path d="M17 6.5a4.2 4.2 0 0 1 4.2 4.2 3.6 3.6 0 0 1 2 6.4 3.7 3.7 0 0 1-1.4 5.8A3.5 3.5 0 0 1 17 25.5z" />
      {/* As dobras são o que faz ler como cérebro: sem elas, vira moeda partida */}
      <path d="M12.6 10.8c1.3.3 2 1.1 2.4 2.2" strokeWidth="1.3" />
      <path d="M10.7 16c1.6.2 2.7 1.1 3.1 2.4" strokeWidth="1.3" />
      <path d="M19.4 10.8c-1.3.3-2 1.1-2.4 2.2" strokeWidth="1.3" />
      <path d="M21.3 16c-1.6.2-2.7 1.1-3.1 2.4" strokeWidth="1.3" />
    </>
  ),
  session_perfect_50: (
    <>
      <path d="M10 8h12l5 6.5L16 27 5 14.5z" className="fill-primary/15" />
      <path d="M5 14.5h22" />
      <path d="M10 8l-1 6.5 7 12.5 7-12.5-1-6.5" />
    </>
  ),
  best_10: <polygon points={estrela(16, 16, 10)} className="fill-primary/20" />,
  best_25: (
    <>
      <polygon points={estrela(11, 19, 7.5)} className="fill-primary/20" />
      <polygon points={estrela(21.5, 12, 6)} className="fill-primary/20" />
    </>
  ),
  best_50: (
    <>
      <polygon points={estrela(9, 20, 6.5)} className="fill-primary/20" />
      <polygon points={estrela(16, 11, 7)} className="fill-primary/20" />
      <polygon points={estrela(23, 20, 6.5)} className="fill-primary/20" />
    </>
  ),
};

interface AchievementIconProps {
  /** A chave da conquista, como está em ACHIEVEMENTS */
  achievement: string;
  className?: string;
}

export function AchievementIcon({ achievement, className }: AchievementIconProps) {
  const desenho = DESENHOS[achievement];
  if (!desenho) return null;

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('h-7 w-7', className)}
    >
      {desenho}
    </svg>
  );
}
