import { MainLayout } from '@/components/layout/MainLayout';
import { Brain } from 'lucide-react';
import { AIAnalysis } from '@/components/analysis/AIAnalysis';

export default function AIAnalysisPage() {
  return (
    <MainLayout>
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
        <AIAnalysis />
      </div>
    </MainLayout>
  );
}
