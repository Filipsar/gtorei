import { useEffect, type RefObject } from 'react';
import { carregarGsap, prefereMenosMovimento, type Gsap } from '@/lib/motion';

/**
 * Animações de entrada da landing page, com GSAP.
 *
 * Quatro decisões que importam mais que os efeitos em si:
 *
 * 1. O GSAP entra por import dinâmico. Fica fora do bundle inicial, e quem
 *    pediu menos movimento no sistema nem chega a baixar o arquivo.
 * 2. O bloco é escondido assim que o GSAP fica pronto, e não no momento em que
 *    ele aparece. Esconder na hora de aparecer faz o conteúdo piscar: ele já
 *    foi desenhado, some e volta. Era isso que acontecia aqui — media-se um
 *    card inteiro, 262px visíveis, sumindo depois de estar na tela.
 * 3. Nada que já esteja visível quando o GSAP carrega é tocado. Se o script
 *    demorar, falhar ou for bloqueado, o que a pessoa está lendo fica onde
 *    está. Só some o que ainda está abaixo da dobra, que ninguém viu.
 * 4. A transição do CSS é desligada durante o tween. Os cards de recursos têm
 *    transition-all de 150ms para o hover; sem desligar, cada quadro do GSAP
 *    passava por ela e a entrada ficava arrastada.
 *
 * Marcação:
 *   data-reveal          → sobe e aparece
 *   data-reveal-stagger  → quem sobe são os [data-reveal-item] de dentro
 *   data-contar          → conta de zero até o número que está no texto
 */

const DESLOCAMENTO = 24;
const DURACAO = 0.6;
const PASSO = 0.07;
const MAXIMO_DE_PASSOS = 5;

function abaixoDaDobra(elemento: Element): boolean {
  return elemento.getBoundingClientRect().top >= window.innerHeight;
}

function coletarAlvos(container: HTMLElement): HTMLElement[] {
  const alvos: HTMLElement[] = [];

  container.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-stagger]').forEach((elemento) => {
    const itens = elemento.hasAttribute('data-reveal-stagger')
      ? Array.from(elemento.querySelectorAll<HTMLElement>('[data-reveal-item]'))
      : [];

    // Numa grade, quem anima é cada card, nunca a grade inteira: assim os de
    // baixo esperam a própria vez em vez de chegarem prontos fora da tela.
    if (itens.length > 0) alvos.push(...itens);
    else alvos.push(elemento);
  });

  return alvos.filter(abaixoDaDobra);
}

function soltar(elemento: HTMLElement) {
  elemento.style.transition = '';
}

function animarEntrada(gsap: Gsap, alvo: HTMLElement, atraso: number) {
  gsap.to(alvo, {
    opacity: 1,
    y: 0,
    duration: DURACAO,
    delay: atraso,
    ease: 'power2.out',
    // Devolve o controle ao CSS no fim: hover e transições do Tailwind
    // continuam funcionando como antes nos cards.
    clearProps: 'transform,opacity',
    onComplete: () => soltar(alvo),
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
    duration: 0.9,
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
    let escondidos: HTMLElement[] = [];

    carregarGsap()
      ?.then((gsap) => {
        if (cancelado || !container.isConnected) return;

        contexto = gsap.context(() => {
          try {
            escondidos = coletarAlvos(container);
            escondidos.forEach((alvo) => {
              alvo.style.transition = 'none';
            });
            gsap.set(escondidos, { opacity: 0, y: DESLOCAMENTO });

            observador = new IntersectionObserver(
              (entradas) => {
                const entrando = entradas.filter((entrada) => entrada.isIntersecting);
                if (entrando.length === 0) return;

                // Quem cruza a linha no mesmo instante entra em fila, de cima
                // para baixo e da esquerda para a direita — a ordem em que os
                // olhos leem. A fila tem teto: uma rolagem rápida pode trazer
                // oito cards de uma vez, e meio segundo de espera no último
                // pareceria travamento.
                entrando.sort((a, b) => {
                  const alturaA = Math.round(a.boundingClientRect.top);
                  const alturaB = Math.round(b.boundingClientRect.top);
                  return alturaA - alturaB || a.boundingClientRect.left - b.boundingClientRect.left;
                });

                entrando.forEach((entrada, indice) => {
                  const alvo = entrada.target as HTMLElement;
                  observador?.unobserve(alvo);
                  if (alvo.hasAttribute('data-contar')) animarContagem(gsap, alvo);
                  else animarEntrada(gsap, alvo, Math.min(indice, MAXIMO_DE_PASSOS) * PASSO);
                });
              },
              // threshold fica em 0 de propósito. Com uma fração (0.2, por
              // exemplo), um bloco alto nunca dispara: a grade de recursos tem
              // 2053px e numa janela de 346px a razão máxima possível é 0,169.
              // Quem decide o momento é a margem: o topo do elemento precisa
              // cruzar 10% acima da borda de baixo da janela.
              { threshold: 0, rootMargin: '0px 0px -10% 0px' }
            );

            escondidos.forEach((alvo) => observador?.observe(alvo));

            // O contador não é escondido: quem cuida da opacidade dele é o card
            // em volta. Ele só precisa saber a hora de começar a contar.
            container.querySelectorAll<HTMLElement>('[data-contar]').forEach((alvo) => {
              if (abaixoDaDobra(alvo)) observador?.observe(alvo);
            });
          } catch {
            // Página escondida e sem animação é o pior resultado possível:
            // na dúvida, devolve tudo à vista.
            escondidos.forEach((alvo) => {
              soltar(alvo);
              alvo.style.opacity = '';
              alvo.style.transform = '';
            });
            escondidos = [];
          }
        }, container);
      })
      ?.catch(() => {
        // Sem GSAP a página continua completa, só sem as animações de entrada
      });

    return () => {
      cancelado = true;
      observador?.disconnect();
      contexto?.revert();
      escondidos.forEach(soltar);
    };
  }, [raiz]);
}
