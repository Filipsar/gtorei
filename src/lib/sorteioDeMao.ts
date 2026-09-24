import { POSITIONS, STACK_SIZES, Position, Scenario } from '@/data/gtoRanges';

/**
 * Quem pode jogar o quê, e como se sorteia a configuração de uma mão.
 *
 * Isto morava dentro da TrainPage, onde não dava para testar. E é justamente
 * aqui que estão as combinações impossíveis: vs 3bet no heads-up não tem
 * posição nenhuma que sirva, porque o herói precisaria de alguém antes e
 * alguém depois, e no 1x1 não existem os dois ao mesmo tempo. Sorteando às
 * cegas, uma hora sai essa combinação e a mão nasce sem herói.
 */

export type TrainingMode = 'rangeTraining' | 'hu' | 'threeHand' | 'bounty';

/** O que dá para escolher na tela: os modos e mais o sorteio entre eles. */
export type ModeChoice = TrainingMode | 'random';

/** Modos liberados só para quem apoia o projeto */
export const MODOS_APOIADOR: ModeChoice[] = ['bounty', 'random'];

/** Cenários liberados só para quem apoia o projeto */
export const CENARIOS_APOIADOR: Scenario[] = ['multiway', 'simulation'];

/** De onde o aleatório sorteia. Fica aqui para a tela e o treino não divergirem. */
export const MODOS_SORTEAVEIS: TrainingMode[] = ['rangeTraining', 'hu', 'threeHand', 'bounty'];

export const MODE_SCENARIOS: Record<TrainingMode, Scenario[]> = {
  // Multiway precisa de gente sobrando na mesa: não existe no heads-up, e no
  // three hand a mesa já é a menor possível.
  rangeTraining: ['openRaise', 'vsOpenRaise', 'vs3bet', 'vsOpenShove', 'simulation', 'multiway'],
  hu: ['openRaise', 'vsOpenRaise', 'vs3bet', 'vsOpenShove', 'simulation'],
  threeHand: ['openRaise', 'vsOpenRaise', 'vs3bet', 'simulation'],
  bounty: ['openRaise', 'vsOpenRaise', 'vs3bet', 'vsOpenShove', 'simulation', 'multiway'],
};

export const MODE_POSITIONS: Record<TrainingMode, Position[]> = {
  rangeTraining: POSITIONS, // 8-max completo
  hu: ['SB', 'BB'],
  threeHand: ['BTN', 'SB', 'BB'],
  bounty: POSITIONS,
};

export function sortearModo(sorteio: () => number = Math.random): TrainingMode {
  return MODOS_SORTEAVEIS[Math.floor(sorteio() * MODOS_SORTEAVEIS.length)];
}

export function posicoesDoModo(modo: TrainingMode | null): Position[] {
  return modo ? MODE_POSITIONS[modo] : POSITIONS;
}

export function cenariosDoModo(modo: TrainingMode | null): Scenario[] {
  return modo ? MODE_SCENARIOS[modo] : ['openRaise', 'vsOpenRaise', 'vs3bet', 'vsOpenShove'];
}

/** Posições em que o cenário não faz sentido, somadas às que o modo não tem. */
export function posicoesInvalidas(
  sc: Scenario,
  modo: TrainingMode | null,
  multiway = false
): Position[] {
  const available = posicoesDoModo(modo);
  const invalid: Position[] = [];

  for (const pos of available) {
    const posIndex = available.indexOf(pos);
    const hasEarlier = posIndex > 0; // alguém age antes desta posição
    const hasLater = posIndex < available.length - 1; // alguém age depois
    const isFirst = posIndex === 0;

    switch (sc) {
      case 'openRaise':
        // A última posição (BB) não tem como abrir
        if (!hasLater) invalid.push(pos);
        break;
      case 'vsOpenRaise':
      case 'vsOpenShove':
        // A primeira posição não tem ninguém antes para abrir
        if (!hasEarlier) invalid.push(pos);
        break;
      case 'simulation':
        // Com o pote multiway ligado a exigência é maior: além de alguém
        // abrindo antes, precisa sobrar um lugar no meio para quem paga.
        if (multiway && available.length >= 3 ? posIndex < 2 : !hasEarlier) invalid.push(pos);
        break;
      case 'vs3bet':
        // O herói abre e alguém DEPOIS dele dá 3bet: precisa de gente dos dois
        // lados. A primeira posição não enfrenta 3bet (ninguém abriu antes) e a
        // última também não (ninguém age depois).
        if (isFirst || !hasLater) invalid.push(pos);
        break;
      case 'multiway':
        // Pote multiway precisa de quem abriu e de pelo menos um pagador antes
        // do herói. Com um só na frente a mão seria heads-up com outro nome.
        if (posIndex < 2) invalid.push(pos);
        break;
    }
  }

  return [...invalid, ...POSITIONS.filter(p => !available.includes(p))];
}

