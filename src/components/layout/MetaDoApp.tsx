import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, X } from 'lucide-react';
import { META_DO_APP_PERCENTUAL } from '@/data/metaDoApp';
import { ehApp } from '@/lib/nativo/plataforma';

/**
 * Faixa da meta de doações para lançar o app (18/11/2026): o Rei do lado
 * "falando", a barra enchendo até o percentual e o botão para doar.
 *
 * Só no site: no app, conteúdo digital só se vende pelo Google Play, então o
 * pedido de Pix não aparece lá (mesma regra do MaintenanceBanner). Fica fora da
 * mesa de treino e da própria página de apoio. Fechar esconde até o dia
 * seguinte; sem armazenamento, fecha só nesta página.
 */

const ROTAS_SEM_META = ['/treinar', '/duelo', '/trilha', '/apoiar', '/pro', '/auth'];
const CHAVE = 'gtorei_meta_app_fechada';

const hoje = () => new Date().toISOString().slice(0, 10);

function fechadaHoje(): boolean {
  try {
    return localStorage.getItem(CHAVE) === hoje();
  } catch {
    return false;
  }
}

export function MetaDoApp() {
  const { pathname } = useLocation();
  const [fechada, setFechada] = useState(fechadaHoje);
  const pct = Math.max(0, Math.min(100, Math.round(META_DO_APP_PERCENTUAL)));

  if (ehApp() || fechada || pct >= 100 || ROTAS_SEM_META.includes(pathname)) return null;

  const fechar = () => {
    setFechada(true);
    try {
      localStorage.setItem(CHAVE, hoje());
    } catch {
      // armazenamento bloqueado: fecha só agora
    }
  };

  return (
    <section
      aria-label="Meta de doações para lançar o app"
      className="relative mx-3 mt-3 overflow-hidden rounded-xl border border-primary/30 bg-card px-3 py-2.5 sm:mx-4 sm:px-4"
    >
      <div className="flex items-center gap-3">
        <img
          src="/mascote/rei-explicando.webp"
          alt=""
          width={56}
          height={56}
          className="h-12 w-12 shrink-0 origin-bottom select-none object-contain motion-safe:animate-rei-fala sm:h-14 sm:w-14"
          draggable={false}
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-foreground">
            <span className="hidden sm:inline">Faltam só {100 - pct}% para o app do GTORei chegar à Play Store!</span>
            <span className="sm:hidden">Meta do app na Play Store</span>
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <div
              className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Meta de doações para o app: ${pct}%`}
            >
              <div className="absolute inset-y-0 left-0 overflow-hidden rounded-full" style={{ width: `${pct}%` }}>
                <div className="h-full w-full origin-left bg-primary motion-safe:animate-meta-enche" />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent opacity-0 motion-safe:animate-meta-brilho motion-safe:opacity-100"
                />
              </div>
            </div>
            <span className="shrink-0 text-xs font-bold tabular-nums text-foreground">{pct}%</span>
          </div>
        </div>

        <Link
          to="/apoiar"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Heart className="h-4 w-4" aria-hidden="true" />
          Doar
        </Link>

        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar a faixa da meta"
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
