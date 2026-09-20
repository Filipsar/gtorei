# GTORei

NOME DO PROJETO: GTORei
🎯 Visão Geral do Projeto
Crie uma aplicação web completa de treinamento de poker GTO (Game Theory Optimal) com sistema de pontuação e ranking, similar ao GTO Wizard. A aplicação deve permitir que usuários pratiquem decisões de poker em diferentes cenários, recebam feedback instantâneo e acompanhem seu progresso através de estatísticas e leaderboards.

🎨 Design e Interface
Tema Visual

Paleta de cores: Tema escuro predominante (fundo #1a1a1a a #2a2a2a)
Cor de destaque: Dourado/amarelo (#FFB800) para botões principais e elementos importantes
Cor secundária: Azul (#4A90E2) para elementos interativos
Tipografia: Sans-serif moderna (Inter, Poppins ou similar)
Estilo: Minimalista, profissional, focado em usabilidade

Layout Responsivo

Design mobile-first
Adaptação perfeita para tablet e desktop
Menu lateral colapsável em dispositivos móveis


🏗️ Estrutura de Navegação
Menu Principal (Sidebar)

Treinar ⚡ - Página principal de treinamento
Tabelas 📊 - Visualização de ranges por ChipEV
Análise 📈 - Estatísticas de desempenho
Autoanálise 🤖 - Review de mãos jogadas
Favoritos ⭐ - Cenários salvos


📱 Funcionalidades Principais
1. Página de Treino Rápido (Treino Rápido)
Configurações de Cenário
Cenário (Scenario Selection)

Botões de seleção múltipla:

Open Raise (destaque padrão)
Vs Open Raise
vs 3-bet
Vs Open Shove


Toggle: "Modo Mesa Final" (Final Table Mode)

Stack (Tamanhos de Stack)

Seleção de big blinds em grade:

8 BB, 9 BB, 10 BB, 12 BB, 14 BB, 17 BB, 20 BB, 25 BB
30 BB, 35 BB, 40 BB, 50 BB, 60 BB, 80 BB, 100 BB (destaque padrão: 30BB)


Toggle: "Aleatório" para randomizar stacks

Posição (Position)

Grade de posições:

UTG (Under the Gun) - destaque padrão
UTG+1, LJ (Low Jack), HJ (High Jack)
CO (Cut-off), BTN (Button), SB (Small Blind), BB (Big Blind)


Toggle: "Aleatório" para randomizar posições

Resumo da Configuração
Painel inferior mostrando:

Modo: Normal/Mesa Final
Cenários: Cenário selecionado
Posição: Posição atual
Stack: Tamanho do stack
Mesa: Configuração da mesa (ex: 8-max)

Botão de Início

Botão grande e destacado: "JOGAR" (amarelo/dourado)


2. Página de Ranges por ChipEV
Filtros Superiores

Cenário: Dropdown com opções (Open Raise, vs Open Raise, vs 3-bet, Vs Open Shove)
Stack: Chips de seleção (8 BB até 100 BB) - padrão: 30 BB
Posição: Chips de seleção (UTG, UTG+1, LJ, HJ, CO, BTN, SB, BB) - padrão: UTG
Toggle: "Mesa Final"

Matriz de Ranges (Hand Matrix)

Grid 13x13 mostrando todas as combinações de mãos (AA até 22, AKs até 32o)
Código de cores:

🔴 Vermelho escuro: All-in
🔴 Vermelho claro: Raise
🟢 Verde: Call
🔵 Azul: Fold
Gradientes para frequências mistas


Hover: Ao passar o mouse, mostrar:

Mão específica
Ação recomendada
Frequência (%) de cada ação
EV (Expected Value)



Legenda

Ícones e cores explicando cada ação

Painel Lateral (opcional)

"Clique em uma mão para ver os detalhes"
Quando selecionada: estatísticas detalhadas da mão


3. Interface de Treino (Training Game)
Mesa de Poker Virtual
Elementos visuais:

Representação da mesa (oval/retangular)
Posições dos jogadores claramente marcadas
Cartas do herói visíveis (2 cartas)
Informações do pote
Ações dos oponentes (histórico da mão)

Painel de Informações

Stack atual
Posição
Pot size
Ação anterior dos oponentes

Botões de Ação
Botões grandes e responsivos:

Fold (cinza)
Call (azul)
Raise (verde) - com slider para tamanho do raise
All-in (vermelho)

Feedback Instantâneo
Após cada decisão, mostrar:

✅ Melhor Jogada (Best Move): Ação ótima
✔️ Jogada Correta (Correct Move): Ação aceitável
⚠️ Imprecisão (Inaccuracy): Pequeno erro
❌ Erro (Mistake): Erro significativo
💥 Blunder: Erro grave

Modal de Feedback:

Ação escolhida vs. Ação GTO
Perda de EV (se aplicável)
Frequências corretas para cada ação
Explicação breve do raciocínio GTO
Botão: "Próxima Mão" ou "Rever Decisão"

Sistema de Pontuação

Pontos ganhos/perdidos por decisão
Score GTO: Pontuação acumulada na sessão (0-100)
Barra de progresso visual


4. Situações (Situations/Drills)
Biblioteca de Cenários
Grid de cards mostrando diferentes situações:
Informações em cada card:

Título: "Jogando pós-flop - Turn?" / "Enfrentando Squeeze do FIELD"
Tags: Tipo de jogo (C-bet in pot 3bet, Vs Squeeze, Flop, Turn)
Posição e cartas: Ex: "Hero: A♠ T♥" com ícones de cartas
Detalhes: Posição (SB, UTG+1, CO, BB, BTN), stack size (ex: 8-max, 7-max, 6-max)
Recompensa: Ícone de troféu + pontos (ex: "10 pts")
Botão: "Jogar" (amarelo)
Favoritar: Ícone de estrela

Filtros
Dropdowns para:

Progresso: Todos conceitos / Completos / Incompletos
Modo: Todos / Cash / Tournaments / Spins
Street: Todos streets / Preflop / Flop / Turn / River
Conceitos: Todos / específicos

Barra de Progresso Geral

"Progresso: 0 de 120 (0%)"
Barra visual de conclusão


5. Sistema de Ranking e Leaderboard
Leaderboard Global
Tabela classificatória mostrando:

Rank (#1, #2, #3...)
Avatar/Username
Score Total
Precisão GTO (%): Taxa de acertos
Hands Played: Número de mãos treinadas
Streak: Sequência de acertos consecutivos
Badge/Tier: Níveis (Bronze, Prata, Ouro, Platina, Diamante, Lenda)

Filtros de Leaderboard

Por período: Hoje / Semana / Mês / Todos os tempos
Por categoria: Geral / Preflop / Postflop / Específico por posição

Sistema de Níveis
Progressão de níveis:

Iniciante (0-500 pts)
Amador (500-1500 pts)
Intermediário (1500-3500 pts)
Avançado (3500-7000 pts)
Expert (7000-15000 pts)
Mestre (15000-30000 pts)
Lenda (30000+ pts)

Benefícios por nível:

Desbloqueio de situações avançadas
Badges exclusivos
Estatísticas detalhadas


6. Página de Análise (Analytics)
Dashboard de Estatísticas
Métricas principais:

Score GTO médio: Gráfico de linha mostrando evolução
Taxa de precisão: Por tipo de decisão (Fold/Call/Raise/All-in)
Distribuição de erros: Gráfico de pizza (Best/Correct/Inaccuracy/Mistake/Blunder)
Mãos treinadas: Total e por categoria
Tendências: Identificação de padrões de erro

Análise por Posição

Estatísticas separadas por posição (UTG, BTN, BB, etc.)
Heatmap de performance

Análise por Stack Size

Performance em diferentes stack sizes
Identificação de leaks

Histórico de Sessões

Lista de sessões anteriores com:

Data e duração
Mãos jogadas
Score obtido
Principais erros




7. Configurações de Usuário
Perfil

Avatar customizável
Username
País/Região
Bio breve

Preferências de Treino

Dificuldade: Fácil / Médio / Difícil / Customizado
Tempo por decisão: Ilimitado / 30s / 15s / 7s
Som e notificações
Modo de exibição: Detalhado / Simplificado

Customização de Ranges

Criar ranges personalizados (feature premium)
Importar/Exportar ranges


🎮 Funcionalidades Técnicas
Sistema de Autenticação

Login com email/senha
Login social (Google, Facebook)
Recuperação de senha
Verificação de email

Banco de Dados
Estrutura de dados:

Users: id, username, email, avatar, level, totalScore, createdAt
Sessions: id, userId, date, handsPlayed, score, duration, errors
Hands: id, sessionId, scenario, position, stack, heroCards, action, correctAction, result, evLoss, timestamp
Leaderboard: userId, rank, score, accuracy, handsPlayed, lastUpdated
CustomRanges: userId, rangeName, positions, scenarios, matrix

Cálculos GTO

Simulador de ranges: Pré-calculados para diferentes cenários
Avaliador de decisões: Compara ação do usuário com GTO
Calculadora de EV: Calcula perda/ganho esperado

Sistema de Pontuação
Pontuação por decisão:
- Best Move: +100 pontos
- Correct Move: +80-99 pontos (baseado na frequência)
- Inaccuracy: +40-79 pontos
- Mistake: +10-39 pontos
- Blunder: -50 a 0 pontos (baseado na perda de EV)

🔧 Stack Tecnológico Sugerido
Frontend

Framework: React com TypeScript
Styling: Tailwind CSS
Animações: Framer Motion
Gráficos: Chart.js ou Recharts
State Management: Zustand ou Context API
Routing: React Router

Backend

Database: Supabase (PostgreSQL)
Authentication: Supabase Auth
Storage: Supabase Storage (para avatares)
Real-time: Supabase Realtime (para leaderboard)

Features Adicionais

PWA: Funcionar offline
Responsive: Mobile-first
Acessibilidade: WCAG 2.1 AA


📊 Modelo de Monetização (Futuro)
Plano Gratuito

10 mãos por dia
Acesso a cenários básicos
Leaderboard visualização
Estatísticas básicas

Plano Premium

Mãos ilimitadas
Todos os cenários e situações
Análise avançada
Ranges customizados
Sem anúncios
Suporte prioritário
Badge exclusivo

Plano Pro

Tudo do Premium +
Sessões de coaching (futuro)
Análise de HUD
Ferramentas avançadas
Acesso antecipado a novos features


🚀 Prioridades de Desenvolvimento
Fase 1 - MVP

Sistema de autenticação
Configurador de treino rápido
Interface de jogo básica
Feedback de decisões
Sistema de pontuação básico

Fase 2 - Core Features

Página de ranges por ChipEV
Sistema de ranking/leaderboard
Biblioteca de situações
Dashboard de análise básico

Fase 3 - Advanced

Autoanálise de mãos
Ranges customizados
Sistema de assinatura
Modo multiplayer/desafios


📝 Notas Importantes

Dados de Ranges: Você precisará de um conjunto de dados GTO pré-calculados para diferentes cenários. Considere usar solvers existentes ou parcerias.
Performance: Cache as ranges mais usados para reduzir latência.
Responsividade: A matriz de ranges 13x13 precisa funcionar bem em mobile (considere scroll horizontal ou view alternativa).
Feedback Visual: Use animações suaves para tornar o feedback mais envolvente.
Gamificação: Badges, conquistas e desafios diários aumentam engajamento.


🎨 Componentes UI Principais
1. RangeMatrix Component

Grid 13x13 interativo
Color coding por ação
Tooltip com detalhes
Modo de edição (para custom ranges)

2. PokerTable Component

Representação visual da mesa
Animações de cartas
Indicadores de ação
Informações do pot

3. DecisionFeedback Component

Modal/overlay com feedback
Comparação visual de ações
Gráficos de frequência
Explicação contextual

4. LeaderboardTable Component

Tabela sortável
Filtros e busca
Destaque do usuário atual
Animações de rank changes

5. StatsDashboard Component

Cards de métricas
Gráficos de performance
Filtros por período
Export de dados

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://gtorei.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8e6604ba-ec7b-4e87-82d0-e13ad897b6f6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
