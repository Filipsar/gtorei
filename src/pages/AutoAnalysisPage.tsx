import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, Wrench } from 'lucide-react';

export default function AutoAnalysisPage() {
  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
            <Bot className="h-8 w-8 text-primary" />
            Autoanálise
          </h1>
          <p className="text-muted-foreground mt-1">
            Review de mãos com assistência de IA
          </p>
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Wrench className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Em Desenvolvimento</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Esta funcionalidade estará disponível em breve. 
              Você poderá revisar suas mãos jogadas com análise detalhada 
              e sugestões personalizadas de melhoria.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
