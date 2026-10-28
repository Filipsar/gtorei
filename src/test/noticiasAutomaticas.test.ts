import { describe, expect, it } from 'vitest';
import {
  checarResumo,
  escolherFotoDoCommons,
  lerJsonDaIa,
  numerosForaDaFonte,
  slugDaNoticia,
  textoDaMateria,
  trechosCopiados,
} from '../../supabase/functions/noticias-automaticas/logica';
import { slugDaNoticia as slugDoAdmin } from '@/lib/noticias';

// Trecho da matéria da CardPlayer de 27/10/2026 (fatos usados no resumo abaixo)
const FONTE = `Hun Wei Lee Denies Joe Hachem In Victorian Poker Championship
Joe Hachem made it all the way down to the final two players in the 2026 Victorian Poker Championship $2,500 AUD main event, only to be denied the trophy by fellow Australian Hun Wei Lee.
Lee took home $245,000 USD as the champion, while Hachem settled for $147,000 as the runner-up.
This was the second big win of the year for Lee, having also emerged victorious in a $25,000 AUD high roller at the reborn Aussie Millions for $469,922 USD.
This event drew 715 entries to Crown Melbourne, making for a prize pool worth over $1.1 million USD. The top 89 finishers made the money.
With blinds of 300,000-600,000 and a big blind ante of 600,000, Hachem raised to 1,600,000 on the button.`;

const P1 =
  'Joe Hachem, campeão do Main Event da WSOP de 2005, chegou ao heads-up do Main Event de A$ 2.500 do Victorian Poker Championship, no Crown Melbourne, mas o título ficou com o também australiano Hun Wei Lee. O torneio reuniu 715 entradas, pagou 89 posições e teve prize pool acima de US$ 1,1 milhão. Lee levou US$ 245 mil e Hachem, US$ 147 mil.';
const P2 =
  'Foi a segunda grande vitória de Lee no ano: ele já tinha ganhado um high roller de A$ 25.000 no Aussie Millions, por US$ 469.922. Na última mão, com blinds de 300 mil/600 mil, Hachem aumentou para 1,6 milhão no botão e Lee devolveu um 3-bet all-in do big blind. Hachem pagou, chegou a ficar na frente com um ás no flop, mas um valete no river deu trinca a Lee e encerrou o heads-up depois de várias trocas de liderança entre os dois australianos.';
const P3 =
  'O que fica para o seu torneio: no heads-up, abrir com um ás fraco e levar um 3-bet all-in é uma decisão comum, e a resposta muda com o tamanho dos stacks e com as mãos que o adversário empurra. No GTORei, o modo heads-up e o cenário Vs 3-bet colocam você nesse spot para treinar quando pagar e quando largar.';
const RESUMO = [P1, P2, P3].join('\n\n');
const FONTE_COM_2005 = `${FONTE}\nHachem won the 2005 World Series of Poker main event.`;

describe('checagem do resumo automático', () => {
  it('aceita um resumo dentro das regras', () => {
    expect(checarResumo('Hun Wei Lee vence Joe Hachem no heads-up do Victorian Poker Championship', RESUMO, FONTE_COM_2005)).toEqual([]);
  });

  it('pega número que não está na matéria (equidade inventada, por exemplo)', () => {
    expect(numerosForaDaFonte('o A5 tinha 30% de equidade e o prêmio foi de US$ 245 mil', FONTE)).toEqual(['30']);
    const erros = checarResumo('Título', RESUMO.replace('715 entradas', '750 entradas'), FONTE_COM_2005);
    expect(erros.some((e) => e.includes('750'))).toBe(true);
    // Porcentagem só com a mesma porcentagem na matéria, mesmo que o número apareça em outro lugar
    const comEquidade = RESUMO.replace('Hachem pagou,', 'Hachem pagou com 89% de chance,');
    expect(checarResumo('Título', comEquidade, FONTE_COM_2005).some((e) => e.includes('porcentagem'))).toBe(true);
  });

  it('pega frase copiada da fonte', () => {
    const copiado = 'Ele disse que made it all the way down to the final two players in the event.';
    expect(trechosCopiados(copiado, FONTE).length).toBeGreaterThan(0);
  });

  it('exige três parágrafos e o "O que fica para o seu torneio:"', () => {
    const erros = checarResumo('Título', [P1, P2].join('\n\n'), FONTE_COM_2005);
    expect(erros.some((e) => e.includes('parágrafos'))).toBe(true);
    expect(erros.some((e) => e.includes('O que fica'))).toBe(true);
  });
});

describe('texto e formato', () => {
  it('lê só os parágrafos da matéria, sem propaganda', () => {
    const html = `<script>var x=1</script><p>Top Rated 888 Poker Depósito mín: $10 Deposite $10 e GANHE $30 T&amp;C Registrar</p>
      <p>Alan Karas foi vice no GGMasters de US$ 150 e levou US$ 104.229 para casa.</p><li>curto</li>`;
    expect(textoDaMateria(html)).toBe('Alan Karas foi vice no GGMasters de US$ 150 e levou US$ 104.229 para casa.');
  });

  it('lê o JSON da IA mesmo cercado por ```json', () => {
    expect(lerJsonDaIa<{ a: number }>('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(lerJsonDaIa('não é json')).toBeNull();
  });

  it('gera o mesmo slug do admin', () => {
    const id = '3f2a9c10-aaaa-bbbb-cccc-000000000000';
    const titulo = 'Jonatas Gomes leva bounty de US$ 157 mil na GGPoker';
    expect(slugDaNoticia(titulo, id)).toBe(slugDoAdmin(titulo, id));
  });
});

describe('foto do Wikimedia Commons', () => {
  const pagina = (index: number, title: string, licenca: string, mime = 'image/jpeg') => ({
    index,
    title,
    imageinfo: [
      {
        url: `https://upload.wikimedia.org/${index}.jpg`,
        thumburl: `https://upload.wikimedia.org/thumb/${index}.jpg`,
        mime,
        extmetadata: { LicenseShortName: { value: licenca }, Artist: { value: '<a href="x">Fotógrafo X</a>' } },
      },
    ],
  });

  it('escolhe a primeira foto do jogador com licença livre e monta o crédito', () => {
    const resposta = {
      query: {
        pages: {
          a: pagina(1, 'File:Joe Hachem 2006.jpg', 'CC BY-SA 4.0'), // outro jogador
          b: pagina(2, 'File:Hun Wei Lee at Crown 2019.jpg', 'CC BY-NC 2.0'), // não comercial
          c: pagina(3, 'File:Hun Wei Lee poker 2022.jpg', 'CC BY 2.0'),
        },
      },
    };
    expect(escolherFotoDoCommons(resposta, 'Hun Wei Lee')).toEqual({
      url: 'https://upload.wikimedia.org/thumb/3.jpg',
      credito: 'Foto: Fotógrafo X / Wikimedia Commons (CC BY 2.0)',
    });
  });

  it('sem foto que sirva, devolve nada (a notícia usa a arte do GTORei)', () => {
    const resposta = { query: { pages: { a: pagina(1, 'File:Logo.svg', 'CC BY 2.0', 'image/svg+xml') } } };
    expect(escolherFotoDoCommons(resposta, 'Hun Wei Lee')).toBeNull();
    expect(escolherFotoDoCommons({}, 'Hun Wei Lee')).toBeNull();
  });
});
