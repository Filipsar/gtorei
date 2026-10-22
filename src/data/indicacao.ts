// Programa de indicação. As regras que valem são as do banco (migration
// 20261021120000_indicacao_e_desafios); aqui fica o espelho delas para a tela
// e o que é só do navegador (guardar o código do link até o login).

/**
 * O sorteio mensal de US$ 100 do nível 5 só pode ser anunciado depois da
 * autorização do Ministério da Fazenda (Lei 5.768/71). Enquanto isto estiver
 * false, o nível 5 aparece só como nível e conquista, sem falar em prêmio.
 */
export const PREMIO_INDICACAO_ATIVO = false;

/** Mãos que o indicado precisa treinar, e em quantos dias, para valer */
export const MAOS_PARA_VALER = 50;
export const PRAZO_DIAS = 30;

export interface NivelIndicacao {
  nivel: number;
  nome: string;
  indicados: number;
  /** XP pago ao chegar no nível; o 5 paga o sorteio, não XP */
  xp: number;
  conquista: string;
}

export const NIVEIS_INDICACAO: NivelIndicacao[] = [
  { nivel: 1, nome: 'Primeiro Convite', indicados: 1, xp: 150, conquista: 'indica_1' },
  { nivel: 2, nome: 'Anfitrião', indicados: 5, xp: 500, conquista: 'indica_5' },
  { nivel: 3, nome: 'Recrutador', indicados: 15, xp: 1500, conquista: 'indica_15' },
  { nivel: 4, nome: 'Líder de Mesa', indicados: 40, xp: 4000, conquista: 'indica_40' },
  { nivel: 5, nome: 'Embaixador GTORei', indicados: 100, xp: 0, conquista: 'indica_100' },
];

/** Mesmo cálculo de referral_tier no banco */
export function nivelPorIndicados(validos: number): number {
  let nivel = 0;
  for (const n of NIVEIS_INDICACAO) if (validos >= n.indicados) nivel = n.nivel;
  return nivel;
}

/** Próximo nível e quanto falta para ele; null quando já está no 5 */
export function proximoNivel(validos: number): { nivel: NivelIndicacao; faltam: number } | null {
  const proximo = NIVEIS_INDICACAO.find((n) => validos < n.indicados);
  return proximo ? { nivel: proximo, faltam: proximo.indicados - validos } : null;
}

export function linkDeConvite(codigo: string, origem = 'https://www.gtorei.com.br'): string {
  return `${origem}/?ref=${encodeURIComponent(codigo)}`;
}

// ---------- Código do link, guardado até o primeiro login ----------
//
// Quem chega por gtorei.com.br/?ref=CODIGO ainda não tem conta. O código fica
// no navegador e é enviado ao banco (claim_referral) assim que a conta existir;
// o login pelo Google sai do site e volta, por isso não dá para levar na URL.

const CHAVE = 'gtorei_convite';
const VALIDADE_MS = PRAZO_DIAS * 24 * 60 * 60 * 1000;

/** Código no formato do banco: 6 a 12 letras maiúsculas e números */
export function normalizarCodigo(bruto: string | null | undefined): string | null {
  const codigo = (bruto ?? '').trim().toUpperCase();
  return /^[A-Z0-9]{6,12}$/.test(codigo) ? codigo : null;
}

export function guardarCodigoDoLink(search: string, agora = Date.now()): void {
  const codigo = normalizarCodigo(new URLSearchParams(search).get('ref'));
  if (!codigo) return;
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ codigo, em: agora }));
  } catch {
    // Armazenamento bloqueado: o convite se perde, o resto funciona
  }
}

export function lerCodigoGuardado(agora = Date.now()): string | null {
  try {
    const guardado = JSON.parse(localStorage.getItem(CHAVE) ?? 'null');
    if (!guardado || typeof guardado.em !== 'number') return null;
    if (agora - guardado.em > VALIDADE_MS) {
      localStorage.removeItem(CHAVE);
      return null;
    }
    return normalizarCodigo(guardado.codigo);
  } catch {
    return null;
  }
}

export function esquecerCodigo(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // nada a fazer
  }
}

// ---------- Respostas do banco ----------

export type SituacaoIndicado = 'valido' | 'pendente' | 'expirado';

export interface Indicado {
  nome: string;
  maos: number;
  desde: string;
  situacao: SituacaoIndicado;
  prazo: string;
}

export interface ResumoIndicacao {
  validos: number;
  pendentes: number;
  nivel: number;
  indicados: Indicado[];
}

export const MENSAGEM_CLAIM: Record<string, string | null> = {
  ok: 'Você entrou por um convite. Treine 50 mãos e quem te convidou sobe de nível!',
  codigo_invalido: null,
  proprio_codigo: null,
  ja_indicado: null,
  conta_antiga: null,
  indicacao_cruzada: null,
};
