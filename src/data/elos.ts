// Elos das ligas (migrations 20261024130000_ligas_por_elo e 20261024150000_ligas_diarias).
// O número é o que o banco guarda em liga_jogador.elo.

export interface Elo {
  numero: number;
  nome: string;
  /** Degradê do brasão, de cima para baixo */
  claro: string;
  escuro: string;
  borda: string;
  /** Cor do símbolo no meio do brasão */
  tinta: string;
  /** Fogo azul atrás do brasão */
  fogo?: 'leve' | 'forte';
}

export const ELOS: Elo[] = [
  { numero: 1, nome: 'Bronze', claro: '#E9A974', escuro: '#8C4F24', borda: '#5E3315', tinta: '#2B1608' },
  { numero: 2, nome: 'Prata', claro: '#F4F6F9', escuro: '#9AA3AF', borda: '#5F6773', tinta: '#1F2937' },
  { numero: 3, nome: 'Ouro', claro: '#FFE27A', escuro: '#D99A00', borda: '#8A6100', tinta: '#3B2A00' },
  { numero: 4, nome: 'Adamantio', claro: '#6EE7B7', escuro: '#0F7A5C', borda: '#064E3B', tinta: '#022C22' },
  { numero: 5, nome: 'Rúnico', claro: '#7DD3FC', escuro: '#1E6FA8', borda: '#0C3D66', tinta: '#04223B' },
  { numero: 6, nome: 'Diamante', claro: '#E6FAFF', escuro: '#5AB8F0', borda: '#1D6FA5', tinta: '#073047', fogo: 'leve' },
  { numero: 7, nome: 'Rei', claro: '#FDE68A', escuro: '#1E3A8A', borda: '#FBBF24', tinta: '#FFFFFF', fogo: 'forte' },
];

export const ELO_REI = 7;

/**
 * A disputa é diária (migration 20261024150000_ligas_diarias.sql): no fim do
 * dia, dentro de cada elo, os `sobem` primeiros (com XP no dia) sobem um elo e
 * quem termina da posição `caiA` para baixo cai um. No Rei ficam os 10
 * primeiros. A mesma tabela está no SQL (_regra_do_elo): mudou lá, muda aqui.
 */
export interface RegraDoElo {
  sobem: number;
  /** Desta posição para baixo cai (nulo: ninguém cai) */
  caiA: number | null;
}

export const REGRAS_DOS_ELOS: Record<number, RegraDoElo> = {
  1: { sobem: 10, caiA: null },
  2: { sobem: 10, caiA: 20 },
  3: { sobem: 10, caiA: 20 },
  4: { sobem: 6, caiA: 15 },
  5: { sobem: 6, caiA: 10 },
  6: { sobem: 3, caiA: 10 },
  7: { sobem: 0, caiA: 11 },
};

export const regraDoElo = (n: number): RegraDoElo => REGRAS_DOS_ELOS[n] ?? REGRAS_DOS_ELOS[1];

export function eloPorNumero(n: number | null | undefined): Elo {
  return ELOS.find((e) => e.numero === n) ?? ELOS[0];
}
