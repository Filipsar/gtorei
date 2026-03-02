// GTORei - Gerador de ID único para mãos jogadas
// ID de 18 caracteres alfanuméricos para referência e discussão

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generateUniqueHandId(): string {
  let id = '';
  for (let i = 0; i < 18; i++) {
    id += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return id;
}
