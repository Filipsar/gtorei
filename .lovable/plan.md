

## Aperfeiçoamento do Sistema de Ranking

### 1. Corte progressivo de XP por nivel

Atualmente o sistema ja tem multiplicadores de ganho por nivel em `useScoring.ts`. Vamos ajustar os valores para refletir os cortes solicitados:

- Iniciante (nivel 1): 100% (sem corte)
- Amador (nivel 2): 100% (sem corte)
- Intermediario (nivel 3): 90% (corte de 10%)
- Avancado (nivel 4): 70% (corte de +20%, total 30%)
- Expert (nivel 5): 50% (corte de +20%, total 50%)
- Mestre (nivel 6): 25% (corte de +25%, total 75%)
- Lenda (nivel 7): 25% (mantido igual ao Mestre)

**Arquivo:** `src/hooks/useScoring.ts`
- Atualizar o array `LEVEL_MULTIPLIERS.gain` de `[1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4]` para `[1.0, 1.0, 0.9, 0.7, 0.5, 0.25, 0.25]`

### 2. Icone de nivel ao lado do nome no Ranking

**Arquivo:** `src/pages/RankingPage.tsx`
- Criar um mapeamento de nivel para imagem (ja existem os imports de `levelIniciante`, `levelAmador`, etc.)
- Adicionar a imagem do nivel ao lado do nome do jogador na lista de ranking, usando `entry.profile.level` para selecionar o icone correto
- Exibir como uma imagem pequena (16x16 ou 20x20) entre o avatar e o nome

### Detalhes Tecnicos

Alteracoes em 2 arquivos:
- `src/hooks/useScoring.ts`: Ajuste dos multiplicadores de ganho
- `src/pages/RankingPage.tsx`: Adicionar helper `getLevelImage(level)` e renderizar o icone ao lado do username
