import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  CalendarCheck,
  ChevronRight,
  Crown,
  Gift,
  Heart,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  TableProperties,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SettingsModal } from '@/components/layout/SettingsModal';
import { SEO } from '@/components/seo/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { ADMIN_EMAIL } from '@/data/admin';
import { usarLayoutDoApp } from '@/lib/nativo/plataforma';

interface Item {
  titulo: string;
  url: string;
  icone: LucideIcon;
  externo?: boolean;
}

const GRUPOS: { titulo: string; itens: Item[] }[] = [
  {
    titulo: 'Jogar',
    itens: [{ titulo: 'Desafios do dia, da semana e do mês', url: '/desafios', icone: CalendarCheck }],
  },
  {
    titulo: 'Estudar',
    itens: [
      { titulo: 'Tabelas de range', url: '/tabelas', icone: TableProperties },
      { titulo: 'Guia do iniciante', url: '/iniciante', icone: BookOpen },
      { titulo: 'Favoritos', url: '/favoritos', icone: Heart },
    ],
  },
  {
    titulo: 'Seu jogo',
    itens: [
      { titulo: 'Análise', url: '/analise', icone: BarChart3 },
      { titulo: 'Analisar com IA', url: '/analise-ia', icone: Brain },
      { titulo: 'Conquistas', url: '/conquistas', icone: Award },
    ],
  },
  {
    titulo: 'Comunidade',
    itens: [
      { titulo: 'Indique e ganhe', url: '/indicar', icone: Gift },
      { titulo: 'Comunidade', url: '/comunidade', icone: Users },
      { titulo: 'Buscar jogador', url: '/buscar', icone: Search },
    ],
  },
  {
    titulo: 'GTORei',
    itens: [
      // No app o PRO é a compra do Google Play; não há Pix nem link de sala
      { titulo: 'Seja PRO', url: '/pro', icone: Crown },
      { titulo: 'Novidades', url: '/atualizacoes', icone: Bell },
      { titulo: 'Enviar sugestão', url: 'https://forms.gle/JJeiS3UvBint5jG16', icone: MessageSquare, externo: true },
    ],
  },
];

const classeDoItem =
  'flex min-h-[52px] items-center gap-3 px-4 text-[15px] transition-colors active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';

/** Tudo o que não cabe nas abas do app (/mais) */
export default function MaisPage() {
  const { user, profile, signOut } = useAuth();
  const [ajustes, setAjustes] = useState(false);

  if (!usarLayoutDoApp()) return <Navigate to="/treinar" replace />;

  const grupos = user?.email === ADMIN_EMAIL
    ? [...GRUPOS, { titulo: 'Admin', itens: [{ titulo: 'Painel admin', url: '/admin', icone: ShieldCheck }] }]
    : GRUPOS;

  return (
    <MainLayout>
      <SEO title="Mais — GTORei" description="Atalhos do app GTORei." path="/mais" noindex />
      <div className="mx-auto max-w-lg space-y-6 px-4 pb-10 pt-4">
        <Link
          to="/perfil"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors active:bg-muted"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/20 text-lg font-bold text-primary">
            {profile?.avatar_url && profile.avatar_url.length > 4 ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              profile?.avatar_url || (profile?.username || user?.email || 'J').charAt(0).toUpperCase()
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{profile?.username || 'Seu perfil'}</span>
            <span className="block text-sm text-muted-foreground">Ver perfil e estatísticas</span>
          </span>
          <User className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </Link>

        {grupos.map((g) => (
          <section key={g.titulo} aria-labelledby={`mais-${g.titulo}`}>
            <h2 id={`mais-${g.titulo}`} className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {g.titulo}
            </h2>
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {g.itens.map((item) => (
                <li key={item.url}>
                  {item.externo ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className={classeDoItem}>
                      <item.icone className="h-5 w-5 text-primary" aria-hidden="true" />
                      <span className="flex-1">{item.titulo}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </a>
                  ) : (
                    <Link to={item.url} className={classeDoItem}>
                      <item.icone className="h-5 w-5 text-primary" aria-hidden="true" />
                      <span className="flex-1">{item.titulo}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          <li>
            <button type="button" onClick={() => setAjustes(true)} className={`${classeDoItem} w-full text-left`}>
              <Settings className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <span className="flex-1">Configurações</span>
            </button>
          </li>
          {user && (
            <li>
              {/* O vermelho do tema (destructive) não passa de 4,5:1 sobre o cartão escuro */}
              <button type="button" onClick={signOut} className={`${classeDoItem} w-full text-left text-red-400 [.light_&]:text-red-700`}>
                <LogOut className="h-5 w-5" aria-hidden="true" />
                <span className="flex-1">Sair</span>
              </button>
            </li>
          )}
        </ul>
      </div>
      <SettingsModal open={ajustes} onOpenChange={setAjustes} />
    </MainLayout>
  );
}
