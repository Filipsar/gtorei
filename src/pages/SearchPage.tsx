import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { getLevelName } from '@/data/localStorage';
import { Search, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import levelIniciante from '@/assets/levels/Iniciante.png';
import levelAmador from '@/assets/levels/Amador.png';
import levelIntermediario from '@/assets/levels/Intermediario.png';
import levelAvancado from '@/assets/levels/Avancado.png';
import levelExpert from '@/assets/levels/Expert.png';
import levelMestre from '@/assets/levels/Mestre.png';
import levelLenda from '@/assets/levels/Lenda.png';

const LEVEL_IMAGES: Record<number, string> = {
  1: levelIniciante, 2: levelAmador, 3: levelIntermediario,
  4: levelAvancado, 5: levelExpert, 6: levelMestre, 7: levelLenda,
};

interface PlayerResult {
  user_id: string;
  username: string;
  avatar_url: string | null;
  level: number;
  total_xp: number;
}

// Simple fuzzy match: Levenshtein distance
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return dp[m][n];
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [suggestions, setSuggestions] = useState<PlayerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [allPlayers, setAllPlayers] = useState<PlayerResult[]>([]);
  const navigate = useNavigate();

  // Load all players once for fuzzy matching
  useEffect(() => {
    supabase
      .from('profiles')
      .select('user_id, username, avatar_url, level, total_xp')
      .order('total_xp', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (data) setAllPlayers(data);
      });
  }, []);

  const searchPlayers = useCallback((q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSuggestions([]);
      return;
    }

    const lower = q.toLowerCase().trim();

    // Exact/partial matches
    const exact = allPlayers.filter(p =>
      p.username.toLowerCase().includes(lower)
    );

    // Fuzzy suggestions (Levenshtein distance <= 3, not already in exact)
    const exactIds = new Set(exact.map(p => p.user_id));
    const fuzzy = allPlayers
      .filter(p => !exactIds.has(p.user_id))
      .map(p => ({ ...p, dist: levenshtein(p.username.toLowerCase(), lower) }))
      .filter(p => p.dist <= 3)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 5);

    setResults(exact.slice(0, 20));
    setSuggestions(fuzzy);
  }, [allPlayers]);

  useEffect(() => {
    const timer = setTimeout(() => searchPlayers(query), 300);
    return () => clearTimeout(timer);
  }, [query, searchPlayers]);

  const PlayerCard = ({ player }: { player: PlayerResult }) => (
    <div
      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
      onClick={() => navigate(`/perfil/${player.user_id}`)}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={player.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/20 text-primary">
          {player.username.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <img src={LEVEL_IMAGES[player.level] || levelIniciante} alt="" className="w-5 h-5 object-contain" />
          <p className="font-medium truncate">{player.username}</p>
        </div>
        <p className="text-body-xs text-muted-foreground">
          {getLevelName(player.level)} • {player.total_xp} XP
        </p>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-heading-md sm:text-heading-lg text-foreground flex items-center gap-3">
            <Search className="h-8 w-8 text-primary" />
            Buscar Jogadores
          </h1>
          <p className="text-body-sm text-muted-foreground mt-1">
            Encontre jogadores pelo nome de usuário
          </p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Digite o nome do jogador..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {results.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-heading-xs">Resultados ({results.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {results.map(p => <PlayerCard key={p.user_id} player={p} />)}
            </CardContent>
          </Card>
        )}

        {suggestions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-heading-xs text-muted-foreground">
                Você quis dizer?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestions.map(p => <PlayerCard key={p.user_id} player={p} />)}
            </CardContent>
          </Card>
        )}

        {query.trim() && results.length === 0 && suggestions.length === 0 && (
          <div className="py-12 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Nenhum jogador encontrado</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
