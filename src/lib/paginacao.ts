/**
 * Fatia uma lista em páginas.
 *
 * A página pedida vem limitada pelo total em vez de zerada: se a lista encolher
 * embaixo do pé — uma busca que filtra quase tudo, por exemplo — a tabela mostra
 * a última página que existe, e não uma página vazia sem explicação.
 *
 * `primeiro` e `ultimo` são 1-based porque servem para o rótulo "1–10 de 152".
 * Numa lista vazia os dois voltam zero, para não escrever "1–0 de 0".
 */
export interface Pagina<T> {
  itens: T[];
  pagina: number;
  totalPaginas: number;
  primeiro: number;
  ultimo: number;
}

export function fatiarPagina<T>(lista: T[], porPagina: number, pagina: number): Pagina<T> {
  const tamanho = Math.max(1, Math.floor(porPagina));
  const totalPaginas = Math.max(1, Math.ceil(lista.length / tamanho));
  const atual = Math.min(Math.max(Math.floor(pagina), 0), totalPaginas - 1);
  const inicio = atual * tamanho;

  return {
    itens: lista.slice(inicio, inicio + tamanho),
    pagina: atual,
    totalPaginas,
    primeiro: lista.length === 0 ? 0 : inicio + 1,
    ultimo: Math.min(inicio + tamanho, lista.length),
  };
}
