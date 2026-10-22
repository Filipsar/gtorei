import { describe, expect, it, beforeEach } from 'vitest';
import {
  NIVEIS_INDICACAO,
  esquecerCodigo,
  guardarCodigoDoLink,
  lerCodigoGuardado,
  linkDeConvite,
  nivelPorIndicados,
  normalizarCodigo,
  proximoNivel,
} from '@/data/indicacao';
import { ACHIEVEMENTS } from '@/data/achievements';

describe('níveis de indicação', () => {
  it('batem com referral_tier do banco (1, 5, 15, 40, 100)', () => {
    expect(NIVEIS_INDICACAO.map((n) => n.indicados)).toEqual([1, 5, 15, 40, 100]);
    expect([0, 1, 4, 5, 14, 15, 39, 40, 99, 100, 250].map(nivelPorIndicados)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it('só o nível 5 não paga XP (é o do sorteio)', () => {
    expect(NIVEIS_INDICACAO.filter((n) => n.xp === 0).map((n) => n.nivel)).toEqual([5]);
  });

  it('diz quanto falta para o próximo nível', () => {
    expect(proximoNivel(0)).toEqual({ nivel: NIVEIS_INDICACAO[0], faltam: 1 });
    expect(proximoNivel(12)?.faltam).toBe(3);
    expect(proximoNivel(100)).toBeNull();
  });

  it('cada nível tem a sua conquista cadastrada', () => {
    const chaves = new Set(ACHIEVEMENTS.map((a) => a.key));
    for (const n of NIVEIS_INDICACAO) expect(chaves.has(n.conquista)).toBe(true);
  });
});

describe('código do link', () => {
  beforeEach(() => esquecerCodigo());

  it('aceita só o formato do banco e normaliza para maiúsculas', () => {
    expect(normalizarCodigo(' abcd2345 ')).toBe('ABCD2345');
    expect(normalizarCodigo('abc')).toBeNull();
    expect(normalizarCodigo('abc-1234')).toBeNull();
    expect(normalizarCodigo(null)).toBeNull();
  });

  it('guarda o ?ref= e devolve até 30 dias depois', () => {
    const agora = 1_800_000_000_000;
    guardarCodigoDoLink('?utm=x&ref=abcd2345', agora);
    expect(lerCodigoGuardado(agora + 29 * 86_400_000)).toBe('ABCD2345');
    expect(lerCodigoGuardado(agora + 31 * 86_400_000)).toBeNull();
  });

  it('ignora link sem código válido e não apaga o que já estava guardado', () => {
    guardarCodigoDoLink('?ref=ABCD2345');
    guardarCodigoDoLink('?ref=<script>');
    guardarCodigoDoLink('');
    expect(lerCodigoGuardado()).toBe('ABCD2345');
  });

  it('monta o link de convite', () => {
    expect(linkDeConvite('ABCD2345')).toBe('https://www.gtorei.com.br/?ref=ABCD2345');
  });
});
