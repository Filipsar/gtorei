import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Lightbulb, Target } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SEO } from '@/components/seo/SEO';
import { ARTIGOS, artigoPorSlug, materialDoArtigo, type Artigo } from '@/data/artigos';
import { getRange } from '@/data/gtoRanges';
import type { HandData, Position } from '@/data/ranges/types';

const SITE = 'https://www.gtorei.com.br';

// ─── Tabelas calculadas pelo motor (mesma range do treino e da tela de Tabelas) ───

const combos = (h: HandData) => (h.pair ? 6 : h.suited ? 4 : 12);
/** % dos 1.326 combos com a ação (ou ações) pedida */
function largura(hands: HandData[], acoes: string[]) {
  const t = hands.reduce(
    (s, h) => s + (combos(h) * h.actions.filter((a) => acoes.includes(a.action)).reduce((x, a) => x + a.frequency, 0)) / 100,
    0,
  );
  return (Math.round((1000 * t) / 1326) / 10).toLocaleString('pt-BR', { minimumFractionDigits: 1 }) + '%';
}

interface Tabela {
  titulo: string;
  nota: string;
  colunas: string[];
  linhas: string[][];
}

function montarTabela(tipo: NonNullable<Artigo['tabela']>): Tabela {
  if (tipo === 'aberturaPorPosicao') {
    const stacks = [15, 30, 100];
    const posicoes: Position[] = ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB'];
    return {
      titulo: 'Quanto cada posição abre (mesa de 8, ante de 1 BB)',
      nota: 'Porcentagem das 1.326 combinações de mãos que abrem (raise ou all-in).',
      colunas: ['Posição', ...stacks.map((s) => `${s} BB`)],
      linhas: posicoes.map((p) => [
        p,
        ...stacks.map((s) => largura(getRange('openRaise', p, s, false, '8max', 0).hands, ['raise', 'allin'])),
      ]),
    };
  }
  if (tipo === 'defesaDoBB') {
    const viloes: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB'];
    return {
      titulo: 'Big blind contra uma abertura, com 40 BB',
      nota: 'Porcentagem das combinações que pagam e que dão 3-bet, conforme quem abriu.',
      colunas: ['Quem abriu', 'Paga', '3-bet', 'Defende no total'],
      linhas: viloes.map((v) => {
        const h = getRange('vsOpenRaise', 'BB', 40, false, '8max', 0, 3, v).hands;
        return [v, largura(h, ['call']), largura(h, ['raise', 'allin']), largura(h, ['call', 'raise', 'allin'])];
      }),
    };
  }
  const viloes: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB'];
  const stacks = [10, 15, 20];
  return {
    titulo: 'Big blind pagando all-in, conforme quem empurrou',
    nota: 'Porcentagem das combinações que pagam o all-in, com ante de 1 BB e fora da bolha.',
    colunas: ['Quem foi all-in', ...stacks.map((s) => `${s} BB`)],
    linhas: viloes.map((v) => [
      v,
      ...stacks.map((s) => largura(getRange('vsOpenShove', 'BB', s, false, '8max', 0, 3, v).hands, ['call'])),
    ]),
  };
}

function TabelaDoMotor({ tipo }: { tipo: NonNullable<Artigo['tabela']> }) {
  const t = useMemo(() => montarTabela(tipo), [tipo]);
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-card">
      <figcaption className="border-b border-border px-4 py-3">
        <p className="font-semibold text-foreground">{t.titulo}</p>
        <p className="text-xs text-muted-foreground">{t.nota} Calculado pelo motor de ranges do GTORei.</p>
      </figcaption>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              {t.colunas.map((c) => (
                <th key={c} scope="col" className="px-4 py-2 font-medium">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.linhas.map((l) => (
              <tr key={l[0]} className="border-t border-border">
                {l.map((c, i) => (
                  <td key={i} className={i === 0 ? 'px-4 py-2 font-semibold text-foreground' : 'px-4 py-2 tabular-nums text-foreground'}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

// ─── Página ───

/** Artigo de conceito (/aprender/:slug) */
export default function AprenderArtigoPage() {
  const { slug } = useParams();
  const artigo = artigoPorSlug(slug);
  if (!artigo) return <Navigate to="/aprender" replace />;

  const m = materialDoArtigo(artigo);
  const indice = ARTIGOS.indexOf(artigo);
  const proximo = ARTIGOS[indice + 1];
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: artigo.titulo,
      description: artigo.descricao,
      inLanguage: 'pt-BR',
      mainEntityOfPage: `${SITE}/aprender/${artigo.slug}`,
      author: { '@type': 'Organization', name: 'GTORei', url: SITE },
      publisher: { '@type': 'Organization', name: 'GTORei', logo: { '@type': 'ImageObject', url: `${SITE}/logo-128.png` } },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Aprender', item: `${SITE}/aprender` },
        { '@type': 'ListItem', position: 2, name: m.titulo, item: `${SITE}/aprender/${artigo.slug}` },
      ],
    },
  ];

  return (
    <MainLayout>
      <SEO title={artigo.tituloSeo} description={artigo.descricao} path={`/aprender/${artigo.slug}`} type="article" jsonLd={jsonLd} />
      <article className="mx-auto max-w-3xl space-y-8 p-4 pb-16 sm:p-6 lg:p-8">
        <nav aria-label="Caminho" className="text-sm">
          <Link to="/aprender" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Aprender
          </Link>
        </nav>

        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{m.titulo}</p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">{artigo.titulo}</h1>
          <p className="text-lg leading-relaxed text-muted-foreground">{artigo.abertura}</p>
        </header>

        <section className="rounded-xl border border-primary/30 bg-primary/5 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <Target className="h-4 w-4 text-primary" aria-hidden="true" /> Por que isso custa fichas
          </h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">{m.porQue}</p>
        </section>

        {artigo.secoes.map((s, i) => (
          <section key={s.titulo} className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">{s.titulo}</h2>
            {s.paragrafos.map((p) => (
              <p key={p.slice(0, 40)} className="leading-relaxed text-muted-foreground">{p}</p>
            ))}
            {i === 0 && artigo.tabela && <TabelaDoMotor tipo={artigo.tabela} />}
          </section>
        ))}

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" /> Na prática
          </h2>
          <ul className="space-y-2">
            {m.naPratica.map((r) => (
              <li key={r.slice(0, 40)} className="flex gap-2 leading-relaxed text-muted-foreground">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                {r}
              </li>
            ))}
          </ul>
        </section>

        {artigo.exemplo && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-semibold text-foreground">
              <Lightbulb className="h-4 w-4 text-primary" aria-hidden="true" /> {artigo.exemplo.titulo}
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 leading-relaxed text-muted-foreground">
              {artigo.exemplo.passos.map((p) => (
                <li key={p.slice(0, 40)}>{p}</li>
              ))}
            </ol>
          </section>
        )}

        <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" /> O erro mais comum
          </h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">{m.erroComum}</p>
        </section>

        <footer className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          {artigo.treino ? (
            <Link
              to="/treinar"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {artigo.treino.rotulo} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <Link to="/tabelas" className="inline-flex items-center gap-2 font-semibold text-primary hover:underline">
              Ver as tabelas de range <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
          {proximo && (
            <Link to={`/aprender/${proximo.slug}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              Próximo: {materialDoArtigo(proximo).titulo} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </footer>
      </article>
    </MainLayout>
  );
}
