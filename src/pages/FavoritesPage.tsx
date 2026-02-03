import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getFavorites, removeFavorite, FavoriteScenario } from '@/data/localStorage';
import { SCENARIOS } from '@/data/gtoRanges';
import { Star, Trash2, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteScenario[]>(getFavorites());
  const navigate = useNavigate();

  const handleRemove = (id: string) => {
    removeFavorite(id);
    setFavorites(getFavorites());
  };

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
            <Star className="h-8 w-8 text-primary" />
            Favoritos
          </h1>
          <p className="text-muted-foreground mt-1">
            Seus cenários de treino salvos
          </p>
        </div>

        {favorites.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {favorites.map((fav) => (
              <Card key={fav.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{fav.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {SCENARIOS.find(s => s.id === fav.scenario)?.label}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(fav.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4 text-xs">
                    <span className="px-2 py-1 rounded bg-muted">
                      {fav.position === 'random' ? 'Posição Aleatória' : fav.position}
                    </span>
                    <span className="px-2 py-1 rounded bg-muted">
                      {fav.stack === 'random' ? 'Stack Aleatório' : `${fav.stack} BB`}
                    </span>
                    {fav.finalTable && (
                      <span className="px-2 py-1 rounded bg-primary/20 text-primary">
                        Mesa Final
                      </span>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => navigate('/treinar')}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Treinar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Nenhum favorito</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-4">
                Você ainda não salvou nenhum cenário de treino favorito. 
                Vá para a página de treino e salve suas configurações preferidas!
              </p>
              <Button onClick={() => navigate('/treinar')}>
                <Play className="h-4 w-4 mr-2" />
                Ir para Treino
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
