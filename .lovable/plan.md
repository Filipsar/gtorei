
# Plano de Implementação - GTORei 🎯

## 1. Fundação Visual e Layout
- **Tema escuro personalizado** com a paleta definida (#1a1a1a fundo, #FFB800 dourado destaque, #4A90E2 azul secundário)
- **Sidebar responsiva** com ícones e navegação para: Treinar ⚡, Tabelas 📊, Análise 📈, Autoanálise 🤖, Favoritos ⭐
- **Design mobile-first** com menu colapsável em dispositivos móveis
- **Tipografia moderna** usando Inter como fonte principal

---

## 2. Sistema de Treino (Prioridade Alta)

### Página de Treino Rápido
- Seletor de **Cenário** com botões: Open Raise, Vs Open Raise, vs 3-bet, Vs Open Shove
- Grid de **Stack sizes**: 8BB a 100BB com opção "Aleatório"
- Grid de **Posições**: UTG a BB com opção "Aleatório"
- Toggle "Modo Mesa Final"
- Painel de resumo das configurações
- Botão destacado "JOGAR" em dourado

### Interface de Jogo
- **Mesa de poker visual** com posições claramente marcadas
- Exibição das **cartas do herói** (2 cartas)
- Informações de **pot, stack e posição**
- **Botões de ação**: Fold (cinza), Call (azul), Raise (verde), All-in (vermelho)
- Slider para sizing do raise

### Sistema de Feedback
- **Modal de resultado** após cada decisão mostrando:
  - ✅ Best Move / ✔️ Correct / ⚠️ Inaccuracy / ❌ Mistake / 💥 Blunder
  - Ação escolhida vs. Ação GTO
  - Perda de EV (quando aplicável)
  - Frequências corretas para cada ação
- **Barra de progresso** com Score GTO da sessão (0-100)
- Sistema de pontuação: +100 (Best) até -50 (Blunder)

---

## 3. Visualização de Ranges (Prioridade Alta)

### Matriz de Ranges 13x13
- Grid interativo mostrando todas as combinações (AA até 22)
- **Código de cores por ação**:
  - 🔴 Vermelho escuro: All-in
  - 🔴 Vermelho claro: Raise
  - 🟢 Verde: Call
  - 🔵 Azul: Fold
  - Gradientes para frequências mistas
- **Hover tooltip** com: mão, ação recomendada, frequência (%)

### Filtros e Controles
- Dropdown de **Cenário**: Open Raise, vs Open Raise, vs 3-bet, etc.
- Chips de seleção para **Stack** (8-100 BB)
- Chips de seleção para **Posição** (UTG a BB)
- Toggle "Mesa Final"
- Legenda visual explicando as cores/ações

### Painel de Detalhes
- Ao clicar numa mão, exibir estatísticas detalhadas
- EV por ação
- Frequências recomendadas

---

## 4. Análise e Estatísticas

### Dashboard Principal
- **Score GTO médio** com gráfico de linha (evolução ao longo do tempo)
- **Taxa de precisão** por tipo de decisão (Fold/Call/Raise/All-in)
- **Distribuição de resultados** em gráfico de pizza (Best/Correct/Inaccuracy/Mistake/Blunder)
- **Total de mãos treinadas** por categoria
- **Identificação de tendências** e padrões de erro

### Análise por Posição
- Cards mostrando performance em cada posição (UTG, BTN, BB, etc.)
- Heatmap visual de acertos/erros

### Histórico de Sessões
- Lista de sessões anteriores com:
  - Data e duração
  - Mãos jogadas
  - Score obtido
  - Principais erros cometidos

---

## 5. Armazenamento Local (localStorage)

### Dados Persistentes
- **Perfil do usuário**: username, avatar, nível, pontuação total
- **Histórico de sessões**: data, mãos, score, duração
- **Mãos jogadas**: cenário, posição, stack, ação, resultado, EV
- **Favoritos**: cenários salvos pelo usuário
- **Configurações**: preferências de treino

### Dados Mockados GTO
- Ranges pré-calculados para cada combinação de cenário/posição/stack
- Frequências e EVs para cada ação possível
- Estruturados de forma que possam ser facilmente substituídos por dados reais futuramente

---

## 6. Componentes Principais

### Componente RangeMatrix
- Grid 13x13 interativo e responsivo
- Color coding dinâmico por frequência
- Tooltips informativos
- Adaptação para mobile (scroll horizontal ou view alternativa)

### Componente PokerTable
- Mesa oval visual
- Indicadores de posição
- Animações suaves para cartas
- Display do pot e stacks

### Componente DecisionFeedback
- Modal overlay com animação
- Comparação visual lado a lado
- Gráfico de frequências
- Botões "Próxima Mão" e "Rever"

### Componente StatsDashboard
- Cards de métricas com ícones
- Gráficos interativos (Recharts)
- Filtros por período

---

## Resumo da Entrega

| Feature | Descrição |
|---------|-----------|
| 🎨 UI/UX | Tema escuro profissional com cores da marca |
| 📱 Responsivo | Mobile-first com sidebar colapsável |
| 🎮 Treino | Configurador completo + jogo interativo |
| 📊 Ranges | Matriz 13x13 com visualização detalhada |
| 📈 Análise | Dashboard com gráficos e estatísticas |
| 💾 Storage | localStorage para persistência |
| 🎲 Dados | Ranges mockados realistas |

O sistema será totalmente funcional com dados mockados, permitindo que você teste a experiência completa antes de integrar dados GTO reais ou um backend.
