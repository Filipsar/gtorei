

## Aperfeiçoamento do Sistema de Ranking

### 1. Corte progressivo de XP por nivel

Atualmente o sistema ja tem multiplicadores de ganho por nivel em `useScoring.ts`. Valores ajustados:

- Iniciante (nivel 1): 130% (bonus)
- Amador (nivel 2): 115% (bonus leve)
- Intermediario (nivel 3): 100% (neutro)
- Avancado (nivel 4): 80% (corte de 20%)
- Expert (nivel 5): 60% (corte de 40%)
- Mestre (nivel 6): 35% (corte de 65%)
- Lenda (nivel 7): 20% (corte de 80%)

### 2. Thresholds de XP por Rank

- Iniciante: 0 XP
- Amador: 150 XP
- Intermediário: 1.000 XP
- Avançado: 2.000 XP
- Expert: 3.000 XP
- Mestre: 8.000 XP
- Lenda: 12.000 XP

### 3. Dificuldade por Rank

A partir do Intermediário (nível 3), o sistema gera mãos marginais com maior frequência, aumentando a dificuldade das decisões:

- Iniciante/Amador: 0% de bias (mãos totalmente aleatórias)
- Intermediário: 25% de chance de mão marginal
- Avançado: 40%
- Expert: 55%
- Mestre: 65%
- Lenda: 75%

Mãos marginais incluem: suited connectors, suited aces baixos, broadways offsuit, pares médios/baixos, suited kings/queens médios, e aces offsuit — todas situações de decisão complexa no GTO.

### 4. Icone de nivel ao lado do nome no Ranking

Implementado com mapeamento `LEVEL_IMAGES` e renderização de ícone ao lado do username.
