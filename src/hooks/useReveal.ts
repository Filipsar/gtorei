import { useEffect, type RefObject } from 'react';
import { carregarGsap, prefereMenosMovimento, type Gsap } from '@/lib/motion';

/**
 * Animações de entrada da landing page, com GSAP.
 *
 * Três decisões que importam mais que os efeitos em si:
 *
 * 1. O GSAP entra por import dinâmico. Fica fora do bundle inicial, e quem
 *    pediu menos movimento no sistema nem chega a baixar o arquivo.
 * 2. Tudo usa gsap.from(): o estado final é o que já está no HTML. Se o script
 *    falhar, for bloqueado ou demorar, a página aparece inteira do mesmo jeito.
 *    Nada de texto invisível esperando JavaScript — isso também vale para o
 *    robô do Google.
 * 3. Nada que já esteja na tela quando o GSAP fica pronto é animado. Animar o
 *    topo depois do primeiro desenho faria o conteúdo piscar: aparece, some e
 *    volta. A entrada do topo é feita em CSS, que desenha junto com a página.
 *
 * Marcação:
 *   data-reveal          → sobe e aparece
 *   data-reveal-stagger  → anima os [data-reveal-item] de dentro, em sequência
 *   data-contar          → conta de zero até o número que está no texto
 */

const SELETOR = '[data-reveal], [data-reveal-stagger], [data-contar]';
const DESLOCAMENTO = 24;

function jaEstaNaTela(elemento: Element): boolean {
  const caixa = elemento.getBoundingClientRect();
  return caixa.top < window.innerHeight && caixa.bottom > 0;
}

function animarEntrada(gsap: Gsap, elemento: HTMLElement) {
  const itens = elemento.hasAttribute('data-reveal-stagger')
    ? Array.from(elemento.querySelectorAll<HTMLElement>('[data-reveal-item]'))
    : [];
  const alvos = itens.length > 0 ? itens : [elemento];

  gsap.from(alvos, {
    y: DESLOCAMENTO,
    opacity: 0,
    duration: 0.6,
    ease: 'power2.out',
    stagger: itens.length > 0 ? 0.08 : 0,
    // Devolve o controle ao CSS no fim: hover e transições do Tailwind
    // continuam funcionando como antes nos cards.
    clearProps: 'transform,opacity',
  });
}

function animarContagem(gsap: Gsap, elemento: HTMLElement) {
  const textoFinal = elemento.textContent ?? '';
  const encontrado = textoFinal.match(/\d[\d.,]*/);
  if (!encontrado || encontrado.index === undefined) return;

  const destino = Number(encontrado[0].replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(destino) || destino === 0) return;

  const antes = textoFinal.slice(0, encontrado.index);
  const depois = textoFinal.slice(encontrado.index + encontrado[0].length);
  const contador = { valor: 0 };

  gsap.to(contador, {
    valor: destino,
    duration: 1.1,
    ease: 'power2.out',
    onUpdate: () => {
      elemento.textContent = `${antes}${Math.round(contador.valor)}${depois}`;
    },
    onComplete: () => {
      // Volta ao texto exato que o React escreveu, sem risco de formatação
      elemento.textContent = textoFinal;
    },
  });
}

export function useReveal(raiz: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = raiz.current;
    if (!container || prefereMenosMovimento()) return;

    let cancelado = false;
    let observador: IntersectionObserver | null = null;
    let contexto: { revert: () => void } | null = null;

    carregarGsap()
      ?.then((gsap) => {
        if (cancelado || !container.isConnected) return;

        contexto = gsap.context(() => {
          observador = new IntersectionObserver(
            (entradas) => {
              for (const entrada of entradas) {
                if (!entrada.isIntersecting) continue;
                const alvo = entrada.target as HTMLElement;
                observador?.unobserve(alvo);
                if (alvo.hasAttribute('data-contar')) animarContagem(gsap, alvo);
                else animarEntrada(gsap, alvo);
              }
            },
            // threshold fica em 0 de propósito. Com uma fração (0.2, por
            // exemplo), um bloco alto nunca dispara: a grade de recursos tem
            // 2053px e numa janela de 346px a razão máxima possível é 0,169.
            // Quem decide o momento é a margem: o topo do elemento precisa
            // cruzar 12% acima da borda de baixo da janela.
            { threshold: 0, rootMargin: '0px 0px -12% 0px' }
          );

          const alvos: HTMLElement[] = [];
          container.querySelectorAll<HTMLElement>(SELETOR).forEach((elemento) => {
            const itens = elemento.hasAttribute('data-reveal-stagger')
              ? Array.from(elemento.querySelectorAll<HTMLElement>('[data-reveal-item]'))
              : [];

            // Uma grade mais alta que a janela nunca cabe inteira na tela — no
            // celular todas são. Animar os cards em sequência a partir do topo
            // dela gastaria o efeito nos de baixo, que ninguém está vendo: eles
            // chegariam prontos. Aí cada card espera a própria vez.
            const maiorQueAJanela = elemento.getBoundingClientRect().height > window.innerHeight;
            if (itens.length > 0 && maiorQueAJanela) alvos.push(...itens);
            else alvos.push(elemento);
          });

          alvos.forEach((alvo) => {
            if (jaEstaNaTela(alvo)) return;
            observador?.observe(alvo);
          });
        }, container);
      })
      ?.catch(() => {
        // Sem GSAP a página continua completa, só sem as animações de entrada
      });

    return () => {
      cancelado = true;
      observador?.disconnect();
      contexto?.revert();
    };
  }, [raiz]);
}
