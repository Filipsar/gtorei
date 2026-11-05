import { ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ehApp } from '@/lib/nativo/plataforma';
import {
  AVISO_PARCEIROS,
  GGPOKER_URL,
  REL_PATROCINADO,
  WPT_GLOBAL_URL,
  WPT_OFERTA_IMG,
} from '@/data/salasParceiras';

/** "Onde jogar" da página inicial: links de indicação da GGPoker e da WPT Global (só no site) */
export function SalasParceiras() {
  if (ehApp()) return null;

  return (
    <section id="onde-jogar" className="cv-auto py-16 sm:py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div data-reveal className="text-center mb-10 max-w-2xl mx-auto">
          <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Onde jogar</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Leve o treino para a mesa</h2>
          <p className="text-muted-foreground">
            As duas salas em que o GTORei tem parceria. Cadastre-se pelo link e jogue os torneios que você treina aqui.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="p-6 bg-card border-border flex flex-col sm:flex-row gap-5 items-center">
            <a href={WPT_GLOBAL_URL} target="_blank" rel={REL_PATROCINADO} className="shrink-0">
              <img
                src={WPT_OFERTA_IMG}
                alt="Oferta de boas-vindas da WPT Global"
                width={1126}
                height={2000}
                loading="lazy"
                className="h-48 w-auto rounded-lg border border-border"
              />
            </a>
            <div className="text-center sm:text-left">
              <h3 className="text-xl font-semibold mb-2">WPT Global</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Oferta de boas-vindas para conta nova. Condições e valores no site da WPT Global.
              </p>
              <a
                href={WPT_GLOBAL_URL}
                target="_blank"
                rel={REL_PATROCINADO}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Criar conta na WPT Global
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border flex flex-col justify-center text-center sm:text-left">
            <h3 className="text-xl font-semibold mb-2">GGPoker</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Uma das maiores salas de poker online, com grade de torneios para todo buy-in.
            </p>
            <div>
              <a
                href={GGPOKER_URL}
                target="_blank"
                rel={REL_PATROCINADO}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Criar conta na GGPoker
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </Card>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground max-w-2xl mx-auto">{AVISO_PARCEIROS}</p>
      </div>
    </section>
  );
}
