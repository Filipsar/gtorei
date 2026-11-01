import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Brain, Crown, Gift, Loader2 } from 'lucide-react';
import { AIAnalysis } from '@/components/analysis/AIAnalysis';
import { SEO } from '@/components/seo/SEO';
import { Button } from '@/components/ui/button';
import { useSupporter } from '@/hooks/useSupporter';
import { useAuth } from '@/contexts/AuthContext';
import { ADMIN_EMAIL } from '@/data/admin';
import { ehApp } from '@/lib/nativo/plataforma';

// Desde 01/11/2026 a análise com IA é só para PRO: cada análise gasta crédito de
// IA do projeto. É trava de tela; o limite de verdade continua na função
// analyze-hand-history (5 por dia sem PRO, 30 com).
export default function AIAnalysisPage() {
  const { user } = useAuth();
  const { isSupporter, loading } = useSupporter();
  const liberado = isSupporter || user?.email === ADMIN_EMAIL;
  const app = ehApp();

  return (
    <MainLayout>
      <SEO
        title="Análise de Mãos de Poker com IA — GTORei"
        description="Importe seu hand history e receba análise mão por mão com ICM, bubble factor e recomendações GTO geradas por IA."
        path="/analise-ia"
      />
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-heading-md sm:text-heading-lg text-foreground flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            Análise de Torneio com IA
          </h1>
          <p className="text-body-sm text-muted-foreground mt-1">
            Importe seu hand history e receba análise mão por mão com ICM, bubble factor e recomendações GTO.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16" role="status" aria-label="Carregando">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : liberado ? (
          <AIAnalysis />
        ) : (
          <div className="rounded-2xl border border-primary/40 bg-card p-6 sm:p-8 text-center">
            <Crown className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-foreground">Análise com IA é recurso PRO</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Cada análise usa um modelo de IA pago pelo projeto. Para manter o treino grátis
              para todo mundo, a análise de hand history fica com quem é PRO.
            </p>
            <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild>
                <Link to={app ? '/pro' : '/apoiar'}>
                  <Crown className="h-4 w-4" aria-hidden="true" />
                  {app ? 'Seja PRO' : 'Apoiar e virar PRO'}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/indicar">
                  <Gift className="h-4 w-4" aria-hidden="true" />
                  Indicar 15 amigos: 7 dias de PRO
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
