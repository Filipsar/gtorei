import { useEffect, useState } from 'react';
import { ArrowRight, Newspaper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Resumida {
  titulo: string;
  slug: string;
  fonte: string;
  resumo: string;
  publicada_em: string;
  imagem_url?: string | null;
}

const dia = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' });

const corte = (texto: string, limite: number) => {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  return limpo.length <= limite ? limpo : `${limpo.slice(0, limite).replace(/\s+\S*$/, '')}…`;
};

/**
 * Últimas notícias na página inicial: é daqui que o Google (e quem não tem
 * conta) chega em /noticias. Os links são <a> comuns porque as páginas das
 * notícias vêm do servidor (api/noticias.ts), não do SPA. Sem notícia
 * publicada, a seção não aparece.
 */
export function UltimasNoticias() {
  const [lista, setLista] = useState<Resumida[]>([]);

  useEffect(() => {
    const consultar = (colunas: string) =>
      supabase.from('noticias').select(colunas).eq('status', 'publicada').order('publicada_em', { ascending: false }).limit(3);
    void (async () => {
      // Sem as colunas de imagem (migration 20261024170000 por aplicar), vai sem elas
      let { data, error } = await consultar('titulo, slug, fonte, resumo, publicada_em, imagem_url');
      if (error) ({ data, error } = await consultar('titulo, slug, fonte, resumo, publicada_em'));
      if (!error && data) setLista(data as unknown as Resumida[]);
    })();
  }, []);

  if (lista.length === 0) return null;

  return (
    <section id="noticias" className="cv-auto py-16 sm:py-24 px-6" aria-labelledby="noticias-titulo">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4 sm:mb-12">
          <div className="max-w-2xl">
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Notícias</p>
            <h2 id="noticias-titulo" className="text-3xl sm:text-5xl font-bold mb-4 text-balance">
              O que está acontecendo no poker
            </h2>
            <p className="text-muted-foreground text-lg">
              As notícias do circuito resumidas em português, com o que importa para quem joga torneio.
            </p>
          </div>
          <a
            href="/noticias"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:border-primary/50"
          >
            Ver todas as notícias <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        <ul className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {lista.map((n) => (
            <li key={n.slug}>
              <a
                href={`/noticias/${n.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50 sm:p-6"
              >
                {n.imagem_url && (
                  <img
                    src={n.imagem_url}
                    alt=""
                    width={1200}
                    height={630}
                    loading="lazy"
                    className="-mx-5 -mt-5 mb-4 aspect-[1200/630] w-[calc(100%+2.5rem)] max-w-none object-cover sm:-mx-6 sm:-mt-6 sm:w-[calc(100%+3rem)]"
                  />
                )}
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
                  {dia(n.publicada_em)} · {n.fonte}
                </span>
                <span className="mt-3 text-lg font-bold leading-snug group-hover:underline">{n.titulo}</span>
                <span className="mt-2 text-sm text-muted-foreground">{corte(n.resumo, 150)}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
