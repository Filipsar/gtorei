import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Sparkles, Bug, Wrench } from 'lucide-react';

interface UpdateNote {
  version: string;
  date: string;
  type: 'feature' | 'improvement' | 'fix';
  title: string;
  description: string;
}

const UPDATES: UpdateNote[] = [
  {
    version: '1.2.1',
    date: '05/02/2026',
    type: 'improvement',
    title: 'Melhorias de Interface',
    description: 'Menu lateral simplificado, sistema de avatares personalizados e possibilidade de favoritar mãos durante o treino.',
  },
  {
    version: '1.2.0',
    date: '04/02/2026',
    type: 'feature',
    title: 'Página de Acessibilidade',
    description: 'Nova seção dedicada à acessibilidade e apoio a projetos inclusivos como Aces Inclusivos.',
  },
  {
    version: '1.1.5',
    date: '03/02/2026',
    type: 'feature',
    title: 'Configurações de Perfil',
    description: 'Agora você pode alterar seu nickname e personalizar seu perfil através do menu de configurações.',
  },
  {
    version: '1.1.4',
    date: '02/02/2026',
    type: 'feature',
    title: 'Temas Light/Dark',
    description: 'Adicionada opção para alternar entre tema claro, escuro ou seguir as configurações do sistema.',
  },
  {
    version: '1.1.3',
    date: '01/02/2026',
    type: 'improvement',
    title: 'Cenários Aleatórios',
    description: 'Possibilidade de treinar com cenário, posição e stack aleatórios para maior diversidade.',
  },
  {
    version: '1.1.2',
    date: '31/01/2026',
    type: 'improvement',
    title: 'Visualizador de Range Completo',
    description: 'Após cada mão, agora você pode ver a matriz 13x13 completa do range GTO.',
  },
  {
    version: '1.1.1',
    date: '30/01/2026',
    type: 'fix',
    title: 'Proteção contra Farm de Pontos',
    description: 'Mãos já jogadas na sessão não podem mais ser rejogadas para ganhar pontos.',
  },
  {
    version: '1.1.0',
    date: '29/01/2026',
    type: 'feature',
    title: 'Sistema de Feedback Aprimorado',
    description: 'Novo sistema de feedback com categorias: Best, Correct, Inaccuracy, Mistake e Blunder.',
  },
  {
    version: '1.0.0',
    date: '28/01/2026',
    type: 'feature',
    title: 'Lançamento do GTORei',
    description: 'Versão inicial com treino de decisões pré-flop baseado em GTO para múltiplos cenários.',
  },
];

const typeConfig = {
  feature: { label: 'Nova Funcionalidade', icon: Sparkles, color: 'bg-primary/20 text-primary' },
  improvement: { label: 'Melhoria', icon: Wrench, color: 'bg-secondary/20 text-secondary' },
  fix: { label: 'Correção', icon: Bug, color: 'bg-muted text-muted-foreground' },
};

export default function UpdatesPage() {
  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            Atualizações
          </h1>
          <p className="text-muted-foreground mt-1">
            Novidades e melhorias do GTORei
          </p>
        </div>

        {/* Updates list */}
        <div className="space-y-4">
          {UPDATES.map((update, index) => {
            const config = typeConfig[update.type];
            const Icon = config.icon;

            return (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{update.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            v{update.version}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {update.date}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge className={config.color}>
                      {config.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {update.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
