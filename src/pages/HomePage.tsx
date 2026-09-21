import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components/seo/SEO';
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

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();

  const goCTA = () => navigate(user ? '/treinar' : '/auth');
  const ctaLabel = user ? t.home.play : 'Criar conta grátis';

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
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <SEO
        title="GTORei — Treinador de Poker GTO em Português"
        description="Treine decisões pré-flop e pós-flop, estude ranges GTO, analise mãos com IA e suba no ranking. Plataforma de poker GTO gratuita em português."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "GTORei",
          applicationCategory: "EducationApplication",
          operatingSystem: "Web",
          inLanguage: "pt-BR",
          offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
          description:
            "Treinador de poker GTO com simulações, ranges pré-flop, análise de mãos por IA e ranking competitivo.",
        }}
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
            <img
              src="/lovable-uploads/518567fe-7b99-45ff-92c1-2879711b6051.png"
              alt="GTORei"
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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            Agora com Análise de Torneio por IA
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6 leading-[1.05]">
            Treine como um <span className="text-primary">solver</span>.<br />
            Jogue como um <span className="text-primary">rei</span>.
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            O GTORei é o treinador de poker GTO gratuito mais completo em português.
            Ranges de solver, IA, ranking global e conquistas — tudo num só lugar.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
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

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 100% gratuito</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Sem cartão</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Ranges de solver real</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Português & Inglês</span>
          </div>
        </div>
      </section>

      {/* FEATURES — card presentation */}
      <section id="recursos" className="relative py-24 px-6 bg-card/30 border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Recursos</p>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Tudo o que você precisa para evoluir</h2>
            <p className="text-muted-foreground text-lg">
              Cada funcionalidade pensada para transformar estudo em decisão automática na mesa.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <Card
                key={f.title}
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
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Modos de jogo</p>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Cobertura completa de torneios</h2>
            <p className="text-muted-foreground text-lg">
              De 6-Max a Heads-Up, com bounty e ICM de mesa final — todos os formatos importantes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {modes.map((m) => (
              <Card key={m.title} className="p-8 bg-card border-border hover:border-primary/30 transition-colors">
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
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Como funciona</p>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Do cadastro à evolução em 4 passos</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((s) => (
              <Card key={s.n} className="p-7 bg-card border-border relative overflow-hidden">
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
          <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-card to-card border-primary/30 p-10 md:p-14">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold mb-5">
                  <Brain className="h-3.5 w-3.5" /> Novo
                </div>
                <h2 className="text-4xl font-bold mb-4 leading-tight">
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
              <div className="relative">
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 flex items-center justify-center">
                  <Brain className="h-40 w-40 text-primary/60" strokeWidth={1.2} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* COMMUNITY / RANKING */}
      <section id="comunidade" className="py-24 px-6 bg-card/30 border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Comunidade</p>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-balance">Suba de Iniciante a GTO Rei</h2>
            <p className="text-muted-foreground text-lg">
              Ganhe XP a cada decisão certa, destrave conquistas e dispute o topo do ranking mensal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="p-7 bg-card border-border">
              <Trophy className="h-8 w-8 text-primary mb-4" />
              <p className="text-3xl font-bold mb-1">8 ranks</p>
              <p className="text-sm text-muted-foreground">de Iniciante até GTO Rei (250.000 XP)</p>
            </Card>
            <Card className="p-7 bg-card border-border">
              <Award className="h-8 w-8 text-primary mb-4" />
              <p className="text-3xl font-bold mb-1">Dezenas</p>
              <p className="text-sm text-muted-foreground">de conquistas para precisão, volume e streaks</p>
            </Card>
            <Card className="p-7 bg-card border-border">
              <Users className="h-8 w-8 text-primary mb-4" />
              <p className="text-3xl font-bold mb-1">Ranking mensal</p>
              <p className="text-sm text-muted-foreground">reset todo mês, novas chances de subir ao topo</p>
            </Card>
          </div>
        </div>
      </section>


      {/* FINAL CTA */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-6xl font-bold mb-6 leading-tight">
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
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Transparência</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Privacidade, Dados e Termos</h2>
            <p className="text-muted-foreground">
              Ao criar sua conta no GTORei, você concorda com nossas diretrizes de uso e tratamento de dados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="p-7 bg-card border-border">
              <Shield className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Política de Privacidade</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Seus dados pessoais são tratados com segurança e utilizados apenas para operação da plataforma,
                análise de desempenho e comunicação direta. Não vendemos dados a terceiros.
              </p>
            </Card>

            <Card className="p-7 bg-card border-border">
              <FileText className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Termos de Uso</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                O uso do GTORei é destinado a fins de estudo e entretenimento. O usuário é responsável
                por suas decisões em mesas reais. Conteúdo e ranges são para referência educacional.
              </p>
            </Card>

            <Card className="p-7 bg-card border-border">
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
            <img src="/lovable-uploads/518567fe-7b99-45ff-92c1-2879711b6051.png" alt="GTORei" className="h-7 w-7 object-contain" />
            <span className="text-sm">
              <span className="text-primary font-bold">GTO</span>
              <span className="font-bold">Rei</span>
              <span className="text-muted-foreground ml-2">© 2026 — Treine como um solver.</span>
            </span>
          </div>
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <button onClick={() => navigate('/atualizacoes')} className="hover:text-foreground transition-colors">Atualizações</button>
            <button onClick={() => navigate('/apoiar')} className="hover:text-foreground transition-colors">Apoiar</button>
            <button onClick={() => navigate('/gtoreiacessibilidade')} className="hover:text-foreground transition-colors inline-flex items-center gap-1">
              <Accessibility className="h-4 w-4" /> Acessibilidade
            </button>
            <a href="https://www.instagram.com/gtorei/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors inline-flex items-center gap-1">
              <Instagram className="h-4 w-4" /> Instagram
            </a>
          </div>
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
