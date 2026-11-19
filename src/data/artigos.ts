// Artigos de conceito (/aprender), 19/11/2026.
//
// Partem do material de estudo da análise com IA (materialDidatico.ts: resumo,
// porquê, regras práticas e erro comum) e acrescentam explicação e exemplo. São
// as páginas públicas de conteúdo próprio do site: o AdSense recusou o GTORei
// por "conteúdo de baixo valor" quando quase tudo ficava atrás do login.
//
// Regras do texto (as mesmas do CLAUDE-conteudo.md):
//   - conceito, não número de solver. Número só o que sai do motor do GTORei,
//     e esse é calculado na hora pela página (tabelas em AprenderArtigoPage);
//   - termo técnico explicado na primeira vez;
//   - nada de afirmação absoluta: "costuma", "na maioria dos spots".

import { MATERIAL, type TemaDeEstudo } from '@/data/materialDidatico';
import type { Scenario } from '@/data/ranges/types';

export interface Secao {
  titulo: string;
  paragrafos: string[];
}

export interface Artigo {
  slug: string;
  tema: TemaDeEstudo;
  /** Título da página (h1) */
  titulo: string;
  /** Título para o Google, até ~60 caracteres */
  tituloSeo: string;
  /** Descrição para o Google, até ~155 caracteres */
  descricao: string;
  /** Abertura do artigo, antes das seções */
  abertura: string;
  secoes: Secao[];
  /** Exemplo de mão, passo a passo */
  exemplo?: { titulo: string; passos: string[] };
  /** Tabela calculada pelo motor, mostrada no artigo */
  tabela?: 'aberturaPorPosicao' | 'defesaDoBB' | 'callDeAllIn';
  /** Link de treino do tema */
  treino?: { cenario: Exclude<Scenario, 'simulation' | 'multiway'>; rotulo: string };
}

