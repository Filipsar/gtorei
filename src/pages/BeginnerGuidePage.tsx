import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Brain, ChevronDown, Grid3x3, HelpCircle, Layers, MapPin, Sparkles, Target } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SEO } from '@/components/seo/SEO';
import { HandWalkthrough } from '@/components/guide/HandWalkthrough';
import { PositionTable, type PosicaoId } from '@/components/guide/PositionTable';
import { StartingHandsMatrix } from '@/components/guide/StartingHandsMatrix';
import { QuickQuiz } from '@/components/guide/QuickQuiz';
import { ABERTURA_100BB, POSICOES_GUIA } from '@/data/guiaIniciante';

const pct = (p: string) => ABERTURA_100BB[p].pct.toLocaleString('pt-BR');

const SECOES = [
  { id: 'mao', rotulo: 'A mão', icone: Layers },
  { id: 'posicoes', rotulo: 'Posições', icone: MapPin },
  { id: 'maos-iniciais', rotulo: 'Mãos iniciais', icone: Grid3x3 },
  { id: 'gto', rotulo: 'GTO', icone: Brain },
  { id: 'quiz', rotulo: 'Quiz', icone: Target },
  { id: 'glossario', rotulo: 'Glossário', icone: BookOpen },
];

const GLOSSARIO = [
  { termo: 'Big blind (BB)', definicao: 'A maior aposta obrigatória da mesa e a unidade de medida do jogo. "Stack de 100 BB" quer dizer fichas equivalentes a 100 big blinds.' },
  { termo: 'Ante', definicao: 'Aposta obrigatória extra que aumenta o pote antes das cartas. Na maioria dos torneios atuais, o big blind paga um ante de 1 BB pela mesa inteira.' },
  { termo: 'Range', definicao: 'O conjunto de mãos que um jogador pode ter numa situação. Pensar em range, e não numa mão só, é a base do jogo moderno.' },
  { termo: 'Abrir (open)', definicao: 'Ser o primeiro a aumentar no pré-flop, depois que todos antes desistiram.' },
  { termo: '3-bet', definicao: 'Aumentar de novo em cima de quem abriu. A abertura conta como a segunda aposta (o big blind é a primeira), por isso o nome.' },
  { termo: 'Push/fold', definicao: 'Com stack curto, até uns 15 a 20 BB, abrir pequeno deixa de fazer sentido e a decisão vira ir de all-in ou desistir.' },
  { termo: 'Stack efetivo', definicao: 'O menor stack entre os jogadores na mão. É o máximo que qualquer um deles pode ganhar ou perder ali.' },
  { termo: 'Em posição (IP) / fora de posição (OOP)', definicao: 'Em posição é falar depois do adversário nas ruas seguintes. Fora de posição é falar antes, sem saber o que ele vai fazer.' },
  { termo: 'Suited / offsuit', definicao: 'Suited são duas cartas do mesmo naipe (AKs); offsuit, de naipes diferentes (AKo). Suited vale mais pela chance de flush.' },
  { termo: 'EV (valor esperado)', definicao: 'Quanto uma decisão ganha ou perde, em média, se fosse repetida muitas vezes. Uma jogada pode perder na mão e ainda ser a de maior EV.' },
  { termo: 'ICM', definicao: 'Modelo que traduz fichas em dinheiro do prêmio. Perto da premiação, perder fichas custa mais do que ganhar a mesma quantidade.' },
];

