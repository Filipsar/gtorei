// Sons da mesa (public/sons): cartas na mão nova, fichas quando entra aposta,
// a batida do check e as estrelas no fim da lição. Ligados por padrão; a
// escolha fica no aparelho, e sem armazenamento (aba anônima, cookies negados)
// os sons seguem ligados sem quebrar nada.

export type Som = 'cartas' | 'fichas' | 'check' | 'estrelas';

const ARQUIVO: Record<Som, string> = {
  cartas: '/sons/cartas.mp3',
  fichas: '/sons/fichas.mp3',
  check: '/sons/check.mp3',
  estrelas: '/sons/estrelas.mp3',
};

// As estrelas são mais altas que os outros (medido: -17 dB contra -28 a -33 dB)
const VOLUME: Record<Som, number> = { cartas: 0.7, fichas: 0.7, check: 0.7, estrelas: 0.45 };

const CHAVE = 'gtorei_sons';

/** Disparado quando alguém liga ou desliga, para todo botão de som acompanhar */
export const EVENTO_SONS = 'gtorei:sons';

// Sem armazenamento a escolha vale só até recarregar
let desligadoNaMemoria = false;

export function sonsLigados(): boolean {
  try {
    return localStorage.getItem(CHAVE) !== '0';
  } catch {
    return !desligadoNaMemoria;
  }
}

export function ligarSons(ligado: boolean): void {
  try {
    localStorage.setItem(CHAVE, ligado ? '1' : '0');
  } catch {
    desligadoNaMemoria = !ligado;
  }
  window.dispatchEvent(new Event(EVENTO_SONS));
}

const carregados = new Map<Som, HTMLAudioElement>();

/** Toca um som (se estiver ligado). Nunca lança: som é enfeite, não pode travar a mão. */
export function tocar(som: Som): void {
  if (!sonsLigados() || typeof Audio === 'undefined') return;
  try {
    let base = carregados.get(som);
    if (!base) {
      base = new Audio(ARQUIVO[som]);
      base.preload = 'auto';
      carregados.set(som, base);
    }
    // Uma cópia por toque: duas fichas seguidas não cortam uma à outra
    const audio = base.cloneNode(true) as HTMLAudioElement;
    audio.volume = VOLUME[som];
    void audio.play().catch(() => {});
  } catch {
    // navegador sem áudio: segue em silêncio
  }
}

/** O som de cada jogada: fichas quando entra aposta, batida no check, cartas no fold */
export function somDaJogada(acao: string): Som {
  if (acao === 'check') return 'check';
  if (acao === 'fold') return 'cartas';
  return 'fichas';
}
