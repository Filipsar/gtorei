// Material de estudo dos temas que a análise com IA aponta (01/11/2026).
//
// Cada leak e cada recomendação do resumo é ligado a um tema por
// src/lib/treinoDaAnalise.ts; o texto do tema abre ali mesmo, ao lado do botão
// de treino. Texto de conceito, sem número de solver: o que vale como
// frequência exata é a range do treino, não este resumo.

export type TemaDeEstudo = 'openRaise' | 'vsOpenRaise' | 'vs3bet' | 'vsOpenShove' | 'vs4bet' | 'icm' | 'posflop';

export interface Material {
  titulo: string;
  /** Uma frase: do que o tema trata */
  resumo: string;
  /** Por que o tema custa fichas a quem erra */
  porQue: string;
  /** Regras práticas para a mesa */
  naPratica: string[];
  /** O erro que mais aparece nesse spot */
  erroComum: string;
}

export const MATERIAL: Record<TemaDeEstudo, Material> = {
  openRaise: {
    titulo: 'Abertura (primeiro a entrar)',
    resumo: 'Ninguém entrou no pote antes de você: abrir, ir de all-in ou largar a mão.',
    porQue:
      'É o spot que mais se repete num torneio. Um pequeno vazamento aqui, somado em centenas de mãos, pesa mais que um erro raro e grande.',
    naPratica: [
      'Quanto mais perto do botão, mais mãos você abre: há menos gente para acordar com mão forte atrás de você.',
      'Do UTG a range é curta; do botão ela é larga. Abrir a mesma range de qualquer posição é o vazamento mais comum.',
      'Com stack curto (até uns 20 BB) a abertura vira push/fold: abrir pequeno e largar para um all-in desperdiça fichas.',
      'Mantenha o tamanho da abertura igual para todas as mãos da range, para o tamanho não entregar a força da mão.',
      'Limp como primeiro a entrar raramente é a melhor linha fora do small blind.',
    ],
    erroComum: 'Abrir mãos fracas de posição inicial (Ax offsuit baixo, K e Q fracos) e foldar demais do botão e do cutoff.',
  },
  vsOpenRaise: {
    titulo: 'Resposta a uma abertura',
    resumo: 'Alguém abriu antes de você: pagar, dar 3-bet ou largar.',
    porQue:
      'Pagar demais fora de posição queima fichas nas ruas seguintes; largar demais no big blind entrega o pote a quem rouba.',
    naPratica: [
      'Olhe primeiro de onde veio a abertura: a range de quem abre do UTG é muito mais forte que a de quem abre do botão.',
      'No big blind você já tem ficha no pote, então paga mais barato e defende mais mãos que em qualquer outra posição.',
      'Fora dos blinds, prefira 3-bet ou fold a pagar: o call sem posição chama squeeze de quem fala depois.',
      'Mãos com bloqueador (como A5s) são bons blefes de 3-bet: tiram combinações de AA e AK do adversário.',
      'Com stack curto o 3-bet costuma ser all-in direto; com stack fundo, pequeno.',
    ],
    erroComum: 'Pagar aberturas com mãos dominadas (KJo, QTo, Ax offsuit) fora de posição contra range forte.',
  },
  vs3bet: {
    titulo: 'Resposta a um 3-bet',
    resumo: 'Você abriu e levou 3-bet: largar, pagar ou dar 4-bet.',
    porQue:
      'O pote já está grande. Largar demais deixa o adversário 3-betar qualquer coisa contra você; pagar demais te põe em pote grande com mão dominada.',
    naPratica: [
      'A sua range de abertura define a resposta: quem abre largo do botão defende mais que quem abre apertado do UTG.',
      'Em posição dá para pagar mais mãos (pares médios, suited conectados); fora de posição, mais 4-bet ou fold.',
      'Pense na stack: com 25 BB ou menos o 4-bet costuma ser all-in; com 100 BB, pequeno.',
      'Leve em conta de onde veio o 3-bet: o dos blinds contra o botão é mais largo que o do UTG+1 contra o UTG.',
    ],
    erroComum: 'Largar quase tudo menos as mãos premium e, no outro extremo, pagar com mão offsuit fraca fora de posição.',
  },
  vsOpenShove: {
    titulo: 'Pagar um all-in',
    resumo: 'Alguém foi all-in antes de você: pagar ou largar.',
    porQue:
      'Não existe outra rua para corrigir: a decisão inteira é aqui. Pagar leve demais ou largar mão boa demais custa a stack inteira.',
    naPratica: [
      'A range de quem empurra depende da stack e da posição: um all-in de 10 BB do botão é muito mais largo que um de 20 BB do UTG.',
      'Conte as pot odds: com ante e blinds no pote, o call precisa de menos equity do que parece.',
      'Mãos com ás e pares médios ganham valor contra all-in largo; mãos suited conectadas perdem (sem pós-flop, a jogabilidade não conta).',
      'Perto do prêmio, o ICM aperta o call: o risco de cair pesa mais que as fichas que você ganha.',
    ],
    erroComum: 'Pagar com K e Q fracos "porque o adversário empurra qualquer coisa" e largar ás médio contra all-in largo.',
  },
  vs4bet: {
    titulo: 'Resposta a um 4-bet',
    resumo: 'Você deu 3-bet e levou 4-bet: largar, pagar ou ir de all-in.',
    porQue: 'Com o pote desse tamanho, quase toda decisão compromete a stack. Erro aqui é sempre caro.',
    naPratica: [
      'Separe o seu 3-bet em valor e blefe antes de agir: o blefe larga para o 4-bet, a mão de valor continua.',
      'Com stack curta a resposta é all-in ou fold; pagar deixa pouca ficha para jogar o flop.',
      'Mãos com bloqueador de ás e rei são as que mais aguentam um 5-bet de blefe.',
    ],
    erroComum: 'Dar 3-bet de blefe e depois pagar o 4-bet "porque já pôs muita ficha".',
  },
  icm: {
    titulo: 'ICM, bolha e mesa final',
    resumo: 'Perto do prêmio, ficha que você perde vale mais que ficha que você ganha.',
    porQue:
      'Fora do ICM, a melhor jogada é a que ganha mais fichas. Perto da bolha e na mesa final, é a que ganha mais dinheiro, e as duas nem sempre coincidem.',
    naPratica: [
      'Na bolha, as stacks médias pagam e dão call mais apertado; quem tem stack grande pode pressionar.',
      'Stack curta perto do prêmio ganha mais em sobreviver; stack média é a que mais sofre com o ICM.',
      'Na mesa final, cada salto de prêmio muda o preço de um call. Olhe quem está mais curto que você.',
      'Cuidado maior com quem cobre a sua stack: perder para ele elimina você; contra quem você cobre, o risco é menor.',
    ],
    erroComum: 'Jogar a bolha como se fosse o começo do torneio: pagar all-in com mão marginal tendo stack média.',
  },
  posflop: {
    titulo: 'Pós-flop',
    resumo: 'Continuation bet, barris e defesa no flop, turn e river.',
    porQue:
      'O pré-flop define a range; o pós-flop decide quanto dela vira ficha. Apostar no automático ou desistir cedo demais vaza nas duas pontas.',
    naPratica: [
      'Antes de apostar, pense em qual range o board favorece: board alto e seco costuma ser de quem abriu; board baixo e conectado ajuda quem pagou.',
      'C-bet pequena funciona em board seco; em board molhado, aposte menos vezes e maior.',
      'Ao dar um segundo barril, tenha um motivo: a carta do turn melhora a sua range ou você tem um bom draw.',
      'No river, aposte de valor com mão que recebe call de pior e blefe com mão que não ganha no showdown.',
    ],
    erroComum: 'C-bet em todo flop e desistir no turn, ou pagar até o river com par fraco sem pensar na range do adversário.',
  },
};
