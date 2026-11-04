import { useId } from 'react';
import { NIVEIS_INDICACAO } from '@/data/indicacao';
import { cn } from '@/lib/utils';

interface Cores {
  claro: string;
  escuro: string;
  borda: string;
}

// Níveis 1 e 2 são metal simples; do 3 em diante, as nobres: ouro com louros,
// ouro com gema e, no 5, a coroa sobre o roxo real com brilho.
const CORES: Record<number, Cores> = {
  1: { claro: '#E9A974', escuro: '#8C4F24', borda: '#5E3315' },
  2: { claro: '#F4F6F9', escuro: '#9AA3AF', borda: '#5F6773' },
  3: { claro: '#FFE27A', escuro: '#D99A00', borda: '#8A6100' },
  4: { claro: '#FFE27A', escuro: '#C98A00', borda: '#7A5200' },
  5: { claro: '#8B5CF6', escuro: '#3B0F80', borda: '#F5B900' },
};

interface Props {
  /** Nível de indicação, de 1 a 5 (NIVEIS_INDICACAO) */
  nivel: number;
  /** Lado da insígnia, em px */
  tamanho?: number;
  className?: string;
}

/**
 * Insígnia do nível de indicação, ao lado do nome no ranking, na comunidade e
 * no perfil. Nível vem de insignias_de_indicacao (migration 20261104120000).
 */
export function InsigniaDeIndicacao({ nivel, tamanho = 20, className }: Props) {
  const id = `ind${useId().replace(/:/g, '')}`;
  const n = Math.min(Math.max(Math.round(nivel), 1), 5);
  const c = CORES[n];
  const nome = NIVEIS_INDICACAO.find((x) => x.nivel === n)?.nome ?? 'Indicação';
  const nobre = n >= 3;

  return (
    <span
      className={cn('relative inline-flex shrink-0 align-middle', className)}
      style={{ width: tamanho, height: tamanho }}
      role="img"
      aria-label={`Insígnia de indicação: ${nome}`}
      title={`${nome} (indicação nível ${n})`}
    >
      {n === 5 && (
        <span
          aria-hidden="true"
          className="absolute -inset-[30%] rounded-full blur-[5px] motion-safe:animate-pulse"
          style={{ background: 'radial-gradient(circle, rgba(245,185,0,0.55), rgba(124,58,237,0.35) 55%, transparent 72%)' }}
        />
      )}
      <svg viewBox="0 0 40 40" className="relative h-full w-full drop-shadow" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c.claro} />
            <stop offset="1" stopColor={c.escuro} />
          </linearGradient>
        </defs>

        {/* Louros dos níveis nobres */}
        {nobre && (
          <g fill={n === 5 ? '#F5B900' : c.escuro} stroke={c.borda} strokeWidth="0.6">
            {[0, 1, 2].map((i) => (
              <g key={i}>
                <ellipse cx={7 + i * 1.2} cy={26 - i * 6} rx="2.2" ry="3.6" transform={`rotate(${-35 + i * 15} ${7 + i * 1.2} ${26 - i * 6})`} />
                <ellipse cx={33 - i * 1.2} cy={26 - i * 6} rx="2.2" ry="3.6" transform={`rotate(${35 - i * 15} ${33 - i * 1.2} ${26 - i * 6})`} />
              </g>
            ))}
          </g>
        )}

        {/* Medalha: círculo nos simples, escudo nos nobres */}
        {nobre ? (
          <path
            d="M20 6l10 3.6v8.2c0 6.2-4.1 10.6-10 12.8-5.9-2.2-10-6.6-10-12.8V9.6z"
            fill={`url(#${id}-g)`}
            stroke={c.borda}
            strokeWidth="1.4"
          />
        ) : (
          <>
            <path d="M14 26l-3 10 5-2.5 3 3.5 1-11zM26 26l3 10-5-2.5-3 3.5-1-11z" fill={c.escuro} stroke={c.borda} strokeWidth="0.8" />
            <circle cx="20" cy="18" r="11" fill={`url(#${id}-g)`} stroke={c.borda} strokeWidth="1.4" />
          </>
        )}

        {/* Símbolo do nível */}
        {n === 1 && <circle cx="20" cy="18" r="3.2" fill={c.borda} />}
        {n === 2 && (
          <g fill={c.borda}>
            <circle cx="16.5" cy="18" r="2.6" />
            <circle cx="23.5" cy="18" r="2.6" />
          </g>
        )}
        {n === 3 && <path d="M20 11.5l2 4.2 4.6.6-3.3 3.2.8 4.6L20 21.9l-4.1 2.2.8-4.6-3.3-3.2 4.6-.6z" fill={c.borda} />}
        {n === 4 && (
          <>
            <path d="M20 11l5 5.5-5 7.5-5-7.5z" fill="#3B82F6" stroke="#1E3A8A" strokeWidth="1" />
            <path d="M15 16.5h10" stroke="#1E3A8A" strokeWidth="0.8" />
          </>
        )}
        {n === 5 && (
          <>
            <path d="M12.5 21.5l-1.3-9 5.2 4 3.6-6.5 3.6 6.5 5.2-4-1.3 9z" fill="#F5B900" stroke="#7A5200" strokeWidth="1" />
            <path d="M12.8 24h14.4" stroke="#F5B900" strokeWidth="1.8" strokeLinecap="round" />
          </>
        )}
      </svg>
    </span>
  );
}
