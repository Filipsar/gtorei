import { MainLayout } from '@/components/layout/MainLayout';
import { RankingApp } from '@/components/app/RankingApp';
import { usarLayoutDoApp } from '@/lib/nativo/plataforma';

/**
 * Ranking por ligas (src/components/app/RankingApp.tsx), igual no app e no
 * site desde 24/10/2026: a liga do dia no seu elo e o global do mês. No site
 * as duas colunas ficam lado a lado na tela larga.
 */
export default function RankingPage() {
  return (
    <MainLayout>
      <RankingApp site={!usarLayoutDoApp()} />
    </MainLayout>
  );
}
