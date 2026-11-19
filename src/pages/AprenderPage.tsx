import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, GraduationCap } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SEO } from '@/components/seo/SEO';
import { ARTIGOS, materialDoArtigo } from '@/data/artigos';

const SITE = 'https://www.gtorei.com.br';

/** Índice dos artigos de conceito (/aprender) */
export default function AprenderPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: ARTIGOS.map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/aprender/${a.slug}`, name: a.titulo })),
  };

  return (
    <MainLayout>
      <SEO
        title="Aprenda Poker GTO: Artigos de Estratégia em Português — GTORei"
        description="Artigos curtos sobre as decisões que mais custam fichas em torneio: abertura, resposta ao raise, 3-bet, all-in, ICM e pós-flop. Grátis e em português."
        path="/aprender"
        jsonLd={jsonLd}
      />
      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="rounded-2xl border border-primary/30 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.18),transparent_60%)] p-6 sm:p-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-foreground">
            <GraduationCap className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Aprender
          </span>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            As decisões que mais custam fichas no torneio
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Um artigo por spot, com o porquê de cada decisão, regras práticas e o erro que mais aparece. Os números das
            tabelas saem do próprio motor de ranges do GTORei. Está começando agora? Comece pelo{' '}
            <Link to="/iniciante" className="text-primary underline underline-offset-2">Guia do Iniciante</Link>.
          </p>
        </header>

        <ol className="grid gap-3 sm:grid-cols-2">
          {ARTIGOS.map((a) => (
            <li key={a.slug}>
              <Link
                to={`/aprender/${a.slug}`}
                className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> {materialDoArtigo(a).titulo}
                </span>
                <span className="mt-2 font-semibold leading-snug text-foreground">{a.titulo}</span>
                <span className="mt-1.5 flex-1 text-sm text-muted-foreground">{materialDoArtigo(a).resumo}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Ler <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </MainLayout>
  );
}
