import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getFavorites, removeFavorite, FavoriteScenario, getFavoriteHands, removeFavoriteHand, FavoriteHand } from '@/data/localStorage';
import { SCENARIOS } from '@/data/gtoRanges';
import { Heart, Trash2, Play, Layers, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FavoriteHandReview } from '@/components/poker/FavoriteHandReview';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteScenario[]>(getFavorites());
  const [favoriteHands, setFavoriteHands] = useState<FavoriteHand[]>(getFavoriteHands());
  const [reviewHand, setReviewHand] = useState<FavoriteHand | null>(null);
  const navigate = useNavigate();

  const handleRemove = (id: string) => {
    removeFavorite(id);
    setFavorites(getFavorites());
  };

  const handleRemoveHand = (id: string) => {
    removeFavoriteHand(id);
    setFavoriteHands(getFavoriteHands());
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'fold': return 'bg-muted text-muted-foreground';
      case 'call': return 'bg-poker-call/20 text-poker-call';
      case 'raise': return 'bg-poker-raise/20 text-poker-raise';
      case 'allin': return 'bg-poker-allin/20 text-poker-allin';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'fold': return 'Fold';
      case 'call': return 'Call';
      case 'raise': return 'Raise';
      case 'allin': return 'All-in';
      default: return action;
    }
  };

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-heading-md sm:text-heading-lg text-foreground flex items-center gap-3">
            <Heart className="h-8 w-8 text-primary" />
            Favoritos
          </h1>
          <p className="text-body-sm text-muted-foreground mt-1">
            Suas mãos e cenários salvos
          </p>
        </div>

        <Tabs defaultValue="hands" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="hands" className="gap-2">
              <Heart className="h-4 w-4" />
              Mãos ({favoriteHands.length})
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="gap-2">
              <Layers className="h-4 w-4" />
              Cenários ({favorites.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hands">
            {favoriteHands.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {favoriteHands.map((fav) => (
                  <Card key={fav.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="text-poker-hand bg-primary/10 px-3 py-1 rounded">
                            {fav.hand}
                          </div>
                          <Badge className={getActionBadgeColor(fav.correctAction)}>
                            {getActionLabel(fav.correctAction)}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveHand(fav.id)}
                          className="text-muted-foreground hover:text-destructive h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-body-xs mb-3">
                        <span className="px-2 py-0.5 rounded bg-muted">{fav.position}</span>
                        <span className="px-2 py-0.5 rounded bg-muted">{fav.stack} BB</span>
                        <span className="px-2 py-0.5 rounded bg-muted">
                          {SCENARIOS.find(s => s.id === fav.scenario)?.label}
                        </span>
                        {fav.finalTable && (
                          <span className="px-2 py-0.5 rounded bg-primary/20 text-primary">FT</span>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => setReviewHand(fav)}
                      >
                        <Eye className="h-4 w-4" />
                        Revisar Mão
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Heart className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h2 className="text-heading-sm mb-2">Nenhuma mão favorita</h2>
                  <p className="text-body-sm text-muted-foreground max-w-md mx-auto mb-4">
                    Durante o treino, clique no ícone ❤️ para salvar mãos que você quer revisar depois.
                  </p>
                  <Button onClick={() => navigate('/treinar')}>
                    <Play className="h-4 w-4 mr-2" />
                    Ir para Treino
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="scenarios">
            {favorites.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {favorites.map((fav) => (
                  <Card key={fav.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-heading-xs">{fav.name}</h3>
                          <p className="text-body-sm text-muted-foreground">
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

                      <div className="flex flex-wrap gap-2 mb-4 text-body-xs">
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
                    <Layers className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h2 className="text-heading-sm mb-2">Nenhum cenário salvo</h2>
                  <p className="text-body-sm text-muted-foreground max-w-md mx-auto mb-4">
                    Você ainda não salvou nenhum cenário de treino favorito.
                  </p>
                  <Button onClick={() => navigate('/treinar')}>
                    <Play className="h-4 w-4 mr-2" />
                    Ir para Treino
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Review Modal */}
        <FavoriteHandReview
          open={reviewHand !== null}
          onClose={() => setReviewHand(null)}
          hand={reviewHand}
        />
      </div>
    </MainLayout>
  );
}
