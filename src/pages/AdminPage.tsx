import { useEffect, useMemo, useState } from 'react';
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
import { Loader2, Search, Download, Users, Clock, Zap, Target, Mail, Copy, ChevronDown, FileText, TrendingUp, UserPlus, Trophy, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ADMIN_EMAIL = 'farubini2@gmail.com';

const levelNames = ['Iniciante', 'Amador', 'Intermediário', 'Avançado', 'Expert', 'Mestre', 'Lenda', 'GTO Rei'];

// Início de célula que o Excel e o Sheets tratam como fórmula. O username é escolhido
// pelo usuário: sem escapar, um nome como "=1+1" ou "@SUM(...)" executa na máquina de
// quem abre o CSV exportado.
const INICIO_DE_FORMULA = ['=', '+', '-', '@', String.fromCharCode(9), String.fromCharCode(13)];

const csvCell = (valor: unknown): string => {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  const ehNumero = texto !== '' && !Number.isNaN(Number(texto));
  const perigoso = INICIO_DE_FORMULA.includes(texto.charAt(0)) && !ehNumero;
  return '"' + (perigoso ? "'" : '') + texto.replace(/"/g, '""') + '"';
};

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

type ColumnKey = 'username' | 'email' | 'level' | 'total_xp' | 'total_hands' | 'total_sessions' | 'avg_accuracy' | 'total_time_minutes' | 'last_active' | 'created_at';

const columnLabels: Record<ColumnKey, string> = {
  username: 'Usuário (Username)',
  email: 'E-mail',
  level: 'Nível',
  total_xp: 'XP',
  total_hands: 'Mãos Jogadas',
  total_sessions: 'Sessões',
  avg_accuracy: 'Precisão Média',
  total_time_minutes: 'Tempo Total',
  last_active: 'Último Acesso',
  created_at: 'Cadastro',
};

type TabKey = 'jogadores' | 'dashboard';

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [apoiadores, setApoiadores] = useState<Set<string>>(new Set());
  const [apoiadoresDisponivel, setApoiadoresDisponivel] = useState(true);
  const [salvandoApoiador, setSalvandoApoiador] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedColumn, setSelectedColumn] = useState<ColumnKey>('email');
  const [activeTab, setActiveTab] = useState<TabKey>('jogadores');

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) {
      fetchUsers();
      fetchApoiadores();
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

  // Quem tem acesso de apoiador. O RLS já deixa o admin ler a lista inteira.
  const fetchApoiadores = async () => {
    const { data, error } = await supabase.from('supporters').select('user_id');
    if (error) {
      // Antes da migration 20260923120000 a tabela não existe: a coluna some
      // da tela em vez de estourar a página.
      setApoiadoresDisponivel(false);
      return;
    }
    setApoiadoresDisponivel(true);
    setApoiadores(new Set((data || []).map((linha) => linha.user_id)));
  };

  const alternarApoiador = async (userId: string, ativo: boolean) => {
    setSalvandoApoiador(userId);
    const { error } = await supabase.rpc('set_supporter', { _user_id: userId, _ativo: ativo });
    setSalvandoApoiador(null);

    if (error) {
      toast({
        title: 'Não deu para mudar o acesso',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setApoiadores((antes) => {
      const depois = new Set(antes);
      if (ativo) depois.add(userId);
      else depois.delete(userId);
      return depois;
    });
    toast({ title: ativo ? 'Acesso de apoiador liberado' : 'Acesso de apoiador removido' });
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
    const csv = [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
    // BOM para o Excel em pt-BR abrir "Mãos" e "Nível" sem quebrar os acentos
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gtorei-users.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const openGmailToAllUsers = () => {
    const emails = users.map((u) => u.email).filter((e) => !!e);
    if (emails.length === 0) return;
    const bcc = encodeURIComponent(emails.join(','));
    const url = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&bcc=${bcc}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyColumnData = async () => {
    if (filtered.length === 0) return;
    const values = filtered.map((u) => {
      switch (selectedColumn) {
        case 'username': return u.username;
        case 'email': return u.email;
        case 'level': return levelNames[u.level - 1] || 'Amador';
        case 'total_xp': return u.total_xp.toLocaleString('pt-BR');
        case 'total_hands': return u.total_hands.toLocaleString('pt-BR');
        case 'total_sessions': return String(u.total_sessions);
        case 'avg_accuracy': return `${u.avg_accuracy}%`;
        case 'total_time_minutes': return formatTime(u.total_time_minutes);
        case 'last_active': return u.last_active ? new Date(u.last_active).toLocaleDateString('pt-BR') : '-';
        case 'created_at': return new Date(u.created_at).toLocaleDateString('pt-BR');
        default: return '';
      }
    });
    const text = values.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copiado!',
        description: `${values.length} ${columnLabels[selectedColumn]} copiados para a área de transferência.`,
      });
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível acessar a área de transferência.',
        variant: 'destructive',
      });
    }
  };

  // ============ Dashboard metrics ============
  const dashboard = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const newThisMonth = users.filter((u) => new Date(u.created_at) >= monthStart).length;
    const newPrevMonth = users.filter((u) => {
      const d = new Date(u.created_at);
      return d >= prevMonthStart && d <= prevMonthEnd;
    }).length;
    const activeWeek = users.filter((u) => u.last_active && new Date(u.last_active) >= weekAgo).length;
    const engagementRate = totalUsers ? Math.round((activeWeek / totalUsers) * 100) : 0;

    const withHands = users.filter((u) => u.total_hands > 0);
    const avgAccuracy = withHands.length
      ? Math.round(withHands.reduce((s, u) => s + u.avg_accuracy, 0) / withHands.length)
      : 0;
    const avgHandsPerUser = totalUsers ? Math.round(totalHandsPlayed / totalUsers) : 0;
    const avgTimePerUser = totalUsers ? Math.round(totalTimePlayed / totalUsers) : 0;

    const topXP = [...users].sort((a, b) => b.total_xp - a.total_xp).slice(0, 5);
    const topHands = [...users].sort((a, b) => b.total_hands - a.total_hands).slice(0, 5);

    const levelDistribution = levelNames.map((name, i) => ({
      name,
      count: users.filter((u) => u.level === i + 1).length,
    }));

    const growthPct = newPrevMonth ? Math.round(((newThisMonth - newPrevMonth) / newPrevMonth) * 100) : 0;

    return {
      newThisMonth, newPrevMonth, activeWeek, engagementRate,
      avgAccuracy, avgHandsPerUser, avgTimePerUser,
      topXP, topHands, levelDistribution, growthPct,
    };
  }, [users, totalUsers, totalHandsPlayed, totalTimePlayed]);

  const today = new Date();
  const reportAvailable = today.getDate() >= 5;
  const monthLabel = today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const generateMonthlyPDF = () => {
    if (!reportAvailable) return;
    const doc = new jsPDF();
    const now = new Date();
    const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    doc.setFontSize(20);
    doc.setTextColor(255, 184, 0);
    doc.text('GTORei — Relatório Mensal', 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(80);
    doc.text(`Referência: ${monthName}`, 14, 28);
    doc.text(`Gerado em: ${now.toLocaleString('pt-BR')}`, 14, 34);

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Visão Geral', 14, 46);
    autoTable(doc, {
      startY: 50,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total de usuários', String(totalUsers)],
        ['Novos usuários no mês', `${dashboard.newThisMonth} (${dashboard.growthPct >= 0 ? '+' : ''}${dashboard.growthPct}% vs mês anterior)`],
        ['Ativos últimos 7 dias', `${dashboard.activeWeek} (${dashboard.engagementRate}% engajamento)`],
        ['Ativos hoje', String(activeToday)],
        ['Tempo total jogado', formatTime(totalTimePlayed)],
        ['Mãos totais jogadas', totalHandsPlayed.toLocaleString('pt-BR')],
        ['Precisão média (usuários ativos)', `${dashboard.avgAccuracy}%`],
        ['Média de mãos por usuário', String(dashboard.avgHandsPerUser)],
        ['Média de tempo por usuário', formatTime(dashboard.avgTimePerUser)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [255, 184, 0], textColor: 0 },
    });

    let y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text('Top 5 Jogadores por XP', 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [['#', 'Usuário', 'Nível', 'XP', 'Mãos']],
      body: dashboard.topXP.map((u, i) => [
        i + 1, u.username, levelNames[u.level - 1] || 'Amador',
        u.total_xp.toLocaleString('pt-BR'), u.total_hands.toLocaleString('pt-BR'),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [74, 144, 226], textColor: 255 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text('Distribuição por Nível', 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [['Nível', 'Jogadores']],
      body: dashboard.levelDistribution.map((l) => [l.name, String(l.count)]),
      theme: 'striped',
      headStyles: { fillColor: [74, 144, 226], textColor: 255 },
    });

    y = (doc as any).lastAutoTable.finalY + 12;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.text('Próximos Passos', 14, y);
    doc.setFontSize(10);
    doc.setTextColor(60);
    const steps = [
      `• Reativar ${totalUsers - dashboard.activeWeek} usuários inativos com campanha de e-mail.`,
      `• ${dashboard.newThisMonth < dashboard.newPrevMonth ? 'Investir em aquisição — queda em novos cadastros.' : 'Manter canais de aquisição — crescimento saudável.'}`,
      dashboard.avgAccuracy < 60
        ? '• Precisão média baixa: reforçar conteúdo educacional e tutoriais.'
        : '• Precisão média saudável: destacar rankings para engajar competitivos.',
      '• Publicar post mensal do Top 1 no Instagram (@gtorei).',
      '• Revisar feedbacks do formulário e priorizar melhorias.',
    ];
    steps.forEach((s, i) => doc.text(s, 14, y + 8 + i * 6));

    doc.save(`gtorei-relatorio-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`);
  };

  const tabLabel = activeTab === 'jogadores' ? 'Jogadores' : 'Dashboard';

  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-2xl font-bold text-foreground px-2 gap-2 hover:bg-muted">
                Admin <span className="text-muted-foreground text-base">/ {tabLabel}</span>
                <ChevronDown className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[180px]">
              <DropdownMenuItem onClick={() => setActiveTab('jogadores')}>
                <Users className="h-4 w-4 mr-2" /> Jogadores
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('dashboard')}>
                <Activity className="h-4 w-4 mr-2" /> Dashboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {activeTab === 'jogadores' && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="flex items-center gap-2">
                <Select value={selectedColumn} onValueChange={(v) => setSelectedColumn(v as ColumnKey)}>
                  <SelectTrigger className="w-[220px] h-9 text-sm">
                    <SelectValue placeholder="Selecionar coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(columnLabels) as ColumnKey[]).map((key) => (
                      <SelectItem key={key} value={key}>{columnLabels[key]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={copyColumnData} disabled={filtered.length === 0}>
                  <Copy className="h-4 w-4 mr-2" /> Copiar coluna ({filtered.length})
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={openGmailToAllUsers} disabled={users.length === 0}>
                <Mail className="h-4 w-4 mr-2" /> Enviar Gmail a todos ({users.length})
              </Button>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" /> Exportar CSV
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : activeTab === 'jogadores' ? (
          <>
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
                    {apoiadoresDisponivel && <TableHead className="text-center">Apoiador</TableHead>}
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
                      {apoiadoresDisponivel && (
                        <TableCell className="text-center">
                          <Switch
                            checked={apoiadores.has(u.user_id)}
                            disabled={salvandoApoiador === u.user_id}
                            onCheckedChange={(ativo) => alternarApoiador(u.user_id, ativo)}
                            aria-label={`Acesso de apoiador para ${u.username}`}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={apoiadoresDisponivel ? 11 : 10} className="text-center text-muted-foreground py-8">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          // ============= DASHBOARD =============
          <div className="space-y-6">
            {/* Report banner */}
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-8 w-8 text-primary shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-foreground capitalize">Relatório mensal — {monthLabel}</h3>
                    <p className="text-sm text-muted-foreground">
                      {reportAvailable
                        ? 'Relatório do mês pronto com métricas e próximos passos.'
                        : `Disponível todo dia 05. Faltam ${5 - today.getDate()} dia(s).`}
                    </p>
                  </div>
                </div>
                <Button onClick={generateMonthlyPDF} disabled={!reportAvailable}>
                  <Download className="h-4 w-4 mr-2" /> Baixar PDF
                </Button>
              </CardContent>
            </Card>

            {/* Metric cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <UserPlus className="h-4 w-4" /> Novos no mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">{dashboard.newThisMonth}</p>
                  <p className={`text-xs ${dashboard.growthPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {dashboard.growthPct >= 0 ? '+' : ''}{dashboard.growthPct}% vs mês anterior
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Ativos (7d)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">{dashboard.activeWeek}</p>
                  <p className="text-xs text-muted-foreground">{dashboard.engagementRate}% de engajamento</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Target className="h-4 w-4" /> Precisão média
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">{dashboard.avgAccuracy}%</p>
                  <p className="text-xs text-muted-foreground">jogadores ativos</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Média de mãos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">{dashboard.avgHandsPerUser}</p>
                  <p className="text-xs text-muted-foreground">por usuário</p>
                </CardContent>
              </Card>
            </div>

            {/* Top rankings + level distribution */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" /> Top 5 por XP
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dashboard.topXP.map((u, i) => (
                      <div key={u.user_id} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="text-muted-foreground w-4">{i + 1}.</span>
                          <span className="font-medium">{u.username}</span>
                          <Badge variant="secondary" className="text-xs">{levelNames[u.level - 1] || 'Amador'}</Badge>
                        </span>
                        <span className="font-mono">{u.total_xp.toLocaleString('pt-BR')} XP</span>
                      </div>
                    ))}
                    {dashboard.topXP.length === 0 && (
                      <p className="text-sm text-muted-foreground">Sem dados.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" /> Distribuição por Nível
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dashboard.levelDistribution.map((l) => {
                      const pct = totalUsers ? (l.count / totalUsers) * 100 : 0;
                      return (
                        <div key={l.name}>
                          <div className="flex justify-between text-xs mb-1">
                            <span>{l.name}</span>
                            <span className="text-muted-foreground">{l.count} ({Math.round(pct)}%)</span>
                          </div>
                          <div className="h-2 bg-muted rounded overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Volume */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Usuários</CardTitle>
                </CardHeader>
                <CardContent><p className="text-2xl font-bold">{totalUsers}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Mãos Totais</CardTitle>
                </CardHeader>
                <CardContent><p className="text-2xl font-bold">{totalHandsPlayed.toLocaleString('pt-BR')}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tempo Total</CardTitle>
                </CardHeader>
                <CardContent><p className="text-2xl font-bold">{formatTime(totalTimePlayed)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tempo médio/usuário</CardTitle>
                </CardHeader>
                <CardContent><p className="text-2xl font-bold">{formatTime(dashboard.avgTimePerUser)}</p></CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
