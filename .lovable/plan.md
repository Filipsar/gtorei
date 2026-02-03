
# Plano de Implementação - Correções GTORei

## Visao Geral

Este plano aborda 4 problemas principais identificados:
1. Ações de oponentes não visíveis em cenários VS
2. Layout e posicionamento da mesa
3. Sistema de pontuação muito alto
4. Fichas no pot não visíveis

---

## 1. Sistema de Estado de Mao (Hand State Machine)

### Arquivos Novos
- `src/data/handState.ts` - Gerenciador de estado da mao

### Funcionalidades
```text
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   PREFLOP   │───>│    FLOP     │───>│    TURN     │───>│   RIVER     │
│             │    │ 3 cartas    │    │ 1 carta     │    │ 1 carta     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
   Fold = End        Continua          Continua           Showdown
```

### Interface HandState
- `street`: preflop | flop | turn | river | showdown
- `pot`: valor atual do pot
- `communityCards`: cartas comunitarias (0-5)
- `actions`: historico de acoes da mao
- `activePlayer`: quem deve agir
- `villainCards`: cartas do oponente (reveladas no showdown)
- `heroCards`: cartas do heroi
- `villainPosition`: posicao do oponente que abriu
- `heroPosition`: posicao do heroi

### Logica de Continuacao
1. Se Hero FOLD: Mostrar feedback GTO
2. Se Hero CALL em cenarios VS:
   - Lidar flop/turn/river
   - Simular acoes do villain baseado em GTO
   - Revelar cartas no showdown
3. Se Hero RAISE/ALL-IN:
   - Simular resposta do villain (call/fold/4-bet)
   - Se call: runout completo + showdown
   - Se fold: hero ganha pot

---

## 2. Novo Componente PokerTable Melhorado

### Arquivo
- `src/components/poker/PokerTable.tsx` - Refatoracao completa

### Novas Funcionalidades

#### 2.1 Layout Fixo de Posicoes (8-max)
Posicoes calculadas com coordenadas absolutas ao redor da elipse:

```text
              ┌─────────────────────────────┐
              │     BB(25%)     UTG(35%)    │
              │                             │
         SB   │                             │  UTG+1
        (15%) │       ┌─────────────┐       │  (50%)
              │       │   GTORei    │       │
              │       │     POT     │       │
              │       └─────────────┘       │
         BTN  │                             │   LJ
        (85%) │                             │  (65%)
              │                             │
              │     CO(75%)       HJ(60%)   │
              └─────────────────────────────┘
```

