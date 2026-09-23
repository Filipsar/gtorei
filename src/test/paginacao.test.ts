import { describe, it, expect } from 'vitest';
import { fatiarPagina } from '@/lib/paginacao';

const lista = Array.from({ length: 23 }, (_, i) => i + 1);

describe('paginação da lista de jogadores', () => {
  it('fatia de 10 em 10 e conta certo no rótulo', () => {
    const primeira = fatiarPagina(lista, 10, 0);
    expect(primeira.itens).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(primeira.primeiro).toBe(1);
    expect(primeira.ultimo).toBe(10);
    expect(primeira.totalPaginas).toBe(3);
  });

  it('a última página só tem o que sobrou', () => {
    const ultima = fatiarPagina(lista, 10, 2);
    expect(ultima.itens).toEqual([21, 22, 23]);
    expect(ultima.primeiro).toBe(21);
    expect(ultima.ultimo).toBe(23);
  });

  it('página além do fim volta para a última que existe', () => {
    // É o caso da busca que encurta a lista com o admin numa página lá na frente
    const clamp = fatiarPagina(lista, 10, 9);
    expect(clamp.pagina).toBe(2);
    expect(clamp.itens).toEqual([21, 22, 23]);
  });

  it('lista vazia não vira "1–0 de 0"', () => {
    const vazia = fatiarPagina([], 10, 0);
    expect(vazia.itens).toEqual([]);
    expect(vazia.primeiro).toBe(0);
    expect(vazia.ultimo).toBe(0);
    expect(vazia.totalPaginas).toBe(1);
  });

  it('atende os três tamanhos da tela', () => {
    expect(fatiarPagina(lista, 5, 0).itens).toHaveLength(5);
    expect(fatiarPagina(lista, 10, 0).itens).toHaveLength(10);
    expect(fatiarPagina(lista, 20, 0).itens).toHaveLength(20);
    expect(fatiarPagina(lista, 20, 1).itens).toEqual([21, 22, 23]);
  });
});
