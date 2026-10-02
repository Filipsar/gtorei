// Transforma o cache de scripts/build-open-ev.mjs no arquivo TypeScript que o
// app importa. Uso: node scripts/emit-open-ev-ts.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const oe = JSON.parse(readFileSync('scripts/.cache/open-ev.json', 'utf8'));
const { hands } = JSON.parse(readFileSync('scripts/.cache/equity-matrix.json', 'utf8'));
const stacks = [...new Set(Object.keys(oe.abertura).map((k) => Number(k.split('|')[2])))].sort((a, b) => a - b);
const p = oe.parametros;

const linhas = [];
linhas.push('// ARQUIVO GERADO por scripts/build-open-ev.mjs + emit-open-ev-ts.mjs — não editar à mão.');
linhas.push('// Ranges de ABERTURA (primeiro a entrar no pote) calculadas por EV, até o');
linhas.push('// equilíbrio: fold, abrir pequeno ou all-in, com ante de big blind de');
linhas.push(`// ${p.ANTE} BB. O pós-flop entra como equity x realização (em posição ${p.REAL_EM_POSICAO},`);
linhas.push(`// fora ${p.REAL_FORA}, vezes a jogabilidade da mão); as simplificações estão no`);
linhas.push('// cabeçalho do build-open-ev.mjs.');
linhas.push('');
linhas.push(`export const OE_HANDS: string[] = ${JSON.stringify(hands)};`);
linhas.push('');
linhas.push(`export const OE_STACKS = ${JSON.stringify(stacks)};`);
linhas.push('');
linhas.push('// chave "modo|posição|stack" -> frequências 0-100 por mão de abrir pequeno (r)');
linhas.push('// e de all-in (j), e EV de cada uma contra foldar, em décimos de BB (er, ej).');
linhas.push('// Base64; decodificar com decodePF de pushfold.generated.ts.');
linhas.push('export const OE_ABERTURA: Record<string, { r: string; j: string; er: string; ej: string }> = {');
for (const [k, v] of Object.entries(oe.abertura)) {
  linhas.push(`  ${JSON.stringify(k)}: { r: ${JSON.stringify(v.r)}, j: ${JSON.stringify(v.j)}, er: ${JSON.stringify(v.er)}, ej: ${JSON.stringify(v.ej)} },`);
}
linhas.push('};');

const conteudo = linhas.join('\n') + '\n';
writeFileSync('src/data/ranges/openev.generated.ts', conteudo);
console.log(`gerado src/data/ranges/openev.generated.ts — ${(conteudo.length / 1024).toFixed(0)} KB, ${Object.keys(oe.abertura).length} ranges de abertura`);