#### 2.2 Cores por Posicao
- Vermelho (#E74C3C): UTG, UTG+1, LJ (Early Position)
- Laranja (#F39C12): HJ (Middle Position)
- Verde (#27AE60): CO, BTN (Late Position)
- Azul (#4A90E2): SB, BB (Blinds)

#### 2.3 Logo GTORei no Centro
- Texto semi-transparente no centro da mesa
- Acima do display do pot

#### 2.4 Indicadores de Acao do Villain
- Badge mostrando "Raise 2.5 BB" ou "3-bet 8 BB"
- Fichas visuais proximas a posicao do villain
- Jogadores foldados aparecem acinzentados

#### 2.5 Cartas Comunitarias
- Flop: 3 cartas centrais
- Turn: +1 carta
- River: +1 carta
- Animacao de reveal

### Props Adicionais
```typescript
interface PokerTableProps {
  // Existentes
  heroPosition: Position;
  heroCards: Card[];
  pot: number;
  heroStack: number;
  
  // Novos
  villainPosition?: Position;
  villainCards?: Card[];
  villainAction?: { action: string; amount: number };
  communityCards?: Card[];
  street?: 'preflop' | 'flop' | 'turn' | 'river';
  actionHistory?: Action[];
  foldedPositions?: Position[];
}
```

---

## 3. Componente de Fichas no Pot

### Arquivo Novo
- `src/components/poker/ChipStack.tsx`

### Funcionalidades
- Pilhas de fichas visuais (circulos coloridos empilhados)
- Cores por valor:
  - Verde (#27AE60): 25 BB
  - Vermelho (#E74C3C): 5 BB
  - Branco (#FFFFFF): 1 BB
  - Azul (#4A90E2): 0.5 BB
- Posicionamento proximo ao jogador que apostou
- Label com valor em BB
- Animacao de slide ao colocar fichas

---

## 4. Historico de Acoes

### Arquivo Novo
- `src/components/poker/ActionHistory.tsx`

### Funcionalidades
- Painel compacto mostrando acoes da mao
- Formato:
  ```text
  Preflop:
  - UTG raises 2.5BB
  - Folds to BB
  - BB 3-bets to 8BB
  → Action on Hero (UTG)
  ```
- Posicionado no topo ou lateral da mesa
- Scroll se necessario

---

## 5. Sistema de Pontuacao Balanceado

### Arquivo
- `src/data/gtoRanges.ts` - Modificar `calculateFeedback`

### Nova Tabela de Pontuacao (Reducao de ~85%)

| Categoria    | Pontos Antigos | Pontos Novos | Condicao              |
|--------------|----------------|--------------|------------------------|
| Best Move    | +100           | +15          | Acao GTO com freq >50% |
| Correct Move | +80-99         | +8 a +12     | Freq. 20-50%           |
| Inaccuracy   | +50            | +6           | Freq. 5-20%            |
| Mistake      | +20            | +2 a +5      | Freq. <5%, EV loss <0.5|
| Blunder      | -30            | -5 a -50     | Fora do range GTO      |

### Logica de Calculo
```typescript
function calculateFeedback(heroAction, handData) {
  const gtoFreq = getFrequency(heroAction);
  const evLoss = calculateEVLoss();
  
  if (gtoFreq >= 0.5) return { type: 'best', points: 15 };
  if (gtoFreq >= 0.2) return { type: 'correct', points: 8-12 };
  if (evLoss < 0.1) return { type: 'inaccuracy', points: 6 };
  if (evLoss < 0.5) return { type: 'mistake', points: 2-5 };
  return { type: 'blunder', points: -(evLoss * 100) }; // -5 a -50
}
```

### Progressao de Niveis Ajustada

| Nivel        | Pontos Antigos | Pontos Novos |
|--------------|----------------|--------------|
| Iniciante    | 0              | 0            |
| Amador       | 500            | 150          |
| Intermediario| 1500           | 450          |
| Avancado     | 3500           | 1000         |
| Expert       | 7000           | 2000         |
| Mestre       | 15000          | 4000         |
| Lenda        | 30000          | 8000         |

---

## 6. Atualizacao do TrainPage

### Arquivo
- `src/pages/TrainPage.tsx`

### Modificacoes

#### 6.1 Estado Expandido
```typescript
interface GameState {
  // Existentes
  hand: string;
  cards: Card[];
  position: Position;
  stack: number;
  pot: number;
  
  // Novos
  street: 'preflop' | 'flop' | 'turn' | 'river';
  communityCards: Card[];
  villainPosition: Position;
  villainCards: Card[];
  villainAction: { action: string; amount: number };
  actionHistory: ActionEntry[];
  foldedPositions: Position[];
}
```

#### 6.2 Inicializacao de Cenarios VS
Quando cenario for vsOpenRaise, vs3bet ou vsOpenShove:
1. Determinar posicao do villain (aleatoria ou baseada em cenario)
2. Calcular tamanho do raise/3-bet/shove
3. Calcular pot inicial com as apostas
4. Popular historico de acoes

#### 6.3 Fluxo de Continuacao Pos-Acao
```typescript
async function handleAction(heroAction) {
  if (heroAction === 'fold') {
    showFeedback();
    return;
  }
  
  // Atualizar pot
  updatePot(heroAction);
  
  if (street === 'preflop') {
    // Simular resposta do villain se necessario
    const villainResponse = simulateVillainResponse(heroAction);
    
    if (villainResponse === 'call' || heroAction === 'call') {
      // Lidar flop
      await dealFlop();
      // Simular acao pos-flop do villain
      await simulateVillainPostflop();
    }
  }
  
  // Continuar ate showdown ou fold
}
```

---

## 7. Componente DecisionFeedback Melhorado

### Arquivo
- `src/components/poker/DecisionFeedback.tsx`

### Novas Funcionalidades

#### 7.1 Barra de Frequencias com Todas as Acoes
- Mostrar fold/call/raise/allin com barras coloridas
- Destacar acao do usuario
- Mostrar % para cada acao

#### 7.2 Explicacoes Contextuais
- Texto explicando por que a acao GTO e melhor
- Dicas de aprendizado para blunders

#### 7.3 Botao Revisar Mao
- Permite voltar e ver a situacao novamente
- Ver cartas comunitarias e cartas do villain

---

## 8. Resumo de Arquivos

### Arquivos Novos
1. `src/data/handState.ts` - Estado da mao
2. `src/components/poker/ChipStack.tsx` - Fichas visuais
3. `src/components/poker/ActionHistory.tsx` - Historico de acoes
4. `src/components/poker/CommunityCards.tsx` - Cartas comunitarias
5. `src/components/poker/PlayerSeat.tsx` - Componente de assento do jogador

### Arquivos Modificados
1. `src/components/poker/PokerTable.tsx` - Layout completo
2. `src/data/gtoRanges.ts` - Pontuacao balanceada
3. `src/data/localStorage.ts` - Thresholds de nivel
4. `src/pages/TrainPage.tsx` - Logica de jogo expandida
5. `src/components/poker/DecisionFeedback.tsx` - Feedback melhorado

---

## 9. Ordem de Implementacao

```text
Fase 1: Sistema de Pontuacao
├── Ajustar calculateFeedback()
├── Atualizar thresholds de nivel
└── Testar feedback

Fase 2: Layout da Mesa
├── Criar PlayerSeat
├── Refatorar PokerTable
├── Adicionar logo central
└── Implementar cores por posicao

Fase 3: Visualizacao de Fichas e Acoes
├── Criar ChipStack
├── Criar ActionHistory
└── Integrar com PokerTable

Fase 4: Estado de Mao Completo
├── Criar handState
├── Criar CommunityCards
├── Implementar logica de cenarios VS
├── Simular respostas do villain
└── Implementar runout completo

Fase 5: Feedback Melhorado
├── Atualizar DecisionFeedback
├── Adicionar explicacoes
└── Melhorar visualizacao de frequencias
```

---

## 10. Secao Tecnica

### Detalhes de Implementacao

#### Calculo de Posicao do Villain
Para cenarios VS, o villain e determinado assim:
- **Vs Open Raise**: Villain em posicao anterior ao hero (ex: hero BB, villain CO)
- **vs 3-bet**: Villain em posicao posterior (ex: hero UTG abre, villain BB 3-beta)
- **Vs Open Shove**: Villain em posicao anterior com all-in

#### Geracao de Cartas Comunitarias
```typescript
function dealBoard(): Card[] {
  const deck = generateDeck();
  const usedCards = [...heroCards, ...villainCards];
  const available = deck.filter(c => !usedCards.includes(c));
  return shuffleAndDraw(available, 5);
}
```

#### Simulacao de Resposta do Villain
Baseado em frequencias GTO mockadas:
- Se hero raise e villain tem mao forte: call 60%, 4-bet 30%, fold 10%
- Se hero raise e villain tem mao fraca: fold 90%, call 10%
- Usar mesma estrutura de dados de frequencias

#### Animacoes
- Fichas: slide com duration 300ms
- Cartas comunitarias: flip com duration 500ms
- Reveal de cartas do villain: fade-in com delay

### Compatibilidade Mobile
- Scroll horizontal na mesa se necessario
- Botoes de acao empilhados em 2x2
- Historico colapsavel
