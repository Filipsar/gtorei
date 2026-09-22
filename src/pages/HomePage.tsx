import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SEO } from '@/components/seo/SEO';
import { useReveal } from '@/hooks/useReveal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Instagram,
  Heart,
  Accessibility,
  ArrowRight,
  Zap,
  TableProperties,
  BarChart3,
  Brain,
  Trophy,
  Award,
  Users,
  BookOpen,
  Search,
  Bell,
  User,
  Sparkles,
  ShieldCheck,
  Target,
  TrendingUp,
  CheckCircle2,
  Shield,
  FileText,
  Cookie,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { RangePreview, VerdictPreview } from '@/components/home/HomePreviews';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// Conferidos no banco em 21/09/2026: 152 contas, 126 jogadores com mãos registradas,
// 39.552 mãos. Arredondados para baixo — só ficam mais verdadeiros com o tempo.
// Reconferir antes de aumentar qualquer um deles.
const NUMEROS = [
  { valor: '39 mil+', label: 'mãos treinadas na plataforma' },
  { valor: '120+', label: 'jogadores estudando aqui' },
  { valor: '7', label: 'stacks de push/fold resolvidos' },
  { valor: 'R$ 0', label: 'agora e sempre' },
];

const FAQ = [
  {
    q: 'O GTORei é gratuito de verdade?',
    a: 'É. Não existe plano pago, paywall nem pedido de cartão. O projeto se mantém com doações de quem usa, e quem não doa nada continua com o treino inteiro liberado.',
  },
  {
    q: 'As ranges são calculadas ou copiadas de alguma tabela?',
    a: 'Os spots de stack curto, de 8bb a 20bb, são calculados aqui: uma matriz de equity 169x169 gerada por simulação de Monte Carlo e, em cima dela, iteração de melhor-resposta amortecida até o equilíbrio de push/fold. Os resultados batem com as tabelas de Nash publicadas. Os spots de stack profundo ainda usam ranges de referência e estão sendo reconstruídos do mesmo jeito.',
  },
  {
    q: 'Serve para torneio ou para cash game?',
    a: 'O foco é torneio. Você treina 8-max, 6-max, heads-up, bounty e mesa final, com stacks de 10bb a 200bb. Boa parte serve para cash, mas as ranges curtas foram feitas pensando em torneio.',
  },
  {
    q: 'Preciso instalar alguma coisa?',
    a: 'Não. Roda no navegador, inclusive no celular. Basta criar uma conta grátis para o progresso e a posição no ranking ficarem salvos.',
  },
  {
    q: 'Posso usar o GTORei enquanto jogo uma mão de verdade?',
    a: 'Não use. As salas proíbem assistência em tempo real, e a punição vai de banimento a confisco de saldo. O GTORei é ferramenta de estudo: você treina antes para decidir sozinho na mesa.',
  },
  {
    q: 'Como funciona a análise por IA?',
    a: 'Você envia o hand history exportado da sala — o parser entende seis salas, entre elas PokerStars, GGPoker e ACR. A análise devolve, mão a mão, a linha GTO, a sua ação e quanto de EV a diferença custou.',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();

  const goCTA = () => navigate(user ? '/treinar' : '/auth');
  const ctaLabel = user ? t.home.play : 'Criar conta grátis';

  // Animações de entrada das seções abaixo da dobra (ver o comentário do hook)
  const pagina = useRef<HTMLDivElement>(null);
  useReveal(pagina);

  // A entrada do topo é CSS puro, e não GSAP: ela precisa desenhar junto com a
  // página. Se dependesse do script, o herói apareceria, sumiria e voltaria.
  const entrada = (atraso: number) => ({
    animationDelay: `${atraso}ms`,
    animationDuration: '700ms',
    animationFillMode: 'both' as const,
  });

  const features = [
    { icon: Zap, title: 'Treinador GTO', desc: 'Pratique decisões pré-flop e pós-flop com ranges de solver para cada posição e stack.', to: '/treinar', tag: 'Treino' },
    { icon: Brain, title: 'Análise com IA', desc: 'Faça upload do seu hand history e receba veredicto GTO + EV mão a mão por IA.', to: '/analise-ia', tag: 'Novo' },
    { icon: TableProperties, title: 'Tabelas de Range', desc: 'Matrizes 13x13 interativas com frequências de cada ação por spot.', to: '/tabelas', tag: 'Estudo' },
    { icon: BarChart3, title: 'Análise de Mãos', desc: 'Revise suas decisões street-by-street e entenda o porquê da linha ótima.', to: '/analise', tag: 'Review' },
    { icon: Trophy, title: 'Ranking Global', desc: 'Suba de Iniciante até GTO Rei (250k XP) competindo com a comunidade.', to: '/ranking', tag: 'Competitivo' },
    { icon: Award, title: 'Conquistas', desc: 'Desbloqueie achievements por precisão, volume e streaks de acertos.', to: '/conquistas', tag: 'Gamificação' },
    { icon: Users, title: 'Comunidade', desc: 'Compare resultados, siga jogadores e discuta mãos com outros estudantes.', to: '/comunidade', tag: 'Social' },
    { icon: BookOpen, title: 'Guia Iniciante', desc: 'Comece do zero com explicações de posições, ranges e fundamentos de torneio.', to: '/iniciante', tag: 'Iniciante' },
  ];

  const modes = [
    { icon: Target, title: 'Pré-flop GTO', desc: '6-Max, 8-Max, Heads-Up, Bounty e Mesa Final com ICM.' },
    { icon: Sparkles, title: 'Pós-flop completo', desc: 'Flop, turn e river com sizings e leitura de textura do board.' },
    { icon: TrendingUp, title: 'Stacks dinâmicas', desc: 'De 10bb a 200bb com interpolação automática de ranges.' },
    { icon: ShieldCheck, title: '100% gratuito', desc: 'Sem paywall. Apoiado pela comunidade que joga.' },
  ];

  const steps = [
    { n: '01', title: 'Crie sua conta', desc: 'Cadastro grátis em segundos, com Google ou e-mail.' },
    { n: '02', title: 'Escolha o modo', desc: 'Selecione formato, stack e dificuldade do seu treino.' },
    { n: '03', title: 'Decida a ação', desc: 'O GTORei compara sua escolha com a linha de solver.' },
    { n: '04', title: 'Evolua', desc: 'Ganhe XP, suba de ranking e destrave conquistas.' },
  ];

  return (
    <div ref={pagina} className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <SEO
        title="GTORei — Treinador de Poker GTO grátis em português"
        description="Treine decisões de poker GTO de graça: ranges pré-flop por posição e stack, push/fold calculado por EV, análise de mãos por IA e ranking. Em português."
        path="/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "GTORei",
            url: "https://www.gtorei.com.br/",
            applicationCategory: "EducationApplication",
            operatingSystem: "Web",
            inLanguage: "pt-BR",
            offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
            description:
              "Treinador de poker GTO com ranges pré-flop calculadas por EV, análise de mãos por IA e ranking competitivo.",
          },
          // Mesmo conteúdo do bloco de perguntas na página: o Google exige que a
          // resposta marcada esteja visível para quem abre o site.
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          },
        ]}
      />
      {/* Top Instagram banner */}
      <div className="fixed top-0 left-0 right-0 z-50 overflow-hidden h-9 flex items-center bg-primary/10 text-primary border-b border-primary/25">
        <a
          href="https://www.instagram.com/gtorei/"
          target="_blank"
          rel="noopener noreferrer"
          className="animate-marquee whitespace-nowrap flex items-center gap-6 hover:opacity-80 transition-opacity"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="inline-flex items-center gap-2 text-sm font-medium">
              <Instagram className="h-4 w-4" />
              {t.home.instagramBanner}
            </span>
          ))}
        </a>
      </div>

      {/* Sticky nav */}
      <header className="fixed top-9 left-0 right-0 z-40 backdrop-blur-lg bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* 128px em vez do original de 540px: mesmo logo, 12 KB no lugar de 145 KB */}
            <img
              src="/logo-128.png"
              alt="GTORei"
              width={128}
              height={128}
              className="h-9 w-9 object-contain"
            />
            {/* No celular fica só o ícone: o texto encostava no botão Entrar */}
            <span className="text-heading-sm hidden sm:inline">
              <span className="text-primary">GTO</span>
              <span>Rei</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#recursos" className="hover:text-foreground transition-colors">Recursos</a>
            <a href="#modos" className="hover:text-foreground transition-colors">Modos</a>
            <a href="#como-funciona" className="hover:text-foreground transition-colors">Como funciona</a>
            <a href="#comunidade" className="hover:text-foreground transition-colors">Comunidade</a>
            <a href="#perguntas" className="hover:text-foreground transition-colors">Perguntas</a>
          </nav>
          <div className="flex items-center gap-2">
            {!user && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
                Entrar
              </Button>
            )}
            <Button size="sm" onClick={goCTA} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {ctaLabel}
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-40 pb-24 px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,184,0,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,184,0,0.4) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
              maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
            }}
          />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-primary/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <div
            style={entrada(0)}
            className="animate-in fade-in slide-in-from-bottom-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-8"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Agora com Análise de Torneio por IA
          </div>

          <h1
            style={entrada(80)}
            className="animate-in fade-in slide-in-from-bottom-3 text-4xl sm:text-7xl font-bold tracking-tight mb-6 leading-[1.05]"
          >
            Treine como um <span className="text-primary">solver</span>.<br />
            Jogue como um <span className="text-primary">rei</span>.
          </h1>

          <p
            style={entrada(160)}
            className="animate-in fade-in slide-in-from-bottom-3 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            O GTORei é o treinador de poker GTO gratuito mais completo em português.
            Ranges de solver, IA, ranking global e conquistas — tudo num só lugar.
          </p>

          <div
            style={entrada(240)}
            className="animate-in fade-in slide-in-from-bottom-3 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button
              size="lg"
              onClick={goCTA}
              className="text-base px-8 py-6 font-bold bg-primary text-primary-foreground hover:bg-primary/90 glow-gold"
            >
              {ctaLabel}
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById('recursos')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-base px-8 py-6"
            >
              Ver recursos
            </Button>
          </div>

          <div
            style={entrada(320)}
            className="animate-in fade-in slide-in-from-bottom-3 mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground"
          >
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 100% gratuito</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Sem cartão</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Ranges calculadas por EV</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Português & Inglês</span>
          </div>

          {/* Em vez de descrever o produto, mostrar uma range que o solver calculou */}
          <div
            style={entrada(400)}
            className="animate-in fade-in slide-in-from-bottom-3 mt-14 max-w-xl mx-auto"
          >
            <RangePreview />
          </div>
        </div>
      </section>

      {/* NÚMEROS — fundo igual ao do hero para não colar na seção de recursos */}
      <section className="border-y border-border bg-background py-10 px-6">
        <div data-reveal-stagger className="mx-auto grid max-w-5xl grid-cols-2 gap-8 md:grid-cols-4">
          {NUMEROS.map((n) => (
            <div key={n.label} data-reveal-item className="text-center">
              <p data-contar className="text-3xl sm:text-4xl font-bold text-primary tabular-nums">{n.valor}</p>
              <p className="mt-1 text-sm text-muted-foreground text-balance">{n.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES — card presentation */}
      <section id="recursos" className="relative py-24 px-6 bg-card/30 border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div data-reveal className="text-center mb-14 max-w-2xl mx-auto">
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Recursos</p>
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">Tudo o que você precisa para evoluir</h2>
            <p className="text-muted-foreground text-lg">
              Cada funcionalidade pensada para transformar estudo em decisão automática na mesa.
            </p>
          </div>

          <div data-reveal-stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <Card
                key={f.title}
                data-reveal-item
                onClick={() => user ? navigate(f.to) : navigate('/auth')}
                className="group cursor-pointer p-6 bg-card hover:bg-card/80 border-border hover:border-primary/40 transition-all hover:-translate-y-1 hover:shadow-[0_10px_40px_-15px_rgba(255,184,0,0.3)]"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <f.icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-primary/80 bg-primary/10 px-2 py-1 rounded">
                    {f.tag}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{f.desc}</p>
                <div className="inline-flex items-center gap-1.5 text-sm font-medium text-primary group-hover:gap-2.5 transition-all">
                  Explorar <ArrowRight className="h-4 w-4" />
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button size="lg" onClick={goCTA} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {ctaLabel} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* MODES — split presentation cards */}
      <section id="modos" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div data-reveal className="text-center mb-14 max-w-2xl mx-auto">
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Modos de jogo</p>
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">Cobertura completa de torneios</h2>
            <p className="text-muted-foreground text-lg">
              De 6-Max a Heads-Up, com bounty e ICM de mesa final — todos os formatos importantes.
            </p>
          </div>

          <div data-reveal-stagger className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {modes.map((m) => (
              <Card key={m.title} data-reveal-item className="p-8 bg-card border-border hover:border-primary/30 transition-colors">
                <div className="flex items-start gap-5">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0">
                    <m.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{m.title}</h3>
                    <p className="text-muted-foreground">{m.desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — numbered cards */}
      <section id="como-funciona" className="py-24 px-6 bg-card/30 border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div data-reveal className="text-center mb-14 max-w-2xl mx-auto">
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Como funciona</p>
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">Do cadastro à evolução em 4 passos</h2>
          </div>

          <div data-reveal-stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((s) => (
              <Card key={s.n} data-reveal-item className="p-7 bg-card border-border relative overflow-hidden">
                <span className="absolute -top-3 -right-3 text-7xl font-black text-primary/10 select-none">{s.n}</span>
                <div className="relative">
                  <p className="text-primary text-sm font-bold mb-3">{s.n}</p>
                  <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button size="lg" onClick={goCTA} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Começar agora <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* AI HIGHLIGHT */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Card data-reveal className="overflow-hidden bg-gradient-to-br from-primary/15 via-card to-card border-primary/30 p-10 md:p-14">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold mb-5">
                  <Brain className="h-3.5 w-3.5" /> Novo
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
                  Análise de Torneio com <span className="text-primary">IA</span>
                </h2>
                <p className="text-muted-foreground text-lg mb-6">
                  Suba seu hand history do PokerStars, GGPoker, ACR e outras salas.
                  Receba veredicto GTO, EV delta e linha ótima sugerida — mão a mão.
                </p>
                <ul className="space-y-2.5 mb-7 text-sm">
                  {['Parser para 6 salas diferentes', 'Análise por IA via Gemini', 'Gráfico de EV acumulado', 'Breakdown decisão por decisão'].map((i) => (
                    <li key={i} className="flex items-center gap-2 text-foreground/90">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {i}
                    </li>
                  ))}
                </ul>
                <Button onClick={() => user ? navigate('/analise-ia') : navigate('/auth')} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {user ? 'Analisar agora' : 'Criar conta e analisar'} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              {/* Um ícone gigante não dizia nada: melhor mostrar o formato do veredicto */}
              <div className="relative">
                <VerdictPreview />
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* COMMUNITY / RANKING */}
      <section id="comunidade" className="py-24 px-6 bg-card/30 border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div data-reveal className="text-center mb-14 max-w-2xl mx-auto">
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Comunidade</p>
            <h2 className="text-3xl sm:text-5xl font-bold mb-4 text-balance">Suba de Iniciante a GTO Rei</h2>
            <p className="text-muted-foreground text-lg">
              Ganhe XP a cada decisão certa, destrave conquistas e dispute o topo do ranking mensal.
            </p>
          </div>

          <div data-reveal-stagger className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card data-reveal-item className="p-7 bg-card border-border">
              <Trophy className="h-8 w-8 text-primary mb-4" />
              <p className="text-3xl font-bold mb-1">8 ranks</p>
              <p className="text-sm text-muted-foreground">de Iniciante até GTO Rei (250.000 XP)</p>
            </Card>
            <Card data-reveal-item className="p-7 bg-card border-border">
              <Award className="h-8 w-8 text-primary mb-4" />
              <p className="text-3xl font-bold mb-1">Dezenas</p>
              <p className="text-sm text-muted-foreground">de conquistas para precisão, volume e streaks</p>
            </Card>
            <Card data-reveal-item className="p-7 bg-card border-border">
              <Users className="h-8 w-8 text-primary mb-4" />
              <p className="text-3xl font-bold mb-1">Ranking mensal</p>
              <p className="text-sm text-muted-foreground">reset todo mês, novas chances de subir ao topo</p>
            </Card>
          </div>
        </div>
      </section>


      {/* PERGUNTAS — o mesmo texto vai no FAQPage lá em cima; se mudar aqui, mudar lá */}
      <section id="perguntas" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div data-reveal className="text-center mb-12">
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Perguntas</p>
            <h2 className="text-3xl sm:text-5xl font-bold mb-4 text-balance">Antes de criar sua conta</h2>
            <p className="text-muted-foreground text-lg">
              O que as pessoas mais perguntam antes de começar a treinar.
            </p>
          </div>

          <Accordion data-reveal type="single" collapsible className="w-full">
            {FAQ.map((item, i) => (
              <AccordionItem key={item.q} value={`p-${i}`} className="border-border">
                <AccordionTrigger className="text-left text-base font-semibold hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Ficou faltando alguma?{' '}
            <a
              href="https://www.instagram.com/gtorei/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Pergunte no Instagram
            </a>
            .
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-28 px-6 relative overflow-hidden border-t border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div data-reveal className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-6xl font-bold mb-6 leading-tight">
            Pronto para jogar como um <span className="text-primary">rei</span>?
          </h2>
          <p className="text-lg text-muted-foreground mb-10">
            Crie sua conta grátis e comece a treinar com ranges de solver em menos de um minuto.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={goCTA}
              className="text-base px-10 py-7 font-bold bg-primary text-primary-foreground hover:bg-primary/90 glow-gold"
            >
              {ctaLabel} <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/apoiar')}
            >
              <Heart className="h-4 w-4 text-destructive" /> Apoiar o projeto
            </Button>
          </div>

          <div className="mt-12 flex flex-col items-center gap-4">
            <a
              href="https://www.instagram.com/gtorei/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
            >
              <Instagram className="h-5 w-5 text-primary" />
              <span className="font-medium">{t.home.followUs} — @gtorei</span>
            </a>
          </div>
        </div>
      </section>

      {/* PRIVACY / TERMS / LGPD */}
      <section className="py-16 px-6 bg-card/30 border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div data-reveal className="text-center mb-12 max-w-2xl mx-auto">
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Transparência</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Privacidade, Dados e Termos</h2>
            <p className="text-muted-foreground">
              Ao criar sua conta no GTORei, você concorda com nossas diretrizes de uso e tratamento de dados.
            </p>
          </div>

          <div data-reveal-stagger className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card data-reveal-item className="p-7 bg-card border-border">
              <Shield className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Política de Privacidade</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Seus dados pessoais são tratados com segurança e utilizados apenas para operação da plataforma,
                análise de desempenho e comunicação direta. Não vendemos dados a terceiros.
              </p>
            </Card>

            <Card data-reveal-item className="p-7 bg-card border-border">
              <FileText className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Termos de Uso</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                O uso do GTORei é destinado a fins de estudo e entretenimento. O usuário é responsável
                por suas decisões em mesas reais. Conteúdo e ranges são para referência educacional.
              </p>
            </Card>

            <Card data-reveal-item className="p-7 bg-card border-border">
              <Cookie className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Cookies e Marketing</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Utilizamos cookies para funcionalidade, análise de uso e remarketing. Ao se registrar,
                você concorda com o uso de dados para personalização de conteúdo, campanhas de marketing
                e comunicações por e-mail e notificações.
              </p>
            </Card>
          </div>

          <div className="mt-10 text-center text-xs text-muted-foreground max-w-3xl mx-auto">
            Conforme a LGPD, você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento
            através da página de perfil ou entrando em contato diretamente com nossa equipe.
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo-128.png" alt="GTORei" width={128} height={128} loading="lazy" className="h-7 w-7 object-contain" />
            <span className="text-sm">
              <span className="text-primary font-bold">GTO</span>
              <span className="font-bold">Rei</span>
              <span className="text-muted-foreground ml-2">© 2026 — Treine como um solver.</span>
            </span>
          </div>
          {/* Link em vez de button: eram os únicos caminhos para as páginas públicas e,
              como onClick, nenhum robô conseguia seguir nem indexar o destino. */}
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Link to="/iniciante" className="hover:text-foreground transition-colors">Guia do iniciante</Link>
            <Link to="/atualizacoes" className="hover:text-foreground transition-colors">Atualizações</Link>
            <Link to="/apoiar" className="hover:text-foreground transition-colors">Apoiar</Link>
            <Link to="/gtoreiacessibilidade" className="hover:text-foreground transition-colors inline-flex items-center gap-1">
              <Accessibility className="h-4 w-4" /> Acessibilidade
            </Link>
            <a href="https://www.instagram.com/gtorei/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors inline-flex items-center gap-1">
              <Instagram className="h-4 w-4" /> Instagram
            </a>
          </nav>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee { animation: marquee 20s linear infinite; }
        /* Deixa ler a mensagem inteira: pausa ao passar o mouse ou ao focar pelo teclado */
        .animate-marquee:hover,
        .animate-marquee:focus-visible { animation-play-state: paused; }
      `}</style>
    </div>
  );
}
