import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PlayingCard } from './PlayingCard';

// Uma mão inteira, rua por rua. A história foi escolhida para ensinar duas
// ideias de uma vez: projeto (flush draw) no flop e mão feita no turn.
// Board: Q♠ 7♦ 2♠ J♠ 9♣ com A♠K♠ → flush de ás (A♠ K♠ Q♠ J♠ 2♠), sem
// sequência possível para você.
const MAO = ['A♠', 'K♠'];
const BOARD = ['Q♠', '7♦', '2♠', 'J♠', '9♣'];

const ETAPAS = [
  {
    nome: 'Pré-flop',
    cartasNaMesa: 0,
    destaque: [] as string[],
    titulo: 'Cada um recebe 2 cartas fechadas',
    texto:
      'Antes de qualquer carta, o small blind e o big blind põem as apostas obrigatórias. A ação começa no jogador à esquerda do big blind (o UTG) e gira no sentido horário. Cada um escolhe: fold (desistir), call (pagar) ou raise (aumentar). Você está no botão com A♠K♠ e abre.',
  },
  {
    nome: 'Flop',
    cartasNaMesa: 3,
    destaque: ['Q♠', '2♠'],
    titulo: 'Três cartas comunitárias de uma vez',
    texto:
      'As cartas da mesa são de todos. A partir daqui fala primeiro quem está à esquerda do botão, e você fala por último: é a vantagem da posição. Com Q♠ 7♦ 2♠ você ainda não tem par, mas tem quatro cartas de espadas: falta uma para o flush. Isso é um projeto (draw).',
  },
  {
    nome: 'Turn',
    cartasNaMesa: 4,
    destaque: ['J♠'],
    titulo: 'A quarta carta',
    texto:
      'Saiu J♠ e o flush fechou. Como você tem o ás de espadas, é o flush mais alto possível com essa mesa: o nut flush. Nova rodada de apostas, agora com a mão pronta.',
  },
  {
    nome: 'River',
    cartasNaMesa: 5,
    destaque: ['9♣'],
    titulo: 'A quinta e última carta',
    texto:
      'O 9♣ não muda sua mão. É a última rodada de apostas: depois dela, quem continuar mostra as cartas.',
  },
  {
    nome: 'Showdown',
    cartasNaMesa: 5,
    destaque: ['A♠', 'K♠', 'Q♠', 'J♠', '2♠'],
    titulo: 'Vence a melhor combinação de 5 cartas',
    texto:
      'Cada jogador monta a melhor mão possível com 5 das 7 cartas que enxerga (as 2 dele e as 5 da mesa). A sua é A♠ K♠ Q♠ J♠ 2♠: flush de ás.',
  },
];

export function HandWalkthrough() {
  const [etapa, setEtapa] = useState(0);
  const atual = ETAPAS[etapa];

  return (
    <div className="space-y-5">
      {/* Linha do tempo das ruas */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Fases da mão">
        {ETAPAS.map((e, i) => (
          <button
            key={e.nome}
            type="button"
            onClick={() => setEtapa(i)}
            aria-pressed={i === etapa}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              i === etapa
                ? 'border-primary bg-primary text-primary-foreground'
                : i < etapa
                  ? 'border-primary/40 bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {i + 1}. {e.nome}
          </button>
        ))}
      </div>

      {/* Mesa */}
      <div className="rounded-[2rem] border border-border bg-[radial-gradient(ellipse_at_center,hsl(var(--feedback-best)/0.18),transparent_70%)] px-4 py-6 sm:py-8">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mesa</p>
        <div className="flex justify-center gap-1.5 sm:gap-2">
          {BOARD.map((c, i) => (
            <PlayingCard
              key={c}
              carta={c}
              oculta={i >= atual.cartasNaMesa}
              destaque={atual.destaque.includes(c)}
            />
          ))}
        </div>
        <p className="mb-2 mt-6 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sua mão · botão</p>
        <div className="flex justify-center gap-2">
          {MAO.map((c) => (
            <PlayingCard key={c} carta={c} destaque={atual.destaque.includes(c)} />
          ))}
        </div>
      </div>

      {/* Texto de cada fase: todos no HTML (o Google lê), só o atual à vista */}
      <div aria-live="polite">
        {ETAPAS.map((e, i) => (
          <div key={e.nome} hidden={i !== etapa}>
            <h3 className="text-lg font-semibold text-foreground">{e.titulo}</h3>
            <p className="mt-2 text-body-sm leading-relaxed text-muted-foreground">{e.texto}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={() => setEtapa((e) => e - 1)} disabled={etapa === 0}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
        </Button>
        <span className="text-xs tabular-nums text-muted-foreground">
          {etapa + 1} de {ETAPAS.length}
        </span>
        <Button size="sm" onClick={() => setEtapa((e) => (e + 1) % ETAPAS.length)}>
          {etapa === ETAPAS.length - 1 ? 'Recomeçar' : 'Próxima'} <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
