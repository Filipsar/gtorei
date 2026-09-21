// Auditoria temporária das ranges — não faz parte da suíte, é só para medir.
import { describe, it } from 'vitest';
import { getRange } from '@/data/gtoRanges';

const combos = (h: string) => (h.length === 2 ? 6 : h.endsWith('s') ? 4 : 12);
const TOTAL_COMBOS = 1326;

function summarize(scenario: any, position: any, stack: number, mode: any = '8max') {
  const range = getRange(scenario, position, stack, false, mode, 0);
  let raiseCombos = 0;
  let allinCombos = 0;
  let callCombos = 0;
  let mixed = 0;
  const inRange: string[] = [];
  for (const h of range.hands) {
    const f = (a: string) => h.actions.find((x: any) => x.action === a)?.frequency ?? 0;
    const agg = f('raise') + f('allin');
    if (agg > 0) inRange.push(h.hand);
    raiseCombos += (combos(h.hand) * f('raise')) / 100;
    allinCombos += (combos(h.hand) * f('allin')) / 100;
    callCombos += (combos(h.hand) * f('call')) / 100;
    if (f('fold') > 0 && f('fold') < 100) mixed++;
  }
  return {
    label: `${mode} ${scenario} ${position} ${stack}bb`,
    aggPctCombos: (((raiseCombos + allinCombos) / TOTAL_COMBOS) * 100).toFixed(1),
    callPctCombos: ((callCombos / TOTAL_COMBOS) * 100).toFixed(1),
    handClasses: inRange.length,
    maosMistas: mixed,
    inRange,
  };
}

describe('auditoria de ranges', () => {
  it('mede largura real x configurada', () => {
    const casos = [
      summarize('openRaise', 'UTG', 30),
      summarize('openRaise', 'CO', 30),
      summarize('openRaise', 'BTN', 30),
      summarize('openRaise', 'SB', 30),
    ];
    for (const c of casos) {
      console.log(`\n${c.label}: ${c.aggPctCombos}% dos combos | ${c.handClasses} mãos | mistas: ${c.maosMistas}`);
    }

    // Mãos de referência: o que uma range de UTG deveria e não deveria conter
    const utg = summarize('openRaise', 'UTG', 30).inRange;
    const checar = ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
      'AKs', 'AQs', 'AJs', 'ATs', 'A5s', 'KQs', 'KJs', 'QJs', 'JTs', 'T9s', '98s', '76s', '65s',
      'AKo', 'AQo', 'AJo', 'ATo', 'KQo', 'KJo', 'QJo',
      'Q8s', 'J8s', 'T8s', 'K7s', 'K5s', 'Q9o', 'J9o', 'K9o'];
    console.log('\n--- UTG 30bb (8max) ---');
    console.log('DENTRO:', checar.filter((h) => utg.includes(h)).join(' '));
    console.log('FORA  :', checar.filter((h) => !utg.includes(h)).join(' '));

    // Ordenação global usada em todos os cenários
    const ordem = getRange('openRaise', 'BTN', 30, false, '8max', 0).hands.map((h: any) => h.hand);
    console.log('\nTop 30 da ordenação de força:', ordem.slice(0, 30).join(' '));
    console.log('Posições: 66 =', ordem.indexOf('66'), '| Q8s =', ordem.indexOf('Q8s'),
      '| J8s =', ordem.indexOf('J8s'), '| A9o =', ordem.indexOf('A9o'), '| 55 =', ordem.indexOf('55'),
      '| KQo =', ordem.indexOf('KQo'), '| 76s =', ordem.indexOf('76s'));

    // Push/fold curto
    console.log('\n--- Stacks curtos ---');
    for (const c of [summarize('openRaise', 'SB', 10), summarize('openRaise', 'BTN', 10), summarize('openRaise', 'UTG', 10)]) {
      console.log(`${c.label}: ${c.aggPctCombos}% dos combos | ${c.handClasses} mãos`);
    }

    // A ordenação muda conforme o cenário?
    const ordemShove = getRange('vsOpenShove', 'BB', 15, false, '8max', 0).hands.map((h: any) => h.hand);
    console.log('\nOrdenação igual entre openRaise e vsOpenShove?', JSON.stringify(ordem) === JSON.stringify(ordemShove));
  });
});
