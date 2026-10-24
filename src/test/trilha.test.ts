import { beforeEach, describe, expect, it } from 'vitest';
import { STACK_SIZES } from '@/data/gtoRanges';
import { LICOES, NIVEIS } from '@/data/trilha';
import { MODE_SCENARIOS, posicoesDoModo, posicoesInvalidas } from '@/lib/sorteioDeMao';
import { estadosDaTrilha, estrelasDe, lerProgresso, proximaLicao, registrarResultado } from '@/lib/trilha';

describe('currículo da trilha', () => {
  it('ids únicos (são a chave do progresso guardado)', () => {
    const ids = LICOES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada nível fecha com uma mesa final', () => {
    for (const n of NIVEIS) expect(n.licoes.at(-1)?.mesaFinal).toBe(true);
  });

  it('todo cenário existe no modo e toda posição serve ao cenário', () => {
    for (const l of LICOES) {
      for (const c of l.cenarios) {
        expect(MODE_SCENARIOS[l.modo], `${l.id}: ${c}`).toContain(c);
        const validas = posicoesDoModo(l.modo).filter((p) => !posicoesInvalidas(c, l.modo).includes(p));
        // Com um cenário só, toda posição marcada precisa servir; misturando,
        // basta servir a pelo menos um (o sorteio filtra por cenário)
        if (l.cenarios.length === 1) {
          for (const p of l.posicoes) expect(validas, `${l.id}: ${p} em ${c}`).toContain(p);
        }
      }
      for (const p of l.posicoes) {
        const serveAAlgum = l.cenarios.some((c) => !posicoesInvalidas(c, l.modo).includes(p));
        expect(serveAAlgum, `${l.id}: ${p}`).toBe(true);
      }
    }
  });

  it('stacks da lista do motor', () => {
    for (const l of LICOES) for (const s of l.stacks) expect(STACK_SIZES, `${l.id}: ${s}`).toContain(s);
  });

  it('fica de fora o que é de apoiador ou tem range em revisão', () => {
    for (const l of LICOES) {
      expect(l.modo).not.toBe('bounty');
      expect(l.cenarios).not.toContain('vs3bet');
      expect(l.cenarios).not.toContain('simulation');
      expect(l.cenarios).not.toContain('multiway');
    }
  });
});

describe('progresso da trilha', () => {
  beforeEach(() => localStorage.clear());

  it('estrelas: 7 acertos = 1, 8 = 2, 9 ou 10 = 3, menos de 7 não passa', () => {
    expect([6, 7, 8, 9, 10].map((a) => estrelasDe(a))).toEqual([0, 1, 2, 3, 3]);
  });

  it('começa com a primeira lição liberada e o resto bloqueado', () => {
    const e = estadosDaTrilha({});
    expect(e.get(LICOES[0].id)).toBe('atual');
    expect(e.get(LICOES[1].id)).toBe('bloqueada');
  });

  it('passar libera a próxima; reprovar não', () => {
    const r1 = registrarResultado('u1', LICOES[0].id, 6);
    expect(r1.passou).toBe(false);
    expect(estadosDaTrilha(lerProgresso('u1')).get(LICOES[1].id)).toBe('bloqueada');

    const r2 = registrarResultado('u1', LICOES[0].id, 8);
    expect(r2).toMatchObject({ passou: true, primeiraVez: true, estrelas: 2 });
    const e = estadosDaTrilha(lerProgresso('u1'));
    expect(e.get(LICOES[0].id)).toBe('feita');
    expect(e.get(LICOES[1].id)).toBe('atual');
  });

  it('guarda o melhor resultado e não volta a "primeira vez"', () => {
    registrarResultado('u1', LICOES[0].id, 10);
    const pior = registrarResultado('u1', LICOES[0].id, 7);
    expect(pior.primeiraVez).toBe(false);
    expect(lerProgresso('u1')[LICOES[0].id]).toMatchObject({ estrelas: 3, melhor: 10, vezes: 2 });
  });

  it('progresso é por usuário', () => {
    registrarResultado('u1', LICOES[0].id, 9);
    expect(lerProgresso('u2')).toEqual({});
  });

  it('próxima lição atravessa o nível', () => {
    const ultimaDoPrimeiro = NIVEIS[0].licoes.at(-1)!;
    expect(proximaLicao(ultimaDoPrimeiro.id)?.id).toBe(NIVEIS[1].licoes[0].id);
    expect(proximaLicao(LICOES.at(-1)!.id)).toBeNull();
  });
});
