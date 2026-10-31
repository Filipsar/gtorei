// Transforma o cache do cash (MODALIDADE=cash node scripts/build-open-ev.mjs)
// no arquivo TypeScript que o app importa. Uso: node scripts/emit-cash-ts.mjs
//
// Leva a abertura (fold ou abrir) e a resposta de cada vilão à abertura (fold,
// pagar ou 3-bet). O 3-bet all-in, que em 100 BB só aparece como resíduo de
// até ~1% dos combos, entra somado ao 3-bet.
import { readFileSync, writeFileSync } from 'node:fs';

const oe = JSON.parse(readFileSync('scripts/.cache/open-ev-cash.json', 'utf8'));
const { hands } = JSON.parse(readFileSync('scripts/.cache/equity-matrix.json', 'utf8'));
const p = oe.parametros;
const dec = (b) => [...Buffer.from(b, 'base64')];
const enc = (a) => Buffer.from(Uint8Array.from(a)).toString('base64');

const linhas = [];
linhas.push('// ARQUIVO GERADO por MODALIDADE=cash scripts/build-open-ev.mjs + emit-cash-ts.mjs — não editar à mão.');
linhas.push('// Cash 6-max 100 BB, calculado por EV até o equilíbrio (o mesmo método das');
linhas.push(`// aberturas de torneio): sem ante, rake de ${p.RAKE * 100}% com teto de ${p.TETO_RAKE} BB sobre o pote disputado.`);
linhas.push(`// Pós-flop por equity x realização (em posição ${p.REAL_EM_POSICAO}, fora ${p.REAL_FORA}); fora do BB,`);
linhas.push('// quem responde a uma abertura dá 3-bet ou folda (o modelo não tem pote multiway).');
linhas.push('');
linhas.push(`export const CASH_HANDS: string[] = ${JSON.stringify(hands)};`);
linhas.push('');
linhas.push('// "posição" -> frequência 0-100 de abrir (r) e EV contra foldar em décimos de BB (er). Base64.');
linhas.push('export const CASH_ABERTURA: Record<string, { r: string; er: string }> = {');
for (const [k, v] of Object.entries(oe.abertura)) {
  linhas.push(`  ${JSON.stringify(k.split('|')[1])}: { r: ${JSON.stringify(v.r)}, er: ${JSON.stringify(v.er)} },`);
}
linhas.push('};');
linhas.push('');
linhas.push('// "herói|vsVilão" -> frequência 0-100 de pagar (c) e de 3-bet (t). Base64.');
linhas.push('export const CASH_RESPOSTA: Record<string, { c: string; t: string }> = {');
for (const [k, v] of Object.entries(oe.resposta)) {
  const [, heroi, vs] = k.split('|');
  const t = dec(v.t).map((x, i) => Math.min(100, x + dec(v.u)[i]));
  linhas.push(`  ${JSON.stringify(`${heroi}|${vs}`)}: { c: ${JSON.stringify(v.c)}, t: ${JSON.stringify(enc(t))} },`);
}
linhas.push('};');

const conteudo = linhas.join('\n') + '\n';
writeFileSync('src/data/ranges/cash.generated.ts', conteudo);
console.log(`gerado src/data/ranges/cash.generated.ts — ${(conteudo.length / 1024).toFixed(1)} KB`);
