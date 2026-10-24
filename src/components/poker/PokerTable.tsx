import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { carregarGsap, type Gsap } from '@/lib/motion';
import { Position, POSITIONS } from '@/data/gtoRanges';
import { PlayerSeat, getPositionColor } from './PlayerSeat';
import { PlayerBet } from './ChipStack';
import { CommunityCards } from './CommunityCards';
import { CardType } from './PlayingCard';

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
  /** Última jogada dele, inclusive call e check (o villainAction só cobre aposta) */
  lastVillainAction?: string;
  /** Cartas do vilão abertas no fim da mão, mesmo sem showdown */
  villainCardsRevealed?: boolean;
  /** O vilão desistiu: as cartas dele são jogadas na mesa */
  villainMucked?: boolean;
  /** Adversários além do principal, no pote multiway da simulação */
  extraOpponents?: { position: Position; cards: CardType[]; stack: number; folded: boolean }[];
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
// Na metade de cima as cartas viradas do vilão ficam embaixo do assento, entre
// ele e a aposta; e o assento do topo encosta na borda, com a mesa achatada.
// Com o raio normal as fichas colavam nas cartas ou na base do assento.
const ehTopo = (angulo: number) => Math.sin(angulo) < -0.8;
const raioAposta = (angulo: number) => (ehTopo(angulo) ? 26 : Math.sin(angulo) < 0 ? 28 : RAIO_APOSTA);
const RAIO_BOTAO = 37;
// Desloca o botao do dealer de lado: em cima do mesmo raio ele cobria a aposta
const DESVIO_BOTAO = 0.2;
// Menor raio a que a aposta ou o botão podem recuar: abaixo disso caem no pote
const RAIO_MINIMO = 14;
// Folga, em px, entre o assento (com as cartas) e o que fica na frente dele
const FOLGA = 3;

type Retangulo = { l: number; t: number; r: number; b: number };

function retanguloEm(no: Element, origem: DOMRect, folga = 0): Retangulo {
  const r = no.getBoundingClientRect();
  return {
    l: r.left - origem.left - folga,
    t: r.top - origem.top - folga,
    r: r.right - origem.left + folga,
    b: r.bottom - origem.top + folga,
  };
}

/**
 * Raio em que um objeto de largura w e altura h, centrado no ângulo dado, sai
 * de cima de todos os retângulos. Parte do raio preferido e recua para o centro.
 *
 * O raio fixo em % só funciona com a mesa larga: no celular ela tem ~330 px e o
 * assento, com as cartas embaixo, ocupa quase o caminho todo até a aposta. As
 * fichas caíam em cima das cartas do vilão e o valor apostado pelo herói ficava
 * atrás do próprio assento.
 */
function raioLivre(angulo: number, preferido: number, w: number, h: number, caixa: DOMRect, obstaculos: Retangulo[]) {
  // Sem lugar totalmente livre (pós-flop, com as cinco cartas no meio), fica no
  // raio que cobre menos área
  let melhor = { raio: preferido, area: Infinity };
  for (let raio = preferido; raio >= RAIO_MINIMO; raio -= 0.5) {
    const cx = (0.5 + (Math.cos(angulo) * raio) / 100) * caixa.width;
    const cy = (0.5 + (Math.sin(angulo) * raio) / 100) * caixa.height;
    const area = obstaculos.reduce((soma, o) => {
      const dx = Math.min(cx + w / 2, o.r) - Math.max(cx - w / 2, o.l);
      const dy = Math.min(cy + h / 2, o.b) - Math.max(cy - h / 2, o.t);
      return soma + (dx > 0 && dy > 0 ? dx * dy : 0);
    }, 0);
    if (area === 0) return raio;
    if (area < melhor.area) melhor = { raio, area };
  }
  return melhor.raio;
}

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