export interface OpcoesDeSorteio {
  modo: TrainingMode;
  /** Modo aleatório: sorteia tudo e ignora o que está marcado na configuração */
  aleatorio: boolean;
  cenarioEscolhido: Scenario;
  cenarioAleatorio: boolean;
  posicoesEscolhidas: Position[];
  posicaoAleatoria: boolean;
  stacksEscolhidos: number[];
  stackAleatorio: boolean;
  multiwayLigado: boolean;
  /** Cenários que este jogador não pode abrir (bloqueio de apoiador) */
  bloqueado?: (cenario: Scenario) => boolean;
  /** Injetável para teste; por padrão Math.random */
  sorteio?: () => number;
}

export interface ConfiguracaoDaMao {
  cenario: Scenario;
  posicao: Position;
  stack: number;
  multiway: boolean;
}

/**
 * Decide cenário, posição, stack e multiway de uma mão.
 *
 * No modo aleatório tudo é sorteado e o que está marcado na configuração não
 * conta — é o sentido de sentar sem saber o que vem. Fora dele valem as
 * escolhas da tela, com as chaves "Aleatório" de cada bloco.
 *
 * A garantia principal: a posição devolvida sempre existe no modo e serve ao
 * cenário. Cenário sem posição possível nunca é sorteado.
 */
export function sortearConfiguracaoDaMao(o: OpcoesDeSorteio): ConfiguracaoDaMao {
  const rnd = o.sorteio ?? Math.random;
  const um = <T,>(lista: T[]): T => lista[Math.floor(rnd() * lista.length)];
  const bloqueado = o.bloqueado ?? (() => false);

  const disponiveis = cenariosDoModo(o.modo).filter(s => !bloqueado(s));

  // No aleatório o pote multiway também é sorteado; fora dele vale a chave.
  const querMultiway = o.aleatorio ? rnd() < 0.5 : o.multiwayLigado;
  const multiwayEm = (s: Scenario) =>
    s === 'simulation' && querMultiway && posicoesDoModo(o.modo).length >= 3;
  const posicoesDe = (s: Scenario) => {
    const invalidas = posicoesInvalidas(s, o.modo, multiwayEm(s));
    return posicoesDoModo(o.modo).filter(p => !invalidas.includes(p));
  };

  const jogaveis = disponiveis.filter(s => posicoesDe(s).length > 0);
  // O fallback não deveria acontecer (todo modo tem ao menos um cenário
  // jogável), mas sortear de uma lista vazia devolveria undefined.
  const candidatos = jogaveis.length > 0 ? jogaveis : disponiveis;

  // O cenário marcado pode não existir no modo que saiu — o three hand não tem
  // vs open shove. Nesse caso sorteia um que exista, em vez de travar.
  const cenario =
    o.aleatorio || o.cenarioAleatorio || !candidatos.includes(o.cenarioEscolhido)
      ? um(candidatos)
      : o.cenarioEscolhido;

  // A posição marcada também precisa existir no modo: quem pediu UTG não pode
  // receber UTG quando o sorteio trouxer heads-up.
  const validas = posicoesDe(cenario);
  const marcadasValidas = o.posicoesEscolhidas.filter(p => validas.includes(p));
  const posicao =
    o.aleatorio || o.posicaoAleatoria || marcadasValidas.length === 0
      ? um(validas)
      : um(marcadasValidas);

  const stacks =
    o.aleatorio || o.stackAleatorio || o.stacksEscolhidos.length === 0
      ? STACK_SIZES
      : o.stacksEscolhidos;

  return { cenario, posicao, stack: um(stacks), multiway: multiwayEm(cenario) };
}
