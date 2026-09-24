import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SEO } from '@/components/seo/SEO';
import { Bell, Sparkles, Bug, Wrench, Rocket } from 'lucide-react';

interface UpdateNote {
  version: string;
  date: string;
  type: 'feature' | 'improvement' | 'fix';
  title: string;
  description: string;
}

const UPCOMING: string[] = [
  'Ranges de stack profundo recalculadas pelo mesmo método do push/fold',
  'Ante do BB no cálculo das ranges curtas',
  'Análise de straight draw (OESD, gutshot) no board',
  'Aulas gratuitas de poker GTO',
];

const UPDATES: UpdateNote[] = [
  {
    version: '1.18.1',
    date: '24/09/2026',
    type: 'fix',
    title: 'A Simulação Mandava Passar Ases no HU e no Three Hand',
    description: 'Um relato de que o gráfico de range não mostrava nada na Simulação levou a um problema muito maior. A tabela que diz quanto cada posição abre, paga e vai de all-in tinha a Simulação escrita só para o 8-max: nos modos HU e Three Hand ela simplesmente não existia. A busca voltava vazia, e vazio ali significa 0% raise, 0% call, 0% all-in — ou seja, 100% fold para as 169 mãos. O efeito era este: no HU e no Three Hand, passar AA valia +15 pontos e jogar AA valia -8. O mesmo para AKs, QQ e qualquer outra mão. Só quem desistia era premiado, e quem jogava certo perdia pontos e precisão. Eram 45 combinações de modo, posição e stack — todos os stacks do HU no BB e do Three Hand no SB e no BB. E era também a razão de o gráfico "não aparecer": ele abria, mas com as 169 casas cinzas de fold, sem nada para ler. Agora a Simulação herda o vs Open Raise em todos os modos, que é o mesmo spot pré-flop: alguém abriu e você responde. Os pontos já registrados não foram alterados. Também nesta correção: a janela do range abria com dois X de fechar colados, um deles sobrando.',
  },
  {
    version: '1.18.0',
    date: '24/09/2026',
    type: 'feature',
    title: 'Aleatório Começa na Hora (e Bounty Entra para os Apoiadores)',
    description: 'O modo Aleatório fazia o contrário do que promete: mandava você configurar cenário, posição e fichas antes de começar. Agora um clique senta na mesa direto, e a cada mão tudo é sorteado de novo — o modo, o cenário, a posição, o stack e, quando cai Simulação, até o pote multiway. Em 24 mãos seguidas de teste saíram os quatro modos, seis posições e onze tamanhos de stack diferentes. Junto veio uma correção que ninguém via mas quebrava a mesa: o sorteio combinava cenário e modo de forma independente, e uma hora saía "vs 3-bet no heads-up" — uma situação que não existe, porque o herói precisaria de alguém antes e alguém depois, e no 1x1 não há os dois. Quando saía, a mão nascia sem posição. Agora combinação impossível não é sorteada. O Modo Bounty e o Aleatório passaram a ser dos apoiadores, junto com a Simulação e o Multiway. O treino de ranges continua inteiro e de graça: os quatro cenários pré-flop, todas as posições e stacks, nos modos Treino de Range, HU e Three Hand.',
  },
  {
    version: '1.17.0',
    date: '23/09/2026',
    type: 'feature',
    title: 'Simulação Multiway: Jogue Contra Dois',
    description: 'A Simulação ganhou a opção de pote multiway. Um terceiro jogador paga a abertura e vai ao flop com você e o adversário principal — ele pode desistir no meio do caminho e pode ganhar a mão no showdown, onde as cartas dele viram junto com as dos outros. É o treino que ensina a coisa mais difícil do pote de três: mão boa contra um vira mão fraca contra dois, e blefe que passa num passa pouco no outro. A opção aparece só na Simulação, que é o único cenário que joga o pós-flop, e só em mesas com três lugares ou mais. Como o resto da Simulação, é para apoiadores. Uma ressalva honesta sobre o que ele faz: o terceiro jogador paga ou desiste a cada rua, mas não abre aposta nem aumenta — quem conduz a aposta continua sendo o adversário principal.',
  },
  {
    version: '1.16.1',
    date: '23/09/2026',
    type: 'improvement',
    title: 'Simulação Agora é para Apoiadores',
    description: 'A Simulação — jogar a mão até o river, com flop, turn e river — passou a ser dos apoiadores, junto com o Multiway. O treino de ranges continua inteiro e de graça: open raise, vs open raise, vs 3-bet e vs open shove, em todas as posições e stacks, nos quatro modos de mesa. Quem apoia libera os dois cenários na hora; o cadeado na tela leva direto para a página de apoio.',
  },
  {
    version: '1.16.0',
    date: '23/09/2026',
    type: 'feature',
    title: 'Multiway, Modo Aleatório e Botões Refeitos',
    description: 'O treino Multiway saiu da manutenção e está liberado para quem apoia o projeto: pote aberto por alguém e pago por mais um, com você decidindo contra dois adversários. Entrou também o modo Aleatório, que sorteia entre Treino de Range, HU, Three Hand e Bounty a cada mão — e ajusta sozinho o cenário e a posição quando os que você escolheu não existem no modo que saiu. Os botões de ação ficaram como os das salas: mais largos, nome grande e o valor logo abaixo, com a régua de tamanho da aposta virando um seletor colado na barra. E uma correção que veio de um relato: no pós-flop sem ninguém ter apostado, a barra oferecia Fold — jogar a mão fora de graça, uma jogada que nunca é certa. Agora são três botões, Check, Bet e All-in. No mesmo caminho foi corrigido o sorteio do Multiway, que às vezes montava um pote heads-up achando que era multiway.',
  },
  {
    version: '1.15.3',
    date: '23/09/2026',
    type: 'improvement',
    title: 'ID da Mão Agora Serve para Consultar',
    description: 'O código de 18 caracteres que aparece no resultado da mão era sorteado no seu navegador e não ia para lugar nenhum: quem relatava um problema mandava o código e não havia como achar a mão. Agora ele é guardado junto com o resultado, com o contexto que faltava para reconstruir o spot — modo de jogo, adversário e stack efetivo. O código é apagado 7 dias depois; a mão, os pontos e o XP continuam, porque apagar a linha zeraria seu histórico e sua posição no ranking.',
  },
  {
    version: '1.15.2',
    date: '22/09/2026',
    type: 'fix',
    title: 'Gráfico de Range Discordava da Nota da Mão',
    description: 'A tela dizia "Jogada GTO: Fold", você abria o gráfico de range na mesma mão e via Call — e ficava com a impressão de ter perdido pontos por uma jogada certa. A nota estava certa; quem mentia era o gráfico. Ele refazia a conta do zero e esquecia quatro coisas que a nota levava em conta: o modo de jogo (mostrava sempre 8-max, mesmo no heads-up), o bounty, o stack efetivo (usava o seu, não o menor entre você e o adversário) e, ao pagar um all-in, a posição de quem tinha dado o all-in — pagar o UTG é muito diferente de pagar o botão, e ele fazia a média de todos. Medindo: 3,5% das mãos mudavam de ação por causa da posição do all-in, 10,2% por causa do stack, 6,2% no bounty e 15,7% no heads-up. Agora o gráfico recebe a mesma range que deu a nota, sem refazer conta nenhuma, e os dois não têm mais como divergir. A revisão de mãos favoritas também passou a guardar o modo, o bounty e o adversário da mão, em vez de redesenhar tudo como se fosse 8-max.',
  },
  {
    version: '1.15.1',
    date: '22/09/2026',
    type: 'fix',
    title: 'Animações da Página Inicial Piscando',
    description: 'Ao rolar a página inicial, cada bloco aparecia, sumia e voltava. O motivo: ele só era escondido no instante em que já estava na tela — medi um card de recursos inteiro, com 262 pixels visíveis, sumindo depois de já ter sido desenhado. Agora quem ainda está abaixo da dobra já entra escondido, e nada que você esteja lendo é tocado: se a animação não carregar, a página continua inteira. Os cards também entram em fila, de cima para baixo e da esquerda para a direita, em vez de a linha de baixo gastar a entrada fora da tela. A transição de 150 milissegundos do hover dos cards, que arrastava cada quadro da animação, agora fica desligada enquanto o bloco entra e volta no fim. E a página não para mais de animar no meio: análise por IA, comunidade, perguntas e transparência também entram quando chega a vez delas.',
  },
  {
    version: '1.15.0',
    date: '22/09/2026',
    type: 'improvement',
    title: 'Mesa com Movimento, Barra Lateral em Seções e Ícones Novos',
    description: 'A mesa ganhou movimento: as fichas apostadas entram empurradas do lugar do jogador, o pote conta em vez de saltar de um número para outro, as apostas são varridas para o meio na virada da rua e cada carta comunitária cai na hora em que sai. A barra lateral foi dividida em quatro seções — Treino, Análise, Comunidade e Mais — cada uma com seta para abrir e fechar, e o que você fecha continua fechado na próxima página. Os quatro modos de treino trocaram a arte antiga por um desenho da mesa real de cada modo, com o seu lugar sempre embaixo. E cada uma das 28 conquistas ganhou um ícone próprio no lugar do emoji: dois deles eram repetidos, e emoji muda de cara conforme o aparelho.',
  },
  {
    version: '1.14.0',
    date: '22/09/2026',
    type: 'improvement',
    title: 'Página Inicial com Animações de Entrada',
    description: 'O topo da página inicial entra escalonado assim que a tela desenha, as seções sobem conforme você rola e os números da plataforma contam a partir do zero. A biblioteca de animação fica num arquivo separado, só é baixada na página inicial e nem chega a ser carregada por quem configurou menos movimento no sistema. Nada do conteúdo depende dela para aparecer: se o script falhar, a página continua completa e legível.',
  },
  {
    version: '1.13.1',
    date: '22/09/2026',
    type: 'fix',
    title: 'Tutorial Inicial Travado no Primeiro Acesso',
    description: 'Quem entrava pela primeira vez encontrava o tutorial de boas-vindas com os botões sem responder. O pop-up de novidades abria atrás dele e, por ser um modal, desligava o clique no resto da página — inclusive no tutorial, que estava por cima e continuava visível. Agora o pop-up não aparece para quem ainda está no tutorial, e o tutorial e o teste de nível mantêm o clique próprio mesmo com outro modal aberto. Também foi atualizado o banner do topo, com as novidades da semana e um atalho para apoiar o projeto.',
  },
  {
    version: '1.13.0',
    date: '21/09/2026',
    type: 'improvement',
    title: 'Mesa Virtual e Botões de Ação Refeitos',
    description: 'Agora você senta sempre embaixo, no centro, e a mesa gira em volta — antes o seu assento mudava de lugar a cada mão. Os assentos passaram a ser calculados na elipse, o que corrigiu jogadores sobrepostos no 8-max e a mesa meio vazia no heads-up e no 3-handed. Os botões de ação ganharam atalhos de teclado (F, C, R, B, A), mostram quanto custa cada jogada em BB e tiveram o contraste corrigido.',
  },
  {
    version: '1.12.1',
    date: '21/09/2026',
    type: 'improvement',
    title: 'Site Mais Rápido, Bloco de Perguntas e Correções de Segurança',
    description: 'A página inicial passou a mostrar uma range de verdade calculada pelo solver, números conferidos no banco e um bloco de perguntas frequentes. Imagens pesadas foram reduzidas: 1,5 MB a menos em toda página logada e favicon de 93 KB para 1,4 KB. Também foram corrigidos o escape do CSV exportado no admin, o limite de caracteres na comunidade e vulnerabilidades das dependências.',
  },
  {
    version: '1.12.0',
    date: '21/09/2026',
    type: 'feature',
    title: 'Ranges de Push/Fold Calculadas por EV',
    description: 'As ranges de stack curto (8bb a 20bb) deixaram de ser copiadas de tabela: agora são calculadas aqui, a partir de uma matriz de equity 169x169 gerada por simulação de Monte Carlo, com iteração de melhor-resposta amortecida até o equilíbrio. Os resultados batem com as tabelas de Nash publicadas. A ordem de força das mãos também passou a vir da equity, corrigindo casos como Q8s aparecendo à frente de 66.',
  },
  {
    version: '1.11.0',
    date: '20/09/2026',
    type: 'improvement',
    title: 'Dashboard de Análise Redesenhado',
    description: 'A página de análise ganhou gráfico de precisão ao longo do tempo com a média do mês como referência, quebra por cenário e um card de "onde focar agora" que aponta a posição e o cenário em que você mais perde EV.',
  },
  {
    version: '1.10.3',
    date: '20/09/2026',
    type: 'fix',
    title: 'Contraste, Tema e Acessibilidade',
    description: 'Corrigido o contraste do texto sobre o dourado no tema claro, que reprovava no WCAG AA. O tema salvo passa a ser aplicado antes da página desenhar, acabando com a piscada de escuro para claro. As animações agora respeitam a preferência de movimento reduzido do sistema, e o idioma é detectado pelo navegador em vez de por consulta a serviço externo.',
  },
  {
    version: '1.10.2',
    date: '23/06/2026',
    type: 'improvement',
    title: 'Landing Page Reestruturada — Privacidade e Termos',
    description: 'Removida a seção "Acesso rápido" da landing page. Adicionada nova seção final de "Privacidade, Dados e Termos" com informações sobre LGPD, cookies, marketing, remarketing e consentimento ao se registrar.',
  },
  {
    version: '1.10.1',
    date: '23/06/2026',
    type: 'improvement',
    title: 'Banner Rotativo Atualizado',
    description: 'O banner rotativo do topo agora exibe as últimas novidades da plataforma (Análise com IA, novo Ranking GTO Rei, ranges atualizadas) e links diretos para apoiar o projeto e seguir no Instagram.',
  },
  {
    version: '1.10.0',
    date: '23/06/2026',
    type: 'feature',
    title: 'Análise com IA, Base GTO Aprimorada e Pop-up de Novidades',
    description: 'Nova seção "Analisar com IA" no menu lateral: importe seu hand history (PokerStars, GGPoker, ACR, PartyPoker, 888Poker, Winamax) e receba análise completa mão por mão considerando ICM, bubble factor, EV e recomendações GTO. Base de ranges GTO V2 adicionada (8-Max, HU, Three-Hand, Bounty) com interpolação por stack. Novo pop-up de novidades é exibido uma vez quando há atualizações.',
  },
  {
    version: '1.9.0',
    date: '18/06/2026',
    type: 'feature',
    title: 'Novo Rank "GTO Rei" e Novas Conquistas',
    description: 'Adicionado o rank supremo "GTO Rei" (250.000 XP) com efeito de LED dourado/azul pulsante. O rank "Lenda" foi atualizado para 100.000 XP com efeito leve de fogo pulsante. Adicionadas 10 novas conquistas mais desafiadoras: GTO Rei, Inabalável (streak 100), Sobrenatural (streak 200), Profissional/Veterano/Ironman (2.5k/5k/10k mãos), Perfeição Estendida, Sniper GTO, Solver Humano, 25 Best e 50 Best.',
  },
  {
    version: '1.8.1',
    date: '12/06/2026',
    type: 'improvement',
    title: 'Filtro de Ranking por Mês',
    description: 'O seletor de mês no Ranking agora inicia a partir de Fevereiro de 2026, alinhado ao início do período de competição da plataforma.',
  },
  {
    version: '1.8.0',
    date: '01/06/2026',
    type: 'feature',
    title: 'Teste de Nível Inicial',
    description: 'Após o onboarding, novos jogadores fazem um teste rápido de 10 mãos para definir seu nível inicial (Iniciante, Amador ou Intermediário). As mãos já são contabilizadas no Ranking.',
  },
  {
    version: '1.7.4',
    date: '01/06/2026',
    type: 'fix',
    title: 'Painel de Ações Reativo (Tabelas)',
    description: 'Corrigido bug em que o painel de "Ações" não atualizava ao clicar em mãos diferentes na matriz. Agora exibe o breakdown da mão selecionada (ou do range completo quando nenhuma mão está selecionada).',
  },
  {
    version: '1.7.3',
    date: '01/06/2026',
    type: 'improvement',
    title: 'Experiência Mobile Aprimorada',
    description: 'Cartas retangulares sem borda para visual mais limpo, jogadores reduzidos automaticamente no modo 8-max em telas pequenas, slider de raise com alvo maior para toque, e painel de informações da mão mais compacto.',
  },
  {
    version: '1.7.2',
    date: '01/06/2026',
    type: 'improvement',
    title: 'Banner de Avisos Fechável',
    description: 'O banner rotativo do topo agora pode ser fechado pelo botão "X". A preferência é mantida durante a sessão atual.',
  },
  {
    version: '1.7.1',
    date: '15/03/2026',
    type: 'feature',
    title: 'Tabelas Estilo GTO Wizard',
    description: 'Nova visualização de ranges com matriz 13x13 estilo GTO Wizard, suporte a estratégias mistas (gradientes), modo Cash 6-max como padrão, e link de afiliado GGPoker no menu lateral.',
  },
  {
    version: '1.7.0',
    date: '06/03/2026',
    type: 'feature',
    title: 'Stacks Dinâmicos Realistas',
    description: 'Oponentes agora recebem stacks variados e realistas baseados no modo de jogo e posição. O stack efetivo (menor entre herói e vilão) é usado para calcular os ranges GTO automaticamente, criando cenários mais desafiadores e próximos de mesas reais.',
  },

  {
    version: '1.6.1',
    date: '02/03/2026',
    type: 'feature',
    title: 'Filtro de Combos Bloqueados',
    description: 'Na simulação, a matriz agora filtra automaticamente combos impossíveis baseado nas cartas do herói e board. Mãos totalmente bloqueadas ficam esmaecidas e parcialmente bloqueadas mostram a quantidade de combos disponíveis.',
  },
  {
    version: '1.6.0',
    date: '02/03/2026',
    type: 'feature',
    title: 'Simulação Avançada em Tabelas',
    description: 'Novo modo Simulação com seletor de cartas do herói e board, análise de textura automática (monotone, two-tone, rainbow, conectividade, pareamento, draws) e detalhamento de sizing por raise.',
  },
  {
    version: '1.5.0',
    date: '11/02/2026',
    type: 'feature',
    title: 'Sistema de Conquistas',
    description: 'Novo sistema de conquistas com 18 achievements baseados em nível, sequência de acertos, volume de mãos e precisão. Notificações ao desbloquear e página dedicada no menu.',
  },
  {
    version: '1.4.1',
    date: '11/02/2026',
    type: 'improvement',
    title: 'Corte Progressivo de XP por Nível',
    description: 'Jogadores de níveis mais altos agora ganham menos XP: Intermediário -10%, Avançado -30%, Expert -50%, Mestre/Lenda -75%. Torna o ranking mais competitivo e justo.',
  },
  {
    version: '1.4.0',
    date: '11/02/2026',
    type: 'feature',
    title: 'Ícone de Nível no Ranking',
    description: 'O ranking agora exibe o ícone de ficha correspondente ao nível de cada jogador ao lado do nome, facilitando a identificação visual.',
  },
  {
    version: '1.3.2',
    date: '10/02/2026',
    type: 'improvement',
    title: 'Ranges Shorthanded (HU e Three Hand)',
    description: 'Mãos Ax suited e offsuit agora são corretamente avaliadas como jogáveis nos modos HU e Three Hand. Validação de cenários por posição aprimorada.',
  },
  {
    version: '1.3.1',
    date: '07/02/2026',
    type: 'fix',
    title: 'Correção do Modo Mesa Final',
    description: 'O modo Mesa Final agora aplica penalidades ICM reais: ranges mais tight, posições iniciais mais conservadoras e mãos especulativas perdem valor. Afeta Treinar e Tabelas.',
  },
  {
    version: '1.3.0',
    date: '07/02/2026',
    type: 'feature',
    title: 'Níveis com Imagens de Fichas',
    description: 'Os níveis de XP (Iniciante a Lenda) agora exibem imagens personalizadas de fichas de poker no lugar dos indicadores coloridos.',
  },
  {
    version: '1.2.4',
    date: '07/02/2026',
    type: 'improvement',
    title: 'Validação de Posições por Cenário',
    description: 'Posições impossíveis são bloqueadas automaticamente: UTG em "Vs Open Raise" e "Vs Open Shove", BB em "Vs 3-bet". O sistema remove seleções inválidas ao trocar de modo.',
  },
  {
    version: '1.2.3',
    date: '07/02/2026',
    type: 'feature',
    title: 'Menu Lateral: Aulas e Apoie',
    description: 'Nova aba "Aulas" (em breve) e link "Apoie" adicionados ao menu lateral. Banner de aulas gratuitas de poker GTO nos avisos.',
  },
  {
    version: '1.2.1',
    date: '05/02/2026',
    type: 'improvement',
    title: 'Melhorias de Interface',
    description: 'Menu lateral simplificado, sistema de avatares personalizados e possibilidade de favoritar mãos durante o treino.',
  },
  {
    version: '1.2.0',
    date: '04/02/2026',
    type: 'feature',
    title: 'Página de Acessibilidade',
    description: 'Nova seção dedicada à acessibilidade e apoio a projetos inclusivos como Aces Inclusivos.',
  },
  {
    version: '1.1.5',
    date: '03/02/2026',
    type: 'feature',
    title: 'Configurações de Perfil',
    description: 'Agora você pode alterar seu nickname e personalizar seu perfil através do menu de configurações.',
  },
  {
    version: '1.1.4',
    date: '02/02/2026',
    type: 'feature',
    title: 'Temas Light/Dark',
    description: 'Adicionada opção para alternar entre tema claro, escuro ou seguir as configurações do sistema.',
  },
  {
    version: '1.1.3',
    date: '01/02/2026',
    type: 'improvement',
    title: 'Cenários Aleatórios',
    description: 'Possibilidade de treinar com cenário, posição e stack aleatórios para maior diversidade.',
  },
  {
    version: '1.1.2',
    date: '31/01/2026',
    type: 'improvement',
    title: 'Visualizador de Range Completo',
    description: 'Após cada mão, agora você pode ver a matriz 13x13 completa do range GTO.',
  },
  {
    version: '1.1.1',
    date: '30/01/2026',
    type: 'fix',
    title: 'Proteção contra Farm de Pontos',
    description: 'Mãos já jogadas na sessão não podem mais ser rejogadas para ganhar pontos.',
  },
  {
    version: '1.1.0',
    date: '29/01/2026',
    type: 'feature',
    title: 'Sistema de Feedback Aprimorado',
    description: 'Novo sistema de feedback com categorias: Best, Correct, Inaccuracy, Mistake e Blunder.',
  },
  {
    version: '1.0.0',
    date: '28/01/2026',
    type: 'feature',
    title: 'Lançamento do GTORei',
    description: 'Versão inicial com treino de decisões pré-flop baseado em GTO para múltiplos cenários.',
  },
];

