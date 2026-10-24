// Trilha de aprendizado do app: a estrutura de um torneio. Cada nível é um
// tema, cada ficha uma lição de 10 mãos num spot fixo, e a mesa final do nível
// mistura tudo o que ele ensinou.
//
// Fica de fora o que não está pronto para ser ensinado sozinho: vs 3-bet (a
// range tem buraco conhecido, ver CLAUDE-conteudo.md) e os modos e cenários de
// apoiador (Bounty, Simulação, Multiway), para a trilha ser toda grátis.
//
// O id de cada lição é a chave do progresso guardado: não renomear.

import type { Position, Scenario } from '@/data/gtoRanges';
import type { TrainingMode } from '@/lib/sorteioDeMao';

/** Um spot montado de antemão (lição da trilha): o treino abre direto nele */
export interface Preset {
  modo: TrainingMode;
  /** Mais de um cenário: cada mão sorteia entre eles */
  cenarios: Scenario[];
  posicoes: Position[];
  stacks: number[];
}

export interface Licao extends Preset {
  id: string;
  titulo: string;
  /** Uma frase: o que a lição treina e por quê */
  resumo: string;
  /** Texto curto que vai na ficha */
  rotulo: string;
  /** Revisão que fecha o nível */
  mesaFinal?: boolean;
}

export type PoseDoRei = 'explicando' | 'surpreso' | 'pensando' | 'errou' | 'inteiro' | 'confiante' | 'acertou';

/** Ilustração do cabeçalho do nível (public/trilha/<nome>.webp) */
export type Ilustracao = 'pilha-alta' | 'pilha-dupla' | 'pilha-allin' | 'ficha-azul' | 'ficha-laranja' | 'ficha-verde';

/** Cor do nível: os mesmos tokens das posições da mesa */
export type CorDoNivel = 'late' | 'blinds' | 'middle' | 'early' | 'primary';

/** Variável de cor (em index.css) de cada nível */
export const VAR_DA_COR: Record<CorDoNivel, string> = {
  late: 'var(--poker-late)',
  blinds: 'var(--poker-blinds)',
  middle: 'var(--poker-middle)',
  early: 'var(--poker-early)',
  primary: 'var(--primary)',
};

export interface Nivel {
  id: string;
  numero: number;
  titulo: string;
  descricao: string;
  cor: CorDoNivel;
  /** Pose do rei ao lado do nível (public/mascote/rei-<pose>.webp). Nível fechado: acertou */
  rei: PoseDoRei;
  ilustracao: Ilustracao;
  licoes: Licao[];
}

const FUNDO: number[] = [30, 40, 50, 60];

