import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Swords } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SEO } from '@/components/seo/SEO';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { DUELOS, type FaixaDoDuelo } from '@/data/duelo';
import { usarLayoutDoApp } from '@/lib/nativo/plataforma';
import { cn } from '@/lib/utils';

/** Duelo do app (/duelo): heads-up contra o Rei, com placar */
export default function DueloPage() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [faixa, setFaixa] = useState<FaixaDoDuelo>('curto');

  if (!usarLayoutDoApp()) return <Navigate to="/treinar" replace />;

  const inicial = (profile?.username || user?.email || 'V').charAt(0).toUpperCase();

  return (
    <MainLayout>
      <SEO title="Duelo — GTORei" description="Heads-up contra o Rei." path="/duelo" noindex />
      <div className="mx-auto max-w-lg space-y-6 px-4 pb-10 pt-4">
        <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/15 via-card to-card p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Heads-up</p>
          <h1 className="mt-1 text-2xl font-bold">Duelo contra o Rei</h1>
          <div className="mt-5 flex items-center justify-center gap-4" aria-hidden="true">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-poker-blinds bg-card text-2xl font-bold">
              {inicial}
            </span>
            <Swords className="h-8 w-8 text-primary" />
            <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-primary bg-card">
              <img src="/mascote/rei-avatar.webp" alt="" width={192} height={256} className="h-14 w-auto" />
            </span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Só vocês dois na mesa. Cada mão certa é ponto seu; cada erro, ponto do Rei. Pare quando quiser.
          </p>
        </section>

        <fieldset>
          <legend className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stack</legend>
          <div className="space-y-2" role="radiogroup">
            {DUELOS.map((d) => {
              const on = faixa === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setFaixa(d.id)}
                  className={cn(
                    'flex min-h-[64px] w-full items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    on ? 'border-primary bg-primary/10' : 'border-border active:bg-muted'
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                      on ? 'border-primary' : 'border-muted-foreground'
                    )}
                  >
                    {on && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{d.titulo}</span>
                    <span className="block text-sm text-muted-foreground">{d.detalhe}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <Button className="h-14 w-full text-lg font-bold" onClick={() => navigate(`/treinar?duelo=${faixa}`)}>
          <Swords className="mr-2 h-5 w-5" aria-hidden="true" /> Duelar
        </Button>
        <p className="text-center text-xs text-muted-foreground">O XP de cada mão conta como em qualquer treino.</p>
      </div>
    </MainLayout>
  );
}
