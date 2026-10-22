/** Dias até o fim do período, contando hoje (datas em AAAA-MM-DD, dia de Brasília) */
export function diasRestantes(fim: string, hoje = new Date()): number {
  const hojeBr = new Date(hoje.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) + 'T00:00:00Z');
  const fimDia = new Date(fim + 'T00:00:00Z');
  return Math.max(1, Math.round((fimDia.getTime() - hojeBr.getTime()) / 86_400_000) + 1);
}