const typeConfig = {
  feature: { label: 'Nova Funcionalidade', icon: Sparkles, color: 'bg-primary/20 text-primary' },
  improvement: { label: 'Melhoria', icon: Wrench, color: 'bg-secondary/20 text-secondary' },
  fix: { label: 'Correção', icon: Bug, color: 'bg-muted text-muted-foreground' },
};

export default function UpdatesPage() {
  return (
    <MainLayout>
      <SEO
        title="Atualizações e Changelog — GTORei"
        description="Acompanhe as últimas novidades, melhorias e correções da plataforma GTORei, organizadas por versão."
        path="/atualizacoes"
      />
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-heading-md sm:text-heading-lg text-foreground flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            Atualizações
          </h1>
          <p className="text-body-sm text-muted-foreground mt-1">
            Novidades e melhorias do GTORei
          </p>
        </div>

        {/* Upcoming */}
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20 text-primary">
                <Rocket className="h-4 w-4" />
              </div>
              <CardTitle className="text-heading-xs">Próximos Passos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {UPCOMING.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-body-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Updates list */}
        <div className="space-y-4">
          {UPDATES.map((update, index) => {
            const config = typeConfig[update.type];
            const Icon = config.icon;

            return (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-heading-xs">{update.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-body-xs">
                            v{update.version}
                          </Badge>
                          <span className="text-body-xs text-muted-foreground">
                            {update.date}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge className={config.color}>
                      {config.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-body-sm text-muted-foreground">
                    {update.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