export const NIVEIS: Nivel[] = [
  {
    id: 'abrir',
    numero: 1,
    titulo: 'Abrir o pote',
    descricao: 'Ninguém entrou ainda. Quais mãos merecem a primeira aposta, de cada lugar da mesa.',
    cor: 'late',
    rei: 'explicando',
    ilustracao: 'pilha-alta',
    licoes: [
      { id: 'abrir-btn', titulo: 'Abrir do botão', resumo: 'Você fala por último depois do flop: é de onde mais se abre.', modo: 'rangeTraining', cenarios: ['openRaise'], posicoes: ['BTN'], stacks: FUNDO, rotulo: 'BTN' },
      { id: 'abrir-co', titulo: 'Abrir do cutoff', resumo: 'Um lugar antes do botão. Ainda abre bastante, um pouco menos.', modo: 'rangeTraining', cenarios: ['openRaise'], posicoes: ['CO'], stacks: FUNDO, rotulo: 'CO' },
      { id: 'abrir-hj', titulo: 'Abrir do hijack', resumo: 'Meio da mesa: quatro jogadores falam depois de você e a range fecha.', modo: 'rangeTraining', cenarios: ['openRaise'], posicoes: ['HJ', 'LJ'], stacks: FUNDO, rotulo: 'HJ' },
      { id: 'abrir-cedo', titulo: 'Começo da mesa', resumo: 'UTG e UTG+1: a mesa inteira ainda fala depois. A range mais apertada.', modo: 'rangeTraining', cenarios: ['openRaise'], posicoes: ['UTG', 'UTG1'], stacks: FUNDO, rotulo: 'UTG' },
      { id: 'abrir-sb', titulo: 'Small blind', resumo: 'Só o big blind depois de você, mas você joga o resto da mão fora de posição.', modo: 'rangeTraining', cenarios: ['openRaise'], posicoes: ['SB'], stacks: FUNDO, rotulo: 'SB' },
      { id: 'abrir-final', titulo: 'Mesa final: abrir o pote', resumo: 'Todas as posições misturadas. Prova de que a escala ficou.', modo: 'rangeTraining', cenarios: ['openRaise'], posicoes: ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB'], stacks: FUNDO, rotulo: 'Final', mesaFinal: true },
    ],
  },
  {
    id: 'curto',
    numero: 2,
    titulo: 'Stack curto',
    descricao: 'Com pouca ficha a decisão muda: abrir pequeno, ir de all-in ou largar a mão.',
    cor: 'early',
    rei: 'surpreso',
    ilustracao: 'pilha-dupla',
    licoes: [
      { id: 'curto-btn', titulo: 'Botão com 10 BB', resumo: 'Dez big blinds no botão: a posição que mais rouba os blinds.', modo: 'rangeTraining', cenarios: ['openRaise'], posicoes: ['BTN'], stacks: [10], rotulo: '10BB' },
      { id: 'curto-co', titulo: 'Cutoff com 12 BB', resumo: 'Um pouco mais de ficha e dois jogadores a mais para passar.', modo: 'rangeTraining', cenarios: ['openRaise'], posicoes: ['CO'], stacks: [12], rotulo: '12BB' },
      { id: 'curto-sb', titulo: 'Small blind com 8 BB', resumo: 'Só o big blind para enfrentar e quase nenhuma ficha: a range abre muito.', modo: 'rangeTraining', cenarios: ['openRaise'], posicoes: ['SB'], stacks: [8, 9], rotulo: '8BB' },
      { id: 'curto-cedo', titulo: 'Começo da mesa com 14 BB', resumo: 'Stack curto, mas com a mesa inteira atrás: cuidado com o que entra.', modo: 'rangeTraining', cenarios: ['openRaise'], posicoes: ['UTG', 'UTG1', 'LJ'], stacks: [14], rotulo: '14BB' },
      { id: 'curto-final', titulo: 'Mesa final: stack curto', resumo: 'De 8 a 14 BB, de qualquer posição.', modo: 'rangeTraining', cenarios: ['openRaise'], posicoes: ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB'], stacks: [8, 9, 10, 12, 14], rotulo: 'Final', mesaFinal: true },
    ],
  },
  {
    id: 'responder',
    numero: 3,
    titulo: 'Responder a uma abertura',
    descricao: 'Alguém abriu antes de você. Pagar, aumentar ou largar.',
    cor: 'blinds',
    rei: 'pensando',
    ilustracao: 'ficha-azul',
    licoes: [
      { id: 'responder-bb', titulo: 'Big blind defende', resumo: 'Você já pôs 1 BB no pote e é o último a decidir: paga com mais mãos.', modo: 'rangeTraining', cenarios: ['vsOpenRaise'], posicoes: ['BB'], stacks: [30, 40], rotulo: 'BB' },
      { id: 'responder-btn', titulo: 'Botão contra abertura', resumo: 'Com posição sobre quem abriu, dá para jogar mais mãos.', modo: 'rangeTraining', cenarios: ['vsOpenRaise'], posicoes: ['BTN'], stacks: [30, 40], rotulo: 'BTN' },
      { id: 'responder-sb', titulo: 'Small blind contra abertura', resumo: 'Fora de posição e com o big blind ainda para falar.', modo: 'rangeTraining', cenarios: ['vsOpenRaise'], posicoes: ['SB'], stacks: [30, 40], rotulo: 'SB' },
      { id: 'responder-meio', titulo: 'Meio da mesa', resumo: 'Hijack e cutoff contra quem abriu antes: tem gente atrás de você.', modo: 'rangeTraining', cenarios: ['vsOpenRaise'], posicoes: ['HJ', 'CO'], stacks: [30, 40], rotulo: 'CO' },
      { id: 'responder-final', titulo: 'Mesa final: responder', resumo: 'Qualquer posição contra qualquer abertura.', modo: 'rangeTraining', cenarios: ['vsOpenRaise'], posicoes: ['UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'], stacks: [25, 30, 40], rotulo: 'Final', mesaFinal: true },
    ],
  },
  {
    id: 'allin',
    numero: 4,
    titulo: 'Contra o all-in',
    descricao: 'Alguém empurrou tudo. Quais mãos pagam, de acordo com o stack e a posição.',
    cor: 'middle',
    // Mão na testa diante do all-in
    rei: 'errou',
    ilustracao: 'pilha-allin',
    licoes: [
      { id: 'allin-bb', titulo: 'Big blind contra all-in', resumo: 'Você já tem 1 BB no pote e ninguém fala depois: paga mais largo.', modo: 'rangeTraining', cenarios: ['vsOpenShove'], posicoes: ['BB'], stacks: [10, 12], rotulo: 'BB' },
      { id: 'allin-sb', titulo: 'Small blind contra all-in', resumo: 'O big blind ainda fala depois de você: pague com mais cuidado.', modo: 'rangeTraining', cenarios: ['vsOpenShove'], posicoes: ['SB'], stacks: [10, 12], rotulo: 'SB' },
      { id: 'allin-btn', titulo: 'Botão contra all-in', resumo: 'Os dois blinds ainda atrás de você.', modo: 'rangeTraining', cenarios: ['vsOpenShove'], posicoes: ['BTN'], stacks: [10, 14], rotulo: 'BTN' },
      { id: 'allin-final', titulo: 'Mesa final: contra o all-in', resumo: 'Posições e stacks misturados, de 8 a 14 BB.', modo: 'rangeTraining', cenarios: ['vsOpenShove'], posicoes: ['UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'], stacks: [8, 10, 12, 14], rotulo: 'Final', mesaFinal: true },
    ],
  },
  {
    id: 'tres',
    numero: 5,
    titulo: 'Três na mesa',
    descricao: 'Fim de torneio, só três jogadores: as ranges abrem e os blinds pesam.',
    cor: 'primary',
    rei: 'inteiro',
    ilustracao: 'ficha-laranja',
    licoes: [
      { id: 'tres-btn', titulo: 'Botão abre', resumo: 'Com três na mesa, o botão é o primeiro a falar.', modo: 'threeHand', cenarios: ['openRaise'], posicoes: ['BTN'], stacks: [17, 20, 25], rotulo: 'BTN' },
      { id: 'tres-sb', titulo: 'Small blind contra o botão', resumo: 'O botão abriu e o big blind ainda fala.', modo: 'threeHand', cenarios: ['vsOpenRaise'], posicoes: ['SB'], stacks: [20, 25], rotulo: 'SB' },
      { id: 'tres-bb', titulo: 'Big blind defende', resumo: 'Último a falar, contra uma abertura de quem quer roubar.', modo: 'threeHand', cenarios: ['vsOpenRaise'], posicoes: ['BB'], stacks: [20, 25], rotulo: 'BB' },
      { id: 'tres-final', titulo: 'Mesa final: três na mesa', resumo: 'Abrir e responder, de qualquer lugar.', modo: 'threeHand', cenarios: ['openRaise', 'vsOpenRaise'], posicoes: ['BTN', 'SB', 'BB'], stacks: [17, 20, 25], rotulo: 'Final', mesaFinal: true },
    ],
  },
  {
    id: 'hu',
    numero: 6,
    titulo: 'Heads-up',
    descricao: 'Só você e um oponente. Quase toda mão vale alguma coisa.',
    cor: 'late',
    rei: 'confiante',
    ilustracao: 'ficha-verde',
    licoes: [
      { id: 'hu-sb', titulo: 'Abrir no heads-up', resumo: 'No heads-up o small blind é o botão: abre a maior parte das mãos.', modo: 'hu', cenarios: ['openRaise'], posicoes: ['SB'], stacks: [20, 25, 30], rotulo: 'SB' },
      { id: 'hu-bb', titulo: 'Defender no heads-up', resumo: 'O big blind contra uma abertura que pode ser quase qualquer coisa.', modo: 'hu', cenarios: ['vsOpenRaise'], posicoes: ['BB'], stacks: [20, 25, 30], rotulo: 'BB' },
      { id: 'hu-allin', titulo: 'Pagar o all-in no heads-up', resumo: 'Ele empurrou tudo: com dois na mesa, você paga bem mais do que imagina.', modo: 'hu', cenarios: ['vsOpenShove'], posicoes: ['BB'], stacks: [8, 10, 12], rotulo: 'All-in' },
      { id: 'hu-final', titulo: 'Mesa final: heads-up', resumo: 'Abrir, defender e pagar all-in, tudo misturado.', modo: 'hu', cenarios: ['openRaise', 'vsOpenRaise', 'vsOpenShove'], posicoes: ['SB', 'BB'], stacks: [10, 12, 20, 25], rotulo: 'Final', mesaFinal: true },
    ],
  },
];

export const LICOES: Licao[] = NIVEIS.flatMap((n) => n.licoes);

const COR_DA_POSICAO: Record<Position, string> = {
  UTG: 'vermelho', UTG1: 'vermelho', LJ: 'vermelho', HJ: 'laranja', CO: 'verde', BTN: 'verde', SB: 'azul', BB: 'azul',
};

/**
 * Onde fica o miolo de cada ficha, medido no anel tracejado da arte: centro
 * (em % da imagem), quanto a face achata na perspectiva e para que lado ela
 * está inclinada. Cada ficha saiu do gerador num ângulo diferente, então o
 * centro da imagem não serve: o rótulo ficava torto e fora do miolo.
 */
export interface FaceDaFicha {
  largura: number;
  altura: number;
  cx: number;
  cy: number;
  /** Eixo menor / eixo maior do anel */
  achatamento: number;
  /** Giro do eixo maior, em graus (sentido horário) */
  giro: number;
}

const FACES: Record<string, FaceDaFicha> = {
  '/trilha/ficha-verde.webp': { largura: 320, altura: 307, cx: 50.7, cy: 47.5, achatamento: 0.9, giro: 21 },
  '/trilha/ficha-laranja.webp': { largura: 319, altura: 320, cx: 48.1, cy: 47, achatamento: 0.85, giro: -42 },
  '/trilha/ficha-vermelho.webp': { largura: 320, altura: 295, cx: 48.2, cy: 46.4, achatamento: 0.81, giro: -28 },
  '/trilha/ficha-azul.webp': { largura: 320, altura: 311, cx: 47.8, cy: 46.9, achatamento: 0.8, giro: -39 },
  '/trilha/ficha-cinza.webp': { largura: 320, altura: 307, cx: 48.1, cy: 46.9, achatamento: 0.84, giro: -33 },
  '/trilha/ficha-final.webp': { largura: 360, altura: 353, cx: 50, cy: 47, achatamento: 1, giro: 0 },
};

const FACE_PADRAO: FaceDaFicha = { largura: 320, altura: 310, cx: 50, cy: 47, achatamento: 1, giro: 0 };

export const faceDaFicha = (src: string): FaceDaFicha => FACES[src] ?? FACE_PADRAO;

/** Imagens com o miolo medido (o teste confere que toda ficha da trilha tem) */
export const temFaceMedida = (src: string) => src in FACES;

/**
 * Imagem da ficha da lição (public/trilha): a cor da posição que ela treina,
 * a mesma das posições na mesa. Mesa final é a ficha dourada com o Rei;
 * bloqueada, a cinza.
 */
export function fichaDaLicao(licao: Licao, bloqueada: boolean): string {
  if (bloqueada) return '/trilha/ficha-cinza.webp';
  if (licao.mesaFinal) return '/trilha/ficha-final.webp';
  return `/trilha/ficha-${COR_DA_POSICAO[licao.posicoes[0]]}.webp`;
}

export function licaoPorId(id: string | null | undefined): Licao | null {
  return (id && LICOES.find((l) => l.id === id)) || null;
}

export function nivelDaLicao(id: string): Nivel | undefined {
  return NIVEIS.find((n) => n.licoes.some((l) => l.id === id));
}