function emBB(valor: number) {
  return `${valor.toFixed(valor % 1 !== 0 ? 1 : 0)} BB`;
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
  lastVillainAction,
  villainCardsRevealed,
  villainMucked,
  extraOpponents,
  communityCards = [],
  street = 'preflop',
  foldedPositions = [],
  activeBets = [],
  bounties,
  playerStacks,
  visiblePositions,
  className
}: PokerTableProps) {

  const visiveis = visiblePositions?.length ? visiblePositions : POSITIONS;
  const angulos = anguloDosAssentos(visiveis, heroPosition);
  const mesaCheia = visiveis.length >= 7;

  /* ----------------------------------------------------------------------
     Movimento da mesa. O GSAP entra por import dinâmico e quem pediu menos
     movimento no sistema não chega nem a baixá-lo: nesse caso gsap fica null
     e tudo abaixo simplesmente não roda. A mesa continua correta parada —
     nenhuma informação depende da animação para aparecer.
     ---------------------------------------------------------------------- */
  const mesaRef = useRef<HTMLDivElement>(null);
  const poteRef = useRef<HTMLDivElement>(null);
  const valorDoPoteRef = useRef<HTMLSpanElement>(null);
  const apostaRefs = useRef(new Map<Position, HTMLDivElement | null>());
  const varreduraRefs = useRef<HTMLDivElement[]>([]);
  const assentoRefs = useRef(new Map<Position, HTMLDivElement | null>());
  const centroRef = useRef<HTMLDivElement>(null);
  const gsapRef = useRef<Gsap | null>(null);
  const angulosRef = useRef(angulos);
  angulosRef.current = angulos;

  const poteAnterior = useRef(pot);
  const tweenDoPote = useRef<gsap.core.Tween | null>(null);
  const apostasAnteriores = useRef(new Map<Position, number>());
  const cartasAnteriores = useRef(0);
  const [varrendo, setVarrendo] = useState<{ position: Position; amount: number }[]>([]);

  // Raios medidos na tela (aposta por posição e botão do dealer). Até a
  // primeira medida vale o raio fixo; as animações leem pelo ref.
  const [raios, setRaios] = useState<{ aposta: Partial<Record<Position, number>>; botao?: number }>({ aposta: {} });
  const raiosRef = useRef(raios);
  raiosRef.current = raios;
  const raioDaAposta = (pos: Position, angulo: number) => raiosRef.current.aposta[pos] ?? raioAposta(angulo);

  useEffect(() => {
    let vivo = true;
    carregarGsap()
      ?.then((gsap) => {
        if (vivo) gsapRef.current = gsap;
      })
      ?.catch(() => {
        // Sem animação a mesa segue igual, só sem movimento
      });
    return () => {
      vivo = false;
      tweenDoPote.current?.kill();
    };
  }, []);

  // Em px, o quanto vai do assento até o lugar da aposta naquele ângulo
  const deslocamento = (angulo: number, doRaio: number, paraRaio: number) => {
    const caixa = mesaRef.current?.getBoundingClientRect();
    if (!caixa) return { x: 0, y: 0 };
    return {
      x: Math.cos(angulo) * ((doRaio - paraRaio) / 100) * caixa.width,
      y: Math.sin(angulo) * ((doRaio - paraRaio) / 100) * caixa.height
    };
  };

  // Vilão desistiu: as cartas dele saem do assento e caem no centro da mesa,
  // como quem joga a mão fora.
  useEffect(() => {
    const gsap = gsapRef.current;
    if (!gsap || !villainPosition) return;

    const assento = assentoRefs.current.get(villainPosition);
    const cartas = assento?.querySelector<HTMLElement>('[data-cartas]');
    if (!cartas) return;

    // Mão nova: devolve as cartas ao lugar
    if (!villainMucked) {
      if (cartas.dataset.mucado) {
        delete cartas.dataset.mucado;
        gsap.set(cartas, { clearProps: 'all' });
      }
      return;
    }

    // A marca fica no próprio elemento, não num ref: o StrictMode chama este
    // efeito duas vezes em desenvolvimento, e o ref ainda guardava o valor da
    // mão anterior — com isso a animação nunca chegava a rodar.
    if (cartas.dataset.mucado) return;

    const angulo = angulosRef.current.get(villainPosition);
    if (angulo === undefined) return;

    // Marcar só depois de ter tudo o que a animação precisa: marcando antes,
    // uma saída antecipada gravava "já animei" numa carta que ficou parada.
    cartas.dataset.mucado = '1';
    const { x, y } = deslocamento(angulo, RAIO_ASSENTO, 0);
    gsap.to(cartas, {
      x: -x, y: -y,
      rotate: gsap.utils.random(-28, 28),
      scale: 0.72,
      opacity: 0.3,
      duration: 0.55,
      ease: 'power2.in',
    });
  }, [villainMucked, villainPosition]);

  // O pote cresce contando, em vez de pular de um número para outro
  useEffect(() => {
    const gsap = gsapRef.current;
    const de = poteAnterior.current;
    poteAnterior.current = pot;
    if (!gsap || pot <= de || !valorDoPoteRef.current) return;

    // Duas subidas de pote em sequência rápida (aposta e reraise) deixavam dois
    // tweens escrevendo no mesmo texto, e o que terminasse por último gravava o
    // valor antigo. Mata o anterior antes de começar o próximo.
    tweenDoPote.current?.kill();
    const contador = { valor: de };
    tweenDoPote.current = gsap.to(contador, {
      valor: pot,
      duration: 0.4,
      ease: 'power2.out',
      onUpdate: () => {
        if (valorDoPoteRef.current) valorDoPoteRef.current.textContent = emBB(contador.valor);
      },
      onComplete: () => {
        if (valorDoPoteRef.current) valorDoPoteRef.current.textContent = emBB(pot);
      }
    });
    if (poteRef.current) {
      gsap.fromTo(poteRef.current, { scale: 1.14 }, { scale: 1, duration: 0.4, ease: 'back.out(2)' });
    }
  }, [pot]);

  // Aposta nova entra empurrada pelo jogador; aposta que sai vira varredura
  const chaveDasApostas = activeBets.map((b) => `${b.position}:${b.amount}`).join('|');
  useEffect(() => {
    const gsap = gsapRef.current;
    const atuais = new Map(activeBets.map((b) => [b.position, b.amount]));
    const anteriores = apostasAnteriores.current;
    apostasAnteriores.current = atuais;

    if (!gsap) return;

    atuais.forEach((valor, pos) => {
      if (anteriores.get(pos) === valor) return;
      const elemento = apostaRefs.current.get(pos);
      const angulo = angulosRef.current.get(pos);
      if (!elemento || angulo === undefined) return;
      const { x, y } = deslocamento(angulo, RAIO_ASSENTO, raioDaAposta(pos, angulo));
      gsap.from(elemento, { x, y, scale: 0.7, opacity: 0, duration: 0.28, ease: 'power2.out' });
    });

    const sumiram = [...anteriores.entries()]
      .filter(([pos]) => !atuais.has(pos))
      .map(([position, amount]) => ({ position, amount }));
    if (sumiram.length > 0) {
      // Sem limpar, sobrariam nós da varredura anterior, já fora da tela
      varreduraRefs.current = [];
      setVarrendo(sumiram);
    }
  }, [chaveDasApostas]);

  // Mede assentos e fichas e acha, para cada aposta e para o botão do dealer,
  // o raio em que não ficam em cima do assento nem das cartas do jogador
  const chaveDosAssentos = visiveis.join(',');
  const qtdCartasDoVilao = villainCards?.length ?? 0;
  const qtdExtras = extraOpponents?.length ?? 0;
  useLayoutEffect(() => {
    const mesa = mesaRef.current;
    if (!mesa) return;

    const medir = () => {
      const caixa = mesa.getBoundingClientRect();
      if (caixa.width === 0) return;

      const pegadas = new Map<Position, Retangulo>();
      assentoRefs.current.forEach((no, pos) => {
        if (no) pegadas.set(pos, retanguloEm(no, caixa, FOLGA));
      });

      // Pote e cartas comunitárias, no meio: a aposta também não pode cobri-los
      const centro = centroRef.current;
      const meio = centro && centro.offsetWidth > 0 ? [retanguloEm(centro, caixa, FOLGA)] : [];

      const aposta: Partial<Record<Position, number>> = {};
      const fichas = new Map<Position, { w: number; h: number }>();
      angulosRef.current.forEach((angulo, pos) => {
        const pegada = pegadas.get(pos);
        if (!pegada) return;
        // offsetWidth, não o retângulo na tela: a ficha entra animada (escala
        // 0,7) e, medida no meio da animação, parecia menor do que é
        const ficha = apostaRefs.current.get(pos);
        const tamanho = { w: ficha?.offsetWidth || 76, h: ficha?.offsetHeight || 20 };
        fichas.set(pos, tamanho);
        aposta[pos] = raioLivre(angulo, raioAposta(angulo), tamanho.w, tamanho.h, caixa, [pegada, ...meio]);
      });

      // O botão foge do assento de quem o tem e da aposta dele
      let botao: number | undefined;
      const assentos = chaveDosAssentos.split(',') as Position[];
      const dono = assentos.includes('BTN') ? 'BTN' : assentos.includes('SB') ? 'SB' : undefined;
      const anguloDono = dono ? angulosRef.current.get(dono) : undefined;
      const pegadaDono = dono ? pegadas.get(dono) : undefined;
      if (dono && anguloDono !== undefined && pegadaDono) {
        const obstaculos = [pegadaDono, ...meio];
        const raioDaFicha = aposta[dono];
        const ficha = fichas.get(dono);
        if (apostaRefs.current.get(dono) && raioDaFicha !== undefined && ficha) {
          const cx = (0.5 + (Math.cos(anguloDono) * raioDaFicha) / 100) * caixa.width;
          const cy = (0.5 + (Math.sin(anguloDono) * raioDaFicha) / 100) * caixa.height;
          obstaculos.push({
            l: cx - ficha.w / 2 - FOLGA,
            t: cy - ficha.h / 2 - FOLGA,
            r: cx + ficha.w / 2 + FOLGA,
            b: cy + ficha.h / 2 + FOLGA,
          });
        }
        botao = raioLivre(anguloDono + DESVIO_BOTAO, RAIO_BOTAO, 20, 20, caixa, obstaculos);
      }

      const novo = { aposta, botao };
      setRaios((antes) => (JSON.stringify(antes) === JSON.stringify(novo) ? antes : novo));
    };

    medir();
    const observador = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
    observador?.observe(mesa);
    return () => observador?.disconnect();
  }, [chaveDosAssentos, heroPosition, villainPosition, qtdCartasDoVilao, qtdExtras, chaveDasApostas, mesaCheia, pot, communityCards.length]);

  // As fichas que saíram da frente dos jogadores caem no pote
  useEffect(() => {
    const gsap = gsapRef.current;
    const nos = varreduraRefs.current.filter(Boolean);
    if (varrendo.length === 0) return;
    if (!gsap || nos.length === 0) {
      setVarrendo([]);
      return;
    }

    // Da aposta até o centro, para cada ficha que está sendo varrida
    const ateOPote = (i: number) => {
      const angulo = angulosRef.current.get(varrendo[i].position) ?? 0;
      return deslocamento(angulo, raioDaAposta(varrendo[i].position, angulo), 0);
    };
    gsap.to(nos, {
      x: (i: number) => -ateOPote(i).x,
      y: (i: number) => -ateOPote(i).y,
      scale: 0.45,
      opacity: 0,
      duration: 0.42,
      ease: 'power2.in',
      onComplete: () => setVarrendo([])
    });
  }, [varrendo]);

  // Carta comunitária nova cai na mesa; as que já estavam ficam quietas
  useEffect(() => {
    const gsap = gsapRef.current;
    const nos = mesaRef.current?.querySelectorAll<HTMLElement>('[data-carta-comunitaria]');
    const total = nos?.length ?? 0;
    const novas = nos ? [...nos].slice(cartasAnteriores.current) : [];
    cartasAnteriores.current = total;
    if (!gsap || novas.length === 0) return;

    gsap.from(novas, {
      y: -20,
      scale: 0.72,
      opacity: 0,
      rotate: -7,
      duration: 0.34,
      stagger: 0.07,
      ease: 'back.out(1.4)'
    });
  }, [street, communityCards.length]);

  // Em heads-up quem tem o botão é o SB
  const posicaoDoBotao = visiveis.includes('BTN') ? 'BTN' : visiveis.includes('SB') ? 'SB' : undefined;
  const anguloDoBotao = posicaoDoBotao ? angulos.get(posicaoDoBotao) : undefined;

  const mostrarComunitarias = street !== 'preflop' && communityCards.length > 0;

  return (
    <div className={cn('flex flex-col items-center gap-2 sm:gap-4', className)}>
      {/* mt: o assento do topo passa um pouco da borda da mesa; sem folga, encostava na barra de progresso */}
      <div ref={mesaRef} className="relative mx-auto mt-3 aspect-[2/1] w-full max-w-2xl px-6 sm:mt-4 sm:px-8">
        {/* Feltro */}
        <div className="absolute inset-x-6 inset-y-3 overflow-hidden rounded-[50%] border-[6px] border-[hsl(var(--table-border))] table-felt shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] sm:inset-x-8 sm:inset-y-4">
          {/* Fio dourado interno, no lugar da borda marrom que destoava do resto do site */}
          <div className="pointer-events-none absolute inset-2 rounded-[50%] border border-primary/20" />
          <div className="pointer-events-none absolute inset-0 rounded-[50%] shadow-[inset_0_0_60px_rgba(0,0,0,0.55)]" />

          {/* O rei (mascote) no centro do feltro, como marca d'água. Só enfeite:
              a marca antiga era um botão para a página inicial, e um clique sem
              querer no meio da mesa tirava a pessoa do treino. */}
          <img
            src="/mascote/rei-pensando.webp"
            alt=""
            aria-hidden="true"
            width={346}
            height={397}
            decoding="async"
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[42%] w-auto -translate-x-1/2 -translate-y-1/2 select-none opacity-[0.16]"
          />
        </div>

        {/* Cartas comunitárias e pote, empilhados no centro */}
        <div ref={centroRef} className="pointer-events-none absolute left-1/2 top-1/2 z-[5] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5">
          {mostrarComunitarias && <CommunityCards cards={communityCards} street={street} />}
          {pot > 0 && (
            <div
              ref={poteRef}
              className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-black/70 px-3 py-1 shadow-lg backdrop-blur-sm"
            >
              <span className="flex -space-x-1">
                <span className="h-2.5 w-2.5 rounded-full border border-red-700 bg-red-500" />
                <span className="h-2.5 w-2.5 rounded-full border border-green-700 bg-green-500" />
                <span className="h-2.5 w-2.5 rounded-full border border-blue-600 bg-blue-400" />
              </span>
              <span
                ref={valorDoPoteRef}
                className="whitespace-nowrap text-xs font-bold text-primary tabular-nums sm:text-sm"
              >
                {emBB(pot)}
              </span>
            </div>
          )}
        </div>

        {/* Botão do dealer */}
        {anguloDoBotao !== undefined && (
          <div
            className="absolute z-[6] -translate-x-1/2 -translate-y-1/2"
            style={pontoNaElipse(anguloDoBotao + DESVIO_BOTAO, raios.botao ?? RAIO_BOTAO)}
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
              ref={(no) => apostaRefs.current.set(bet.position, no)}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={pontoNaElipse(angulos.get(bet.position)!, raioDaAposta(bet.position, angulos.get(bet.position)!))}
            >
              <PlayerBet amount={bet.amount} />
            </div>
          ))}

        {/* Fichas que saíram da frente dos jogadores, a caminho do pote */}
        {varrendo
          .filter((bet) => angulos.has(bet.position))
          .map((bet, i) => (
            <div
              key={`varrendo-${bet.position}`}
              data-varredura
              ref={(no) => {
                if (no) varreduraRefs.current[i] = no;
              }}
              className="pointer-events-none absolute z-[9] -translate-x-1/2 -translate-y-1/2"
              style={pontoNaElipse(angulos.get(bet.position)!, raioDaAposta(bet.position, angulos.get(bet.position)!))}
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

          const extra = extraOpponents?.find((o) => o.position === pos);

          let cardsToShow: CardType[] | undefined;
          let shouldShowCards = false;
          if (isHero && heroCards && heroCards.length > 0) {
            cardsToShow = heroCards;
            shouldShowCards = true;
          } else if (isVillain && villainCards && villainCards.length > 0) {
            cardsToShow = villainCards;
            // No fim da mão as cartas dele abrem mesmo sem showdown: saber o que
            // ele tinha quando desistiu é metade do aprendizado do pós-flop.
            shouldShowCards = street === 'showdown' || !!villainCardsRevealed;
          } else if (extra && !extra.folded && extra.cards.length > 0) {
            // No pote multiway o terceiro também abre as cartas no showdown:
            // ele disputa o pote como qualquer um.
            cardsToShow = extra.cards;
            shouldShowCards = street === 'showdown';
          }

          let stackToShow: number | undefined;
          if (isHero) {
            stackToShow = heroStack;
          } else if (isVillain && villainStack) {
            stackToShow = villainStack;
          } else if (extra) {
            stackToShow = extra.stack;
          } else if (playerStacks && playerStacks[pos]) {
            stackToShow = playerStacks[pos];
          }
          // Aposta na frente do tamanho do stack: ele não tem mais nada atrás
          const aposta = activeBets.find((b) => b.position === pos)?.amount;
          const allIn = stackToShow !== undefined && aposta !== undefined && aposta >= stackToShow;

          return (
            <div
              key={pos}
              ref={(no) => assentoRefs.current.set(pos, no)}
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
                allIn={allIn}
                showCards={shouldShowCards}
                half={Math.sin(angulo) < 0 ? 'top' : 'bottom'}
                noTopo={ehTopo(angulo)}
                // O villainAction só existe quando ele aposta ou aumenta. Sem o
                // segundo caso, pagar e dar check não apareciam na mesa.
                lastAction={
                  isVillain
                    ? villainAction ?? (lastVillainAction ? { action: lastVillainAction } : undefined)
                    : undefined
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
