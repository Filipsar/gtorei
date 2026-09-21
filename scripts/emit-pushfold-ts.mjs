// Transforma o cache do solver no arquivo TypeScript que o app importa.
import { readFileSync, writeFileSync } from 'node:fs';

const pf = JSON.parse(readFileSync('scripts/.cache/pushfold.json', 'utf8'));
const { hands } = JSON.parse(readFileSync('scripts/.cache/equity-matrix.json', 'utf8'));

const linhas = [];
linhas.push('// ARQUIVO GERADO por scripts/build-pushfold.mjs — não editar à mão.');
linhas.push('// Ranges de push/fold calculadas por EV (chipEV, stacks iguais, sem ante),');
linhas.push('// iterando melhor-resposta amortecida até o equilíbrio, sobre uma matriz');
linhas.push('// de equity 169x169 gerada por Monte Carlo (12 mil simulações por confronto).');
linhas.push('');
linhas.push(`export const PF_HANDS: string[] = ${JSON.stringify(hands)};`);
linhas.push('');
linhas.push('// chave: "modo|posição|stack" -> frequências 0-100 por mão (base64) e EV em décimos de bb');
linhas.push('export const PF_SHOVE: Record<string, { f: string; ev: string }> = {');
for (const [k, v] of Object.entries(pf.shove)) {
  linhas.push(`  ${JSON.stringify(k)}: { f: ${JSON.stringify(v.freq)}, ev: ${JSON.stringify(v.ev)} },`);
}
linhas.push('};');
linhas.push('');
linhas.push('// chave: "modo|posição|vsPosição|stack" -> range de pagamento contra aquele all-in');
linhas.push('export const PF_CALL: Record<string, { f: string; ev: string }> = {');
for (const [k, v] of Object.entries(pf.call)) {
  linhas.push(`  ${JSON.stringify(k)}: { f: ${JSON.stringify(v.freq)}, ev: ${JSON.stringify(v.ev)} },`);
}
linhas.push('};');
linhas.push('');
linhas.push(`export const PF_STACKS = [8, 9, 10, 12, 14, 17, 20];`);
linhas.push('');
linhas.push(`// Decodifica base64 -> array de números por mão`);
linhas.push(`export function decodePF(b64: string, assinado = false): number[] {`);
linhas.push(`  const bin = typeof atob === 'function' ? atob(b64) : '';`);
linhas.push(`  const out: number[] = [];`);
linhas.push(`  for (let i = 0; i < bin.length; i++) {`);
linhas.push(`    const v = bin.charCodeAt(i);`);
linhas.push(`    out.push(assinado && v > 127 ? v - 256 : v);`);
linhas.push(`  }`);
linhas.push(`  return out;`);
linhas.push(`}`);

const conteudo = linhas.join('\n') + '\n';
writeFileSync('src/data/ranges/pushfold.generated.ts', conteudo);
console.log(
  `gerado src/data/ranges/pushfold.generated.ts — ${(conteudo.length / 1024).toFixed(0)} KB, ` +
  `${Object.keys(pf.shove).length} ranges de shove e ${Object.keys(pf.call).length} de pagamento`
);
