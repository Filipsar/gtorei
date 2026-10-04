import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ABERTURA_100BB } from '@/data/guiaIniciante';

// Mesa de 8 lugares vista de cima. A ação do pré-flop gira no sentido horário
// a partir do UTG; o botão fica embaixo, no centro.
export const POSICOES_MESA = [
  {
    id: 'UTG',
    nome: 'UTG (Under the Gun)',
    pre: 1,
    pos: 3,
    texto:
      'Primeiro a falar no pré-flop. Ainda há sete jogadores para agir depois de você, então a chance de alguém ter uma mão melhor é a maior da mesa. Por isso a range é a mais apertada.',
  },
  {
    id: 'UTG1',
    nome: 'UTG+1',
    pre: 2,
    pos: 4,
    texto: 'Segundo a falar. Um jogador a menos atrás de você já permite abrir um pouco mais que o UTG.',
  },
  {
    id: 'LJ',
    nome: 'Lojack (LJ)',
    pre: 3,
    pos: 5,
    texto: 'O meio da mesa. Daqui em diante cada lugar mais perto do botão abre mais mãos que o anterior.',
  },
  {
    id: 'HJ',
    nome: 'Hijack (HJ)',
    pre: 4,
    pos: 6,
    texto: 'Duas posições antes do botão. Começam a entrar mãos de naipe igual e cartas conectadas.',
  },
  {
    id: 'CO',
    nome: 'Cutoff (CO)',
    pre: 5,
    pos: 7,
    texto:
      'Uma antes do botão. Se o botão desistir, você joga o resto da mão falando por último, e isso vale muito: a range abre bem.',
  },
  {
    id: 'BTN',
    nome: 'Botão (BTN)',
    pre: 6,
    pos: 8,
    texto:
      'A melhor posição da mesa: depois do flop você sempre fala por último, vendo o que todos fizeram antes de decidir. Só restam os dois blinds para enfrentar, e quase metade das mãos abre.',
  },
  {
    id: 'SB',
    nome: 'Small blind (SB)',
    pre: 7,
    pos: 1,
    texto:
      'Paga meio big blind antes das cartas. Quando todos desistem até você, só o big blind sobra e a range abre muito. O preço vem depois do flop: você fala primeiro em todas as ruas.',
  },
  {
    id: 'BB',
    nome: 'Big blind (BB)',
    pre: 8,
    pos: 2,
    texto:
      'Paga 1 big blind antes das cartas e é o último a falar no pré-flop. Não abre: se todos desistem, ele já ganhou o pote. O trabalho dele é defender contra quem abriu, e é a posição com menos acerto entre os jogadores do GTORei.',
  },
] as const;

export type PosicaoId = (typeof POSICOES_MESA)[number]['id'];

// Ângulo de cada lugar na elipse (0° = direita, sentido horário na tela)
function coordenadas(indice: number) {
  const angulo = ((90 + (indice - 5) * 45) * Math.PI) / 180;
  return { left: 50 + 42 * Math.cos(angulo), top: 50 + 40 * Math.sin(angulo) };
}

export function PositionTable({
  selecionada,
  onSelecionar,
  onVerMaos,
}: {
  selecionada: PosicaoId;
  onSelecionar: (p: PosicaoId) => void;
  onVerMaos: (p: PosicaoId) => void;
}) {
  const info = POSICOES_MESA.find((p) => p.id === selecionada)!;
  const abertura = ABERTURA_100BB[selecionada];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
      <div className="relative mx-auto aspect-[4/3] w-full max-w-md">
        {/* feltro */}
        <div className="absolute inset-[14%] rounded-[50%] border-4 border-primary/25 bg-[radial-gradient(ellipse_at_center,hsl(var(--feedback-best)/0.28),hsl(var(--feedback-best)/0.08))]" />
        <p className="absolute inset-0 flex items-center justify-center text-xs font-medium text-muted-foreground">
          clique num lugar
        </p>
        {POSICOES_MESA.map((p, i) => {
          const { left, top } = coordenadas(i);
          const ativo = p.id === selecionada;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelecionar(p.id)}
              aria-pressed={ativo}
              aria-label={`${p.nome}: fala em ${p.pre}º no pré-flop`}
              style={{ left: `${left}%`, top: `${top}%` }}
              className={cn(
                'absolute flex h-12 w-12 sm:h-14 sm:w-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                ativo
                  ? 'scale-110 border-primary bg-primary text-primary-foreground shadow-lg'
                  : 'border-border bg-card text-foreground hover:border-primary/60',
              )}
            >
              {p.id === 'UTG1' ? 'UTG+1' : p.id}
              <span className={cn('text-[10px] font-medium', ativo ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                {p.pre}º
              </span>
            </button>
          );
        })}
        {/* ficha do dealer ao lado do botão */}
        <span
          aria-hidden="true"
          className="absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[10px] font-bold text-neutral-900 shadow"
          style={{ left: '62%', top: '78%' }}
        >
          D
        </span>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-lg font-semibold text-foreground">{info.nome}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Fala em {info.pre}º no pré-flop · {info.pos}º depois do flop
        </p>
        <p className="mt-3 text-body-sm leading-relaxed text-muted-foreground">{info.texto}</p>
        {abertura ? (
          <>
            <div className="mt-4">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Abre com 100 BB</span>
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {abertura.pct.toLocaleString('pt-BR')}%
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${abertura.pct}%` }} />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">das mãos possíveis, quando todos antes dele desistiram</p>
            </div>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => onVerMaos(selecionada)}>
              Ver quais mãos abrem <ArrowDown className="ml-1 h-4 w-4" />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
