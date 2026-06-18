import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Download, Users, Clock, Zap, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ADMIN_EMAIL = 'farubini2@gmail.com';

const levelNames = ['Iniciante', 'Amador', 'Intermediário', 'Avançado', 'Expert', 'Mestre', 'Lenda', 'GTO Rei'];

interface UserData {
  user_id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  level: number;
  total_xp: number;
  hands_played: number;
  created_at: string;
  total_sessions: number;
  total_hands: number;
  total_score: number;
  avg_accuracy: number;
  total_time_minutes: number;
  last_active: string | null;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) {
      fetchUsers();
    }
  }, [user?.email]);

  if (user?.email !== ADMIN_EMAIL) {
    return <Navigate to="/" replace />;
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-users');
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalUsers = users.length;
  const activeToday = users.filter((u) => {
    if (!u.last_active) return false;
    const today = new Date().toISOString().split('T')[0];
    return u.last_active.startsWith(today);
  }).length;
  const totalTimePlayed = users.reduce((sum, u) => sum + u.total_time_minutes, 0);
  const totalHandsPlayed = users.reduce((sum, u) => sum + u.total_hands, 0);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const exportCSV = () => {
    const headers = ['Username', 'E-mail', 'Nível', 'XP', 'Mãos Jogadas', 'Sessões', 'Precisão Média', 'Tempo Total (min)', 'Último Acesso', 'Cadastro'];
    const rows = filtered.map((u) => [
      u.username,
      u.email,
      levelNames[u.level - 1] || 'Amador',
      u.total_xp,
      u.total_hands,
      u.total_sessions,
      u.avg_accuracy + '%',
      u.total_time_minutes,
      u.last_active ? new Date(u.last_active).toLocaleDateString('pt-BR') : '-',
      new Date(u.created_at).toLocaleDateString('pt-BR'),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gtorei-users.csv';
    a.click();
  };

  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Painel Admin</h1>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" /> Total Usuários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" /> Ativos Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{activeToday}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" /> Tempo Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{formatTime(totalTimePlayed)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" /> Mãos Totais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{totalHandsPlayed.toLocaleString('pt-BR')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Usuário</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead className="text-right">XP</TableHead>
                  <TableHead className="text-right">Mãos</TableHead>
                  <TableHead className="text-right">Sessões</TableHead>
                  <TableHead className="text-right">Precisão</TableHead>
                  <TableHead className="text-right">Tempo</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead>Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.username}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {levelNames[u.level - 1] || 'Amador'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{u.total_xp.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right">{u.total_hands.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right">{u.total_sessions}</TableCell>
                    <TableCell className="text-right">{u.avg_accuracy}%</TableCell>
                    <TableCell className="text-right">{formatTime(u.total_time_minutes)}</TableCell>
                    <TableCell>
                      {u.last_active
                        ? new Date(u.last_active).toLocaleDateString('pt-BR')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
