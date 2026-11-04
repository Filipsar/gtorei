// Transforma o cache de scripts/build-open-ev.mjs no arquivo TypeScript que o
// app importa. Uso: node scripts/emit-open-ev-ts.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const oe = JSON.parse(readFileSync('scripts/.cache/open-ev.json', 'utf8'));
// Respostas à abertura: da rodada TODOS_PAGAM=1 (quem tem posição pode pagar; ver build-open-ev.mjs)
const resp = JSON.parse(readFileSync('scripts/.cache/open-ev-respostas.json', 'utf8'));
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
linhas.push('');
linhas.push('// Respostas à abertura (vsOpenRaise), da rodada em que quem tem posição pode pagar:');
linhas.push('// chave "modo|herói|vsQuemAbriu|stack" -> frequências 0-100 de pagar (c), 3-bet pequeno (t)');
linhas.push('// e 3-bet all-in (u). Base64; texto vazio = nenhuma mão faz aquilo. Com ante de 1 BB.');
linhas.push('export const OE_RESPOSTA: Record<string, { c: string; t: string; u: string }> = {');
const vazio = (b) => (Buffer.from(b, 'base64').every((x) => x === 0) ? '' : b);
for (const [k, v] of Object.entries(resp.resposta)) {
  linhas.push(`  ${JSON.stringify(k)}: { c: ${JSON.stringify(vazio(v.c))}, t: ${JSON.stringify(vazio(v.t))}, u: ${JSON.stringify(vazio(v.u))} },`);
}
linhas.push('};');

const conteudo = linhas.join('\n') + '\n';
writeFileSync('src/data/ranges/openev.generated.ts', conteudo);
console.log(`gerado src/data/ranges/openev.generated.ts — ${(conteudo.length / 1024).toFixed(0)} KB, ${Object.keys(oe.abertura).length} ranges de abertura e ${Object.keys(resp.resposta).length} de resposta`);