// O mesmo conteúdo vai para a tela e para os dados estruturados: o Google só
// aceita FAQPage quando as perguntas estão visíveis na página.
const FAQ = [
  {
    q: 'O que é poker GTO?',
    a: 'GTO (Game Theory Optimal) é uma estratégia equilibrada que não pode ser explorada: mesmo que o adversário conheça a sua estratégia, ele não consegue lucrar contra ela no longo prazo. Na prática ninguém joga GTO perfeito; os solvers servem de referência para escolher mãos, frequências e tamanhos de aposta.',
  },
  {
    q: "Como funciona uma mão de Texas Hold'em?",
    a: 'Cada jogador recebe 2 cartas fechadas e há quatro rodadas de apostas: pré-flop, flop (3 cartas comunitárias), turn (a 4ª) e river (a 5ª). Quem chega ao final monta a melhor combinação de 5 cartas entre as 7 que enxerga.',
  },
  {
    q: 'Qual a importância da posição no poker?',
    a: `A posição define a ordem em que cada um fala. Quem fala por último vê o que os outros fizeram antes de decidir, por isso o cutoff e o botão jogam mais mãos. No GTORei, com 100 BB, o UTG abre ${pct('UTG')}% das mãos e o botão ${pct('BTN')}%.`,
  },
  {
    q: 'Quais mãos um iniciante deve jogar?',
    a: `Depende da posição e do stack. Do UTG, com 100 BB, só ${pct('UTG')}% das mãos: pares médios e altos, ases fortes e as melhores mãos de mesmo naipe. No botão, quase metade. Com stack curto a lista muda, e a decisão vira all-in ou fold.`,
  },
  {
    q: 'O GTORei é gratuito?',
    a: 'É. Não existe plano pago nem anúncio; o projeto se mantém com doações de quem usa. O treino inteiro fica liberado com uma conta grátis.',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
};

const nextSteps = [
  { to: '/treinar', title: 'Treinar decisões pré-flop', text: 'Pratique posição por posição, com feedback em cada mão. É grátis; só pede uma conta.' },
  { to: '/', title: 'Conhecer o GTORei', text: 'Os modos de treino, as tabelas de ranges e a análise de torneio por IA.' },
  { to: '/atualizacoes', title: 'Ver o que mudou', text: 'Cada melhoria e correção da plataforma, versão por versão.' },
];

function Secao({
  id,
  numero,
  titulo,
  subtitulo,
  children,
}: {
  id: string;
  numero?: number;
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-border bg-card/60 p-5 sm:p-7">
      <header className="mb-5">
        {numero !== undefined && (
          <span className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {numero}
          </span>
        )}
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{titulo}</h2>
        {subtitulo && <p className="mt-1 text-body-sm text-muted-foreground">{subtitulo}</p>}
      </header>
      {children}
    </section>
  );
}

export default function BeginnerGuidePage() {
  const [posicaoMesa, setPosicaoMesa] = useState<PosicaoId>('UTG');
  const [posicaoMatriz, setPosicaoMatriz] = useState<(typeof POSICOES_GUIA)[number]>('UTG');

  const verMaos = (p: PosicaoId) => {
    if (p !== 'BB') setPosicaoMatriz(p);
    document.getElementById('maos-iniciais')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <MainLayout>
      <SEO
        title="Poker para Iniciantes: Guia com Posições e Mãos — GTORei"
        description="Aprenda poker do zero: como funciona uma mão, por que a posição importa e quais mãos abrir de cada lugar, com matriz interativa e um quiz rápido."
        path="/iniciante"
        jsonLd={faqJsonLd}
      />
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Abertura */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.18),transparent_60%)] p-6 sm:p-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Guia do iniciante
          </span>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            Poker para iniciantes: do zero à primeira decisão certa
          </h1>
          <p className="mt-4 max-w-2xl text-body-md text-muted-foreground">
            Seis passos curtos e interativos: como uma mão acontece, por que o lugar na mesa muda tudo, quais mãos abrir de
            cada posição e o que é jogar GTO. As ranges são as que o próprio GTORei calcula.
          </p>
          <nav aria-label="Seções do guia" className="mt-6 flex flex-wrap gap-2">
            {SECOES.map(({ id, rotulo, icone: Icone }) => (
              <a
                key={id}
                href={`#${id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icone className="h-4 w-4 text-primary" aria-hidden="true" /> {rotulo}
              </a>
            ))}
          </nav>
        </div>

        <Secao id="mao" numero={1} titulo="Como funciona uma mão" subtitulo="Avance rua por rua e veja as cartas saindo.">
          <HandWalkthrough />
        </Secao>

        <Secao
          id="posicoes"
          numero={2}
          titulo="Por que a posição muda tudo"
          subtitulo="Quem fala por último decide com mais informação. Clique em cada lugar da mesa."
        >
          <PositionTable selecionada={posicaoMesa} onSelecionar={setPosicaoMesa} onVerMaos={verMaos} />
        </Secao>

        <Secao
          id="maos-iniciais"
          numero={3}
          titulo="Quais mãos jogar"
          subtitulo={`Do UTG abrem ${pct('UTG')}% das mãos; do botão, ${pct('BTN')}%. Troque a posição e clique nas casas.`}
        >
          <StartingHandsMatrix posicao={posicaoMatriz} onPosicao={setPosicaoMatriz} />
        </Secao>

        <Secao id="gto" numero={4} titulo="O que é jogar GTO">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                titulo: 'Uma estratégia que não se explora',
                texto:
                  'GTO (Game Theory Optimal) é o equilíbrio da teoria dos jogos: mesmo que o adversário saiba exatamente como você joga, ele não consegue lucrar contra isso no longo prazo.',
              },
              {
                titulo: 'Solver como referência',
                texto:
                  'Ninguém joga GTO perfeito. Os solvers, programas que calculam esse equilíbrio, mostram quais mãos jogar, com que frequência e de que tamanho apostar.',
              },
              {
                titulo: 'Para quem começa: o pré-flop',
                texto:
                  'Escolher bem as mãos por posição e stack já elimina os erros mais caros. É isso que o treino do GTORei cobre, com o EV de cada decisão.',
              },
            ].map((c) => (
              <div key={c.titulo} className="rounded-xl border border-border bg-background/50 p-4">
                <h3 className="font-semibold text-foreground">{c.titulo}</h3>
                <p className="mt-2 text-body-sm leading-relaxed text-muted-foreground">{c.texto}</p>
              </div>
            ))}
          </div>
        </Secao>

        <Secao id="quiz" numero={5} titulo="Teste rápido" subtitulo="Cinco mãos. As respostas saem das mesmas ranges da matriz acima.">
          <QuickQuiz />
        </Secao>

        <Secao id="glossario" numero={6} titulo="Glossário" subtitulo="Os termos que aparecem em toda conversa de poker.">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {GLOSSARIO.map((g) => (
              <div key={g.termo} className="border-l-2 border-primary/50 pl-3">
                <dt className="font-semibold text-foreground">{g.termo}</dt>
                <dd className="mt-1 text-body-sm leading-relaxed text-muted-foreground">{g.definicao}</dd>
              </div>
            ))}
          </dl>
        </Secao>

        <Secao id="perguntas" titulo="Perguntas frequentes">
          <div>
            {FAQ.map((item) => (
              <details key={item.q} name="faq-iniciante" className="group border-b border-border last:border-b-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-4 text-left font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> {item.q}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="pb-4 text-body-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </Secao>

        <Secao id="proximos-passos" titulo="Próximos passos">
          <ul className="grid gap-3 sm:grid-cols-3">
            {nextSteps.map((step) => (
              <li key={step.to}>
                <Link
                  to={step.to}
                  className="group block h-full rounded-xl border border-border p-4 transition-colors hover:border-primary/60 hover:bg-muted/50"
                >
                  <span className="flex items-center justify-between font-medium text-foreground">
                    <span className="underline decoration-primary/60 underline-offset-4">{step.title}</span>
                    <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                  <span className="mt-1 block text-body-sm text-muted-foreground">{step.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Secao>
      </div>
    </MainLayout>
  );
}