export const ARTIGOS: Artigo[] = [
  {
    slug: 'abertura',
    tema: 'openRaise',
    titulo: 'Abertura no poker: quais mãos abrir de cada posição',
    tituloSeo: 'Abertura no Poker: Mãos para Abrir por Posição — GTORei',
    descricao:
      'Como decidir entre abrir, ir all-in ou largar quando ninguém entrou no pote: posição, tamanho de stack e os erros que mais custam fichas em torneio.',
    abertura:
      'Abrir é ser o primeiro a aumentar no pré-flop, depois que todos antes de você desistiram. É a decisão que mais se repete num torneio: em cada órbita você passa por ela várias vezes. Por isso um vazamento pequeno aqui pesa mais no fim do mês do que um erro grande que aparece de vez em quando.',
    secoes: [
      {
        titulo: 'Por que a posição manda na abertura',
        paragrafos: [
          'Quando você abre, todos que falam depois ainda podem acordar com uma mão forte. Do UTG (o primeiro a falar) sobram sete jogadores atrás numa mesa de oito; do botão, só os dois blinds. Quanto mais gente atrás, maior a chance de alguém ter uma mão melhor que a sua, e mais forte precisa ser a range (o conjunto de mãos que você joga) para a abertura dar lucro.',
          'Há um segundo motivo: quem abre do botão joga as ruas seguintes em posição, falando por último. Falar depois do adversário vale fichas em toda mão que vai ao flop, porque você decide sabendo o que ele fez. É por isso que mãos como suited conectadas (98s, 76s) entram na range do botão e saem da range do UTG.',
          'O resultado prático é uma escada: a range cresce a cada posição, do UTG até o botão. A tabela abaixo mostra quanto cada posição abre no modelo do GTORei, com ante de 1 BB.',
        ],
      },
      {
        titulo: 'O tamanho do stack muda a decisão',
        paragrafos: [
          'Com stack fundo (40 BB ou mais) a abertura é pequena, de 2 a 2,5 big blinds, e a mão continua depois. Com stack curto a conta muda: se você abre para 2 BB com 12 BB atrás e alguém vai de all-in, você costuma ter de pagar com quase tudo, porque o pote já ficou grande demais para largar.',
          'É daí que vem o push/fold: abaixo de uns 15 a 20 BB, a decisão vira ir de all-in ou largar. O all-in direto tem duas vantagens nesse stack: ganha os blinds e o ante sem disputa quando todos largam, e não deixa o adversário ver o flop barato. Entre uns 14 e 20 BB as duas opções convivem, e quais mãos vão de all-in e quais abrem pequeno muda de posição para posição.',
        ],
      },
      {
        titulo: 'Um tamanho só para a range inteira',
        paragrafos: [
          'Abrir maior com mão forte e menor com mão fraca entrega a sua mão para quem presta atenção. Use o mesmo tamanho para toda a range de uma posição. O que muda entre as mãos é a decisão de abrir ou não, não o tamanho.',
          'Limp (só pagar o big blind) como primeiro a entrar raramente é a melhor linha fora do small blind: abre mão da chance de levar o pote na hora e convida os blinds a jogar com vantagem.',
        ],
      },
    ],
    exemplo: {
      titulo: 'Exemplo: K9o com 30 BB',
      passos: [
        'No UTG, K9o fica fora da range: com sete jogadores atrás, ela é dominada com frequência por KJ, KQ e AK quando alguém continua.',
        'No cutoff ela ainda fica fora no modelo do GTORei: com o botão e os dois blinds atrás, quem continua contra a abertura costuma ter Kx melhor ou ás.',
        'No botão, K9o entra na abertura na maior parte das vezes: só os blinds ainda falam, e você joga o flop em posição.',
        'A mão é a mesma; o que mudou foi quantos jogadores ainda podem ter algo melhor e quem fala por último depois do flop.',
      ],
    },
    tabela: 'aberturaPorPosicao',
    treino: { cenario: 'openRaise', rotulo: 'Treinar aberturas' },
  },
  {
    slug: 'resposta-a-abertura',
    tema: 'vsOpenRaise',
    titulo: 'Como responder a uma abertura: pagar, 3-bet ou largar',
    tituloSeo: 'Pagar, 3-bet ou Largar contra uma Abertura — GTORei',
    descricao:
      'O que fazer quando alguém abre antes de você: como a posição de quem abriu muda a sua range, por que o big blind defende tanto e quando o 3-bet é melhor que o call.',
    abertura:
      'Alguém abriu antes de você e agora há três opções: pagar (call), aumentar de novo (3-bet) ou largar. A resposta certa depende de duas posições ao mesmo tempo, a sua e a de quem abriu, e do tamanho dos stacks.',
    secoes: [
      {
        titulo: 'Comece pela posição de quem abriu',
        paragrafos: [
          'A range de quem abre do UTG é bem mais forte que a de quem abre do botão. Contra o UTG, mãos como KJo e ATo costumam estar dominadas: quando batem no flop, perdem para KQ, AJ e AQ. Contra o botão, as mesmas mãos ficam na frente de boa parte da range dele.',
          'Por isso não existe "a range de defesa" do big blind: existe a defesa contra o UTG, contra o cutoff, contra o botão. A tabela abaixo mostra como ela muda no modelo do GTORei.',
        ],
      },
      {
        titulo: 'Por que o big blind defende tanto',
        paragrafos: [
          'O big blind já colocou 1 BB no pote antes das cartas. Contra uma abertura de 2,2 BB, com o small blind e o ante de 1 BB já no meio, pagar custa só 1,2 BB a mais para disputar um pote de 5,9 BB. O preço é tão bom que mãos fracas para qualquer outra posição viram call no big blind.',
          'O outro lado é jogar o flop fora de posição, falando primeiro. Isso reduz quanto da equity (a chance de ganhar a mão) você consegue transformar em fichas, e é o motivo de mãos offsuit desconectadas ainda saírem da defesa.',
        ],
      },
      {
        titulo: 'Fora dos blinds, prefira 3-bet ou fold',
        paragrafos: [
          'Pagar uma abertura do meio da mesa deixa os jogadores de trás com uma oportunidade: o squeeze, um 3-bet grande contra quem abriu e quem pagou. Quem pagou costuma ter de largar e perde o que pôs. Por isso, fora dos blinds e sem posição, a resposta tende a ser 3-bet ou fold, com call reservado para posições com vantagem, como o botão.',
          'Mãos com bloqueador são bons 3-bets de blefe. A5s, por exemplo, tem um ás: com ele na sua mão, sobram menos combinações de AA e AK para o adversário, justamente as que continuariam contra o seu 3-bet. E se ele pagar, a mão ainda tem chance de flush e de sequência.',
        ],
      },
      {
        titulo: 'Stack curto: 3-bet all-in',
        paragrafos: [
          'Com 30 BB ou menos, o 3-bet pequeno deixa pouco atrás e o adversário pode ir all-in por cima com range larga. Nesses stacks o 3-bet costuma ser all-in direto (o re-steal), que tira de quem abriu a chance de jogar o flop. Com stack fundo, o 3-bet volta a ser pequeno, de três a quatro vezes a abertura.',
        ],
      },
    ],
    exemplo: {
      titulo: 'Exemplo: A8o no big blind, 40 BB',
      passos: [
        'O UTG abre para 2,2 BB. A8o está atrás de boa parte da range dele (AJ, AQ, AK), mas o preço do big blind é bom: a mão paga, e não dá 3-bet, para não inflar um pote em que costuma estar atrás.',
        'O botão abre para 2,2 BB. Contra a range larga do botão, A8o fica na frente com frequência, e no modelo do GTORei vira 3-bet pequeno: ganha o pote na hora quando o botão larga e joga um pote maior quando está na frente.',
        'O que mudou foi a range de quem abriu, não a sua mão.',
      ],
    },
    tabela: 'defesaDoBB',
    treino: { cenario: 'vsOpenRaise', rotulo: 'Treinar respostas à abertura' },
  },
  {
    slug: 'resposta-ao-3bet',
    tema: 'vs3bet',
    titulo: 'Levei 3-bet: quando largar, pagar ou dar 4-bet',
    tituloSeo: 'Como Responder a um 3-bet no Poker — GTORei',
    descricao:
      'Você abriu e levou 3-bet. Como a sua range de abertura, a posição e o stack definem se a mão larga, paga ou dá 4-bet, e os dois erros opostos que mais aparecem.',
    abertura:
      'Você abriu e alguém aumentou de novo. O pote já está grande, e a decisão aqui separa quem deixa ser explorado de quem entra em pote grande com mão dominada. Os dois erros existem, e ficam em pontas opostas.',
    secoes: [
      {
        titulo: 'A sua abertura define a sua defesa',
        paragrafos: [
          'Quem abre 15% das mãos do UTG tem uma range forte e pode continuar contra 3-bet com boa parte dela. Quem abre quase metade das mãos do botão tem muita mão fraca e, se continuar com a mesma proporção, vai jogar pote grande com lixo. A regra é proporcional: quanto mais larga a abertura, mais mãos largam contra o 3-bet, mas o número de mãos que continuam ainda é maior.',
          'Se você larga quase tudo menos as mãos premium, quem dá 3-bet ganha toda vez que tenta, com qualquer mão. É o vazamento mais comum de quem está começando a estudar.',
        ],
      },
      {
        titulo: 'Posição muda o que paga',
        paragrafos: [
          'Em posição, pagar o 3-bet é mais confortável: pares médios e suited conectados jogam bem o flop, e você decide por último em cada rua. Fora de posição, o call perde valor e a resposta tende a ser mais polarizada, com 4-bet com as mãos fortes e alguns blefes com bloqueador, e fold no resto.',
        ],
      },
      {
        titulo: 'Stack curto: o 4-bet é all-in',
        paragrafos: [
          'Com 25 BB ou menos, um 4-bet pequeno já compromete boa parte do stack. Nesses casos o 4-bet costuma ser all-in direto. Com 100 BB, o 4-bet volta a ser pequeno, e o all-in fica para a resposta seguinte.',
          'Olhe também de onde veio o 3-bet: o dos blinds contra o botão é bem mais largo que o do UTG+1 contra o UTG, e pede uma defesa mais larga.',
        ],
      },
      {
        titulo: 'Pagar o 3-bet custa mais do que parece',
        paragrafos: [
          "Quando você paga um 3-bet, o pote chega ao flop bem maior e a relação entre o que sobra no stack e o pote fica menor. Isso quer dizer menos espaço para blefar e mais situações em que um par médio vira uma decisão de stack inteiro. Mãos que dependem de acertar o flop com força, como pares baixos, precisam de stack fundo para valer o call: se acertam a trinca, ganham um pote grande; se não acertam, largam barato.",
          "Já mãos offsuit fracas, como KTo e QJo, sofrem nos dois sentidos: quando acertam o par, muitas vezes estão atrás de AK, KQ ou AQ, e quando erram não têm para onde ir. São as mãos que mais vazam fichas contra 3-bet, principalmente fora de posição.",
        ],
      },
    ],
    exemplo: {
      titulo: 'Exemplo: 88 do cutoff contra 3-bet do botão',
      passos: [
        'Você abre 88 do cutoff com 60 BB e o botão dá 3-bet. Você fica fora de posição para o resto da mão.',
        'Pagar é possível: 88 forma trinca no flop e ganha um pote grande de vez em quando. Mas sem posição, nos flops em que não melhora, vai ter de largar com frequência.',
        'Contra um 3-bet largo, 88 continua. Contra um 3-bet apertado de jogador que só aumenta com mão forte, largar perde pouco.',
      ],
    },
    treino: { cenario: 'vs3bet', rotulo: 'Treinar contra 3-bet' },
  },
  {
    slug: 'pagar-all-in',
    tema: 'vsOpenShove',
    titulo: 'Pagar um all-in no torneio: como decidir o call',
    tituloSeo: 'Quando Pagar um All-in no Torneio — GTORei',
    descricao:
      'Alguém foi all-in antes de você. Como a posição e o stack de quem empurrou mudam a range dele, como contar as pot odds com ante e quando o ICM aperta o call.',
    abertura:
      'Contra um all-in não existe próxima rua para corrigir: a decisão inteira acontece agora. É pagar ou largar, e errar custa o stack. A boa notícia é que é a decisão mais fácil de calcular no poker, porque depende só de três coisas: a range de quem empurrou, o preço do call e, perto do prêmio, o ICM.',
    secoes: [
      {
        titulo: 'De onde e com quanto ele empurrou',
        paragrafos: [
          'A range de quem vai all-in depende do stack e da posição. Um all-in de 10 BB do botão inclui muita mão média e fraca, porque o jogador só precisa passar pelos blinds. Um all-in de 20 BB do UTG é bem mais forte: ele escolheu arriscar muito com sete jogadores atrás.',
          'Antes de olhar para a sua mão, pense na mão dele: com que mãos este jogador, desta posição e com este stack, faria isso? A tabela abaixo mostra quanto o big blind paga contra all-in de cada posição no modelo do GTORei.',
        ],
      },
      {
        titulo: 'Pot odds: o call precisa de menos do que parece',
        paragrafos: [
          'Pot odds é a relação entre o que você paga e o que pode ganhar. Com blinds e ante, o pote já tem 2,5 BB antes de qualquer aposta. Contra um all-in de 10 BB no big blind, você paga 9 BB para disputar um pote de 21,5 BB: precisa ganhar a mão em pouco mais de 40% das vezes para o call empatar.',
          'É por isso que mãos com ás e pares médios pagam all-in largo com frequência: contra uma range cheia de mãos fracas, elas ficam acima desse limite. Já mãos suited conectadas, ótimas para jogar o flop, perdem valor aqui. Sem pós-flop para jogar, só a equity crua conta.',
        ],
      },
      {
        titulo: 'Perto do prêmio, o ICM aperta',
        paragrafos: [
          'Fora da zona de premiação, o call certo é o que ganha mais fichas. Perto da bolha e na mesa final, é o que ganha mais dinheiro, e perder o torneio custa mais que dobrar o stack ajuda. Com ICM (modelo que traduz fichas em dinheiro do prêmio), a range de call fica mais apertada, principalmente para quem tem stack médio.',
        ],
      },
      {
        titulo: 'Quando há gente atrás de você',
        paragrafos: [
          "Se você não está no big blind, ainda há jogadores para falar depois. Pagar o all-in nessa situação exige uma mão mais forte, porque alguém atrás pode acordar com uma mão melhor e entrar no pote. Por isso a range de call do botão contra um all-in do UTG é bem mais curta que a do big blind contra o mesmo all-in.",
        ],
      },
    ],
    exemplo: {
      titulo: 'Exemplo: A7o no big blind contra all-in de 10 BB',
      passos: [
        'O botão vai all-in com 10 BB. A range dele é larga: muitos Ax, pares, Kx e suited.',
        'Você paga 9 BB para disputar 21,5 BB e precisa de pouco mais de 40% para empatar.',
        'A7o fica na frente de boa parte dessa range e é call na maioria dos spots fora da bolha.',
        'Se o mesmo all-in viesse do UTG com 20 BB, a range seria muito mais forte, e A7o ficaria dominado com frequência: aí o fold costuma ser melhor.',
      ],
    },
    tabela: 'callDeAllIn',
    treino: { cenario: 'vsOpenShove', rotulo: 'Treinar contra all-in' },
  },
  {
    slug: 'resposta-ao-4bet',
    tema: 'vs4bet',
    titulo: 'Levei 4-bet: o que fazer depois do seu 3-bet',
    tituloSeo: 'Como Responder a um 4-bet no Poker — GTORei',
    descricao:
      'Você deu 3-bet e levou 4-bet. Por que separar valor e blefe antes de agir, quando a resposta é all-in ou fold e o erro de pagar só porque já pôs fichas no pote.',
    abertura:
      'Você deu 3-bet e o adversário respondeu com um 4-bet. Com o pote desse tamanho, quase toda decisão compromete o stack. A boa notícia: se o seu 3-bet foi pensado antes, a resposta aqui já está quase decidida.',
    secoes: [
      {
        titulo: 'Separe o seu 3-bet em valor e blefe',
        paragrafos: [
          'Todo 3-bet tem dois grupos de mãos. As de valor (AA, KK, QQ, AK) querem dinheiro no pote e continuam contra o 4-bet. As de blefe (como A5s, K9s com bloqueador) estavam ali para fazer o adversário largar; se ele não largou, elas saem.',
          'Decidir a que grupo a sua mão pertence no momento do 3-bet, e não depois, evita a armadilha mais cara deste spot.',
        ],
      },
      {
        titulo: 'Stack curto: all-in ou fold',
        paragrafos: [
          'Com stack curto, pagar o 4-bet deixa tão pouco atrás que qualquer flop vira all-in. Nessa situação, pagar só adia a decisão e tira de você a vantagem de ser quem empurra. A resposta tende a ser all-in ou fold.',
          'Com stack fundo, existe espaço para pagar em posição com mãos que jogam bem o flop, e para um 5-bet all-in com as mais fortes.',
        ],
      },
      {
        titulo: 'Bloqueadores no fim da escada',
        paragrafos: [
          'Quanto mais alta a sequência de aumentos, mais concentrada em AA, KK e AK fica a range de quem continua. Por isso mãos com um ás ou um rei são as que mais aguentam um 5-bet de blefe: elas tiram combinações exatamente das mãos que pagariam.',
        ],
      },
      {
        titulo: 'O erro do custo afundado',
        paragrafos: [
          "As fichas que você já colocou no pote não são mais suas: fazem parte do pote. A pergunta certa contra o 4-bet não é quanto você já investiu, mas se a sua mão ganha dinheiro pagando o que falta contra a range que continua. Pagar só para não perder o que já entrou é o raciocínio que mais esvazia stack neste spot.",
          "Isso vale nas duas direções. Uma mão forte não deve largar por medo de um pote grande, e um blefe que não funcionou não deve virar call para tentar recuperar o investimento.",
        ],
      },
      {
        titulo: 'Quem dá 4-bet e de onde',
        paragrafos: [
          "Assim como no 3-bet, a posição de quem dá o 4-bet muda a range. Um jogador que abriu do botão e recebe 3-bet do big blind tem motivo para dar 4-bet mais largo, porque o 3-bet dos blinds contra o botão também é largo. Um 4-bet de quem abriu do UTG, por outro lado, costuma ser bem mais concentrado em mãos fortes.",
          "Na maioria das mesas de torneio, principalmente nos limites mais baixos, o 4-bet é menos blefado do que a teoria sugere. Contra jogadores que você não conhece, respeitar o 4-bet com as mãos do meio da sua range raramente é um erro caro.",
        ],
      },
    ],
    exemplo: {
      titulo: 'Exemplo: A5s levou 4-bet',
      passos: [
        'Você deu 3-bet com A5s como blefe e o adversário deu 4-bet.',
        'A5s cumpriu o papel dele no 3-bet. Contra o 4-bet, a mão está atrás de quase toda a range que continua.',
        'O fold costuma ser a resposta. Pagar "porque já colocou fichas" transforma um blefe barato numa perda grande.',
      ],
    },
  },
  {
    slug: 'icm-bolha-mesa-final',
    tema: 'icm',
    titulo: 'ICM, bolha e mesa final: quando ficha não é dinheiro',
    tituloSeo: 'ICM no Poker: Bolha e Mesa Final Explicados — GTORei',
    descricao:
      'O que é ICM, por que perto da premiação perder fichas custa mais que ganhar, quem deve apertar e quem pode pressionar na bolha e na mesa final.',
    abertura:
      'Num torneio, as fichas não são dinheiro. Quem tem metade das fichas não leva metade do prêmio, e quem dobra o stack não dobra o que vai receber. O ICM (Independent Chip Model) é a conta que traduz fichas em dinheiro do prêmio, e muda a melhor jogada justamente nos momentos de maior pressão.',
    secoes: [
      {
        titulo: 'Por que perder custa mais que ganhar',
        paragrafos: [
          'Fora da zona de premiação, a jogada certa é a que ganha mais fichas. Perto dela, é a que ganha mais dinheiro. Se você cai, perde tudo o que ainda poderia ganhar subindo de posição. Se dobra, ganha fichas que valem cada vez menos em dinheiro, porque o primeiro lugar não paga o dobro do segundo.',
          'Na prática, isso quer dizer que pagar um all-in perto do prêmio exige uma mão mais forte do que exigiria no começo do torneio, mesmo com o mesmo stack e o mesmo adversário.',
        ],
      },
      {
        titulo: 'Quem aperta e quem pressiona',
        paragrafos: [
          'Os stacks médios são os que mais sofrem com o ICM: têm muito a perder e não dominam a mesa. Quem tem o maior stack pode pressionar, porque cobre todo mundo e perder um pote não o elimina. O stack curto ganha muito só em sobreviver mais uma eliminação.',
          'Por isso olhe sempre quem cobre o seu stack. Contra quem tem mais fichas que você, perder uma mão elimina; contra quem você cobre, o risco é bem menor.',
        ],
      },
      {
        titulo: 'Mesa final: cada salto muda o preço',
        paragrafos: [
          'Na mesa final, cada posição a mais vale dinheiro. Um call que é lucrativo com nove jogadores pode deixar de ser com cinco, se houver alguém muito curto prestes a cair. Antes de pagar, conte quantos estão mais curtos que você.',
        ],
      },
      {
        titulo: 'Como o ICM aparece no treino',
        paragrafos: [
          "No treino do GTORei, as mãos de mesa final usam um ajuste de ICM: o call de all-in fica mais apertado e a pressão de quem tem stack grande aumenta. No simulado, uma em cada quatro mãos cai na mesa final, justamente para treinar a troca de chave entre jogar por fichas e jogar por dinheiro.",
        ],
      },
    ],
    exemplo: {
      titulo: 'Exemplo: AJo na bolha com stack médio',
      passos: [
        'Faltam duas eliminações para a premiação. Você tem 25 BB, o stack médio da mesa.',
        'O maior stack vai all-in do botão. Fora da bolha, AJo no big blind seria um call comum contra essa range.',
        'Na bolha, perder elimina você sem prêmio, e há stacks de 6 e 8 BB na mesa que podem cair antes. Com o ICM, o mesmo call fica bem mais caro, e o fold passa a ser uma opção séria: é a situação em que o stack médio mais perde por pagar.',
      ],
    },
  },
  {
    slug: 'pos-flop',
    tema: 'posflop',
    titulo: 'Pós-flop: c-bet, segundo barril e defesa',
    tituloSeo: 'Pós-flop no Poker: C-bet, Barril e Defesa — GTORei',
    descricao:
      'Como pensar flop, turn e river: qual range o board favorece, quando a c-bet pequena funciona, por que o segundo barril precisa de motivo e como blefar no river.',
    abertura:
      'O pré-flop decide com quais mãos você chega ao flop; o pós-flop decide quanto delas vira ficha. Os dois vazamentos mais comuns ficam nas pontas: apostar no automático em todo flop e desistir cedo demais quando a aposta não funcionou.',
    secoes: [
      {
        titulo: 'Pense na range, não só na sua mão',
        paragrafos: [
          'Antes de apostar, pergunte qual range o board favorece. Um flop alto e seco, como K-7-2 de naipes diferentes, costuma ser bom para quem abriu: a range dele tem mais Kx, AK e pares altos. Um flop baixo e conectado, como 7-6-5 com dois do mesmo naipe, ajuda quem pagou, que tem mais mãos suited conectadas e pares baixos.',
          'Quem tem a range favorecida pode apostar com mais frequência; quem não tem deve apostar menos e escolher melhor quando.',
        ],
      },
      {
        titulo: 'C-bet: pequena no seco, grande e menos vezes no molhado',
        paragrafos: [
          'A continuation bet (c-bet) é a aposta no flop de quem abriu ou deu o último aumento no pré-flop. Em board seco, uma c-bet pequena, de um terço do pote, faz quase o mesmo trabalho de uma grande: o adversário erra o flop com frequência e não tem draw para continuar.',
          'Em board molhado, com muitos draws possíveis, a c-bet funciona melhor com menos frequência e tamanho maior: cobra caro de quem tem draw e protege as mãos feitas.',
        ],
      },
      {
        titulo: 'Segundo barril precisa de motivo',
        paragrafos: [
          'Apostar de novo no turn faz sentido quando a carta nova melhora a sua range em relação à do adversário (uma carta alta para quem abriu, por exemplo) ou quando você tem um draw forte que ganha valor com a aposta. Apostar só porque apostou no flop é o caminho mais rápido para perder potes grandes com nada.',
        ],
      },
      {
        titulo: 'River: valor e blefe',
        paragrafos: [
          'No river não há mais carta por vir, e a pergunta fica simples. Aposte de valor com mão que recebe call de mão pior. Blefe com mão que não ganha no showdown e que bloqueia as mãos com que o adversário pagaria. Mão média, que ganha de blefes e perde de valor, costuma preferir passar.',
        ],
      },
      {
        titulo: 'Defesa: não largue cedo demais',
        paragrafos: [
          "Do outro lado da c-bet, quem pagou pré-flop precisa defender o suficiente para que a aposta automática não dê lucro. Mãos com par, com draw ou com cartas altas que podem melhorar costumam continuar contra uma c-bet pequena. Largar tudo o que não acertou o flop deixa o adversário apostar com qualquer coisa.",
        ],
      },
    ],
    exemplo: {
      titulo: 'Exemplo: AQ num flop K-8-3',
      passos: [
        'Você abriu do cutoff e o big blind pagou. O flop é K♠ 8♦ 3♣: seco, e bom para a sua range, que tem mais Kx forte.',
        'Mesmo sem par, AQ é uma boa c-bet pequena: o big blind erra esse flop com frequência, e a mão ainda tem cartas para melhorar.',
        'Se ele pagar e o turn for um 2, a carta não muda nada: sem par e sem draw, passar costuma ser melhor que um segundo barril sem motivo.',
      ],
    },
  },
];

export const artigoPorSlug = (slug: string | undefined) => ARTIGOS.find((a) => a.slug === slug);

/** Resumo, regras e erro comum vêm do material de estudo, igual ao da análise com IA */
export const materialDoArtigo = (a: Artigo) => MATERIAL[a.tema];
