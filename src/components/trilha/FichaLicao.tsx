import type { CSSProperties } from 'react';
import { Check, Lock, Star, Trophy } from 'lucide-react';
import { VAR_DA_COR, type CorDoNivel, type Licao } from '@/data/trilha';
import type { Estado, Estrelas } from '@/lib/trilha';
import { cn } from '@/lib/utils';

interface Props {
  licao: Licao;
  numero: number;
  estado: Estado;
  estrelas: Estrelas;
  cor: CorDoNivel;
  onAbrir: () => void;
}

// A face da ficha deitada na mesa, vista na diagonal
const INCLINACAO = 'rotateX(52deg) rotateZ(-24deg)';
// Espessura da ficha: camadas mais escuras empilhadas embaixo da face. Com a
// inclinação, elas aparecem como a borda lateral da ficha.
const espessura = (fundo: string) =>
  [1, 2, 3, 4, 5, 6, 7]
    .map((i) => `0 ${i * 1.6}px 0 color-mix(in srgb, ${fundo} ${78 - i * 3}%, black)`)
    .concat('0 16px 14px rgba(0,0,0,0.45)')
    .join(', ');

/**
 * Uma lição na trilha, desenhada como ficha de poker deitada na mesa: borda
 * com as marcas brancas, miolo na cor do nível, a espessura aparecendo de lado.
 * O rótulo (BTN, 10BB…) fica em pé, por cima, para continuar legível.
 * Bloqueada: ficha cinza com cadeado. A atual pulsa e ganha o balão "Jogar".
 */
export function FichaLicao({ licao, numero, estado, estrelas, cor, onAbrir }: Props) {
  const bloqueada = estado === 'bloqueada';
  const tamanho = licao.mesaFinal ? 92 : 80;
  const corDaFicha = bloqueada ? 'var(--muted)' : VAR_DA_COR[cor];
  const fundo = `hsl(${corDaFicha})`;

  const descricao =
    estado === 'feita'
      ? `concluída, ${estrelas} de 3 estrelas`
      : estado === 'atual'
        ? 'próxima lição'
        : 'bloqueada';

  return (
    <div className="relative flex flex-col items-center">
      {/* Fora do fluxo: dentro dele, o balão apertava a ficha */}
      {estado === 'atual' && (
        <span
          aria-hidden="true"
          className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl border border-border bg-card px-3 py-1 text-xs font-bold uppercase tracking-wider text-foreground shadow-md motion-safe:animate-bounce"
        >
          Jogar
        </span>
      )}
      <button
        type="button"
        onClick={onAbrir}
        aria-label={`Lição ${numero}: ${licao.titulo}, ${descricao}`}
        className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        style={{ width: tamanho + 8, height: tamanho, perspective: '520px' } as CSSProperties}
      >
        {/* Face da ficha. Aperta para baixo ao tocar, como ficha empilhada. */}
        <span
          aria-hidden="true"
          // O aperto entra por variável: a classe translate-y perderia para o transform inline
          className="absolute inset-x-1 inset-y-0 rounded-full p-[6px] transition-transform duration-100 group-active:[--aperto:4px]"
          style={{
            transform: `translateY(var(--aperto, 0px)) ${INCLINACAO}`,
            // Borda: cor e marcas brancas alternadas, oito vezes
            background: bloqueada
              ? fundo
              : `repeating-conic-gradient(from 11deg, ${fundo} 0deg 33deg, hsl(0 0% 96%) 33deg 45deg)`,
            boxShadow: espessura(fundo),
          }}
        >
          <span
            className={cn(
              'block h-full w-full rounded-full border-2 border-dashed',
              bloqueada ? 'border-muted-foreground/40' : 'border-black/25'
            )}
            style={{ background: fundo }}
          />
          {estado === 'atual' && (
            <span
              className="pointer-events-none absolute -inset-2 rounded-full border-4 opacity-70 motion-safe:animate-pulse"
              style={{ borderColor: fundo }}
            />
          )}
        </span>

        {/* Rótulo em pé sobre a face */}
        <span
          className={cn(
            'pointer-events-none absolute inset-0 flex -translate-y-1 items-center justify-center font-extrabold uppercase leading-none tracking-tight',
            bloqueada ? 'text-muted-foreground' : 'text-black'
          )}
        >
          {bloqueada ? (
            <Lock className="h-6 w-6" aria-hidden="true" />
          ) : licao.mesaFinal ? (
            <Trophy className="h-8 w-8" aria-hidden="true" />
          ) : (
            <span className="text-sm">{licao.rotulo}</span>
          )}
        </span>

        {estado === 'feita' && (
          <span
            aria-hidden="true"
            className="absolute -right-1 top-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground"
          >
            <Check className="h-3.5 w-3.5 stroke-[3]" />
          </span>
        )}
      </button>
      {/* Estrelas só para quem já passou: 7, 8 e 9+ acertos de 10 */}
      <span aria-hidden="true" className={cn('mt-2 flex gap-0.5', estado !== 'feita' && 'invisible')}>
        {[1, 2, 3].map((i) => (
          <Star
            key={i}
            className={cn('h-4 w-4', i <= estrelas ? 'fill-current text-primary' : 'text-muted-foreground/50')}
          />
        ))}
      </span>
    </div>
  );
}
