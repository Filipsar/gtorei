import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Zap, TableProperties, BarChart3, Menu, Settings, Bell, MessageSquare, Lock, Trophy, LogOut, Heart, GraduationCap, HandHeart, Award, User, Search, Users, BookOpen, ShieldCheck, ExternalLink, Brain, ChevronDown } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar } from
'@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { SettingsModal } from './SettingsModal';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import gtoreiLogo from '@/assets/gtorei-logo.png';

const ADMIN_EMAIL = 'farubini2@gmail.com';

const CHAVE_SECOES = 'gtorei_sidebar_secoes_fechadas';

interface ItemNav {
  title: string;
  url: string;
  icon: LucideIcon;
  locked?: boolean;
  external?: boolean;
}

interface SecaoNav {
  id: string;
  label: string;
  itens: ItemNav[];
}

/* Trocar de página remonta o layout inteiro, então o que estiver só no estado
   do componente volta ao padrão a cada clique no menu. Daí guardar as seções
   fechadas no navegador. */
function lerSecoesFechadas(): string[] {
  try {
    const guardado = JSON.parse(localStorage.getItem(CHAVE_SECOES) ?? '[]');
    return Array.isArray(guardado) ? guardado.filter((id) => typeof id === 'string') : [];
  } catch {
    // Armazenamento bloqueado ou conteúdo inválido: abre tudo
    return [];
  }
}

function guardarSecoesFechadas(ids: string[]) {
  try {
    localStorage.setItem(CHAVE_SECOES, JSON.stringify(ids));
  } catch {
    // Sem persistir, as seções voltam abertas na próxima visita
  }
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fechadas, setFechadas] = useState<string[]>(lerSecoesFechadas);
  const [secaoAtivaFechadaNaMao, setSecaoAtivaFechadaNaMao] = useState(false);
  const { t } = useLanguage();

  const secoes: SecaoNav[] = [
    {
      id: 'treino',
      label: t.sidebar.sectionTraining,
      itens: [
        { title: t.sidebar.train, url: '/treinar', icon: Zap },
        { title: t.sidebar.tables, url: '/tabelas', icon: TableProperties },
        { title: t.sidebar.beginner, url: '/iniciante', icon: BookOpen },
        { title: t.sidebar.classes, url: '#aulas', icon: GraduationCap, locked: true },
      ],
    },
    {
      id: 'analise',
      label: t.sidebar.sectionAnalysis,
      itens: [
        { title: t.sidebar.analysis, url: '/analise', icon: BarChart3 },
        { title: t.sidebar.aiAnalysis, url: '/analise-ia', icon: Brain },
        { title: t.sidebar.favorites, url: '/favoritos', icon: Heart },
      ],
    },
    {
      id: 'comunidade',
      label: t.sidebar.sectionCommunity,
      itens: [
        { title: t.sidebar.ranking, url: '/ranking', icon: Trophy },
        { title: t.sidebar.achievements, url: '/conquistas', icon: Award },
        { title: t.sidebar.community, url: '/comunidade', icon: Users },
        { title: t.sidebar.search, url: '/buscar', icon: Search },
        { title: t.sidebar.profile, url: '/perfil', icon: User },
      ],
    },
    {
      id: 'mais',
      label: t.sidebar.sectionMore,
      itens: [
        { title: t.sidebar.updates, url: '/atualizacoes', icon: Bell },
        { title: t.sidebar.support, url: '/apoiar', icon: HandHeart },
        {
          title: t.sidebar.ggpoker,
          url: 'https://signup.ggpass.com?qtag1=RFBR3103784&lang=pt-br&brand-id=GGPCOM',
          icon: ExternalLink,
          external: true,
        },
        {
          title: t.sidebar.feedback,
          url: 'https://forms.gle/JJeiS3UvBint5jG16',
          icon: MessageSquare,
          external: true,
        },
        ...(user?.email === ADMIN_EMAIL
          ? [{ title: 'Admin', url: '/admin', icon: ShieldCheck }]
          : []),
      ],
    },
  ];

  const rotaAtiva = (url: string) =>
    location.pathname === url || (url === '/treinar' && location.pathname === '/');

  const secaoAtiva = secoes.find((s) => s.itens.some((item) => rotaAtiva(item.url)))?.id ?? null;

  const persistir = (proximas: string[]) => {
    setFechadas(proximas);
    guardarSecoesFechadas(proximas);
  };

  // A seção da página atual chega aberta, mesmo que esteja fechada na
  // preferência: a página em que você está nunca fica escondida. Isso vale até
  // você fechar essa seção na mão — senão o clique no cabeçalho não faria nada
  // visível e ainda assim mexeria no que está guardado.
  const estaAberta = (secao: SecaoNav) =>
    !fechadas.includes(secao.id) || (secao.id === secaoAtiva && !secaoAtivaFechadaNaMao);

  const alternarSecao = (id: string) => {
    if (id === secaoAtiva && !secaoAtivaFechadaNaMao) {
      setSecaoAtivaFechadaNaMao(true);
      if (!fechadas.includes(id)) persistir([...fechadas, id]);
      return;
    }
    if (id === secaoAtiva) setSecaoAtivaFechadaNaMao(false);
    persistir(fechadas.includes(id) ? fechadas.filter((s) => s !== id) : [...fechadas, id]);
  };

  const renderItem = (item: ItemNav) => {
    const ativo = rotaAtiva(item.url) && !item.locked && !item.external;

    return (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild isActive={ativo} tooltip={collapsed ? item.title : undefined}>
          {item.external ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-sidebar-accent"
            >
              <item.icon className="h-5 w-5 shrink-0 text-sidebar-foreground" />
              {!collapsed && <span className="text-sm">{item.title}</span>}
            </a>
          ) : (
            <NavLink
              to={item.locked ? '#' : item.url}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-sidebar-accent',
                ativo && 'bg-sidebar-accent text-primary',
                item.locked && 'cursor-not-allowed opacity-50'
              )}
              activeClassName={item.locked ? '' : 'bg-sidebar-accent text-primary font-medium'}
              onClick={(e) => item.locked && e.preventDefault()}
            >
              <div className="relative">
                <item.icon
                  className={cn('h-5 w-5 shrink-0', ativo ? 'text-primary' : 'text-sidebar-foreground')}
                />
                {item.locked && (
                  <Lock className="absolute -right-1 -top-1 h-3 w-3 text-muted-foreground" />
                )}
              </div>
              {!collapsed && <span className="text-sm">{item.title}</span>}
            </NavLink>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <>
      <Sidebar className="border-r border-sidebar-border transition-all duration-300" collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border p-4">
          <div className="flex items-center justify-between w-full">
            {!collapsed &&
            <div className="flex items-center gap-3">
                <img alt="GTORei" className="h-8 w-8 object-contain" src="/lovable-uploads/9c0d8326-a96e-47a8-9e95-40f28d54d109.png" />
                <span className="text-heading-sm">
                  <span className="text-primary">GTO</span>
                  <span className="text-sidebar-foreground">Rei</span>
                </span>
              </div>
            }
            {collapsed &&
            <div className="w-full flex justify-center px-1">
                <img src={gtoreiLogo} alt="GTORei" className="h-7 w-7 object-contain" />
              </div>
            }
          </div>

          {!collapsed && user &&
          <div className="mt-4 p-3 rounded-lg bg-sidebar-accent">
              <div className="flex items-center gap-3">
                {profile?.avatar_url ?
              profile.avatar_url.length <= 4 ?
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">
                      {profile.avatar_url}
                    </div> :
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-10 h-10 rounded-full object-cover" /> :
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {(profile?.username || user.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
              }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {profile?.username || user.email?.split('@')[0] || t.sidebar.player}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
          }
        </SidebarHeader>

        <SidebarContent className="p-2">
          {/* Recolhida, a barra vira uma régua de ícones: cabeçalho de seção não
              caberia, e uma seção fechada esconderia itens sem deixar pista de
              como reabrir. Então lá tudo vira uma lista única. */}
          {collapsed ? (
            <SidebarGroup className="p-0">
              <SidebarGroupContent>
                <SidebarMenu>{secoes.flatMap((secao) => secao.itens).map(renderItem)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : (
            secoes.map((secao) => {
              const aberta = estaAberta(secao);
              return (
                <Collapsible key={secao.id} open={aberta} onOpenChange={() => alternarSecao(secao.id)}>
                  <SidebarGroup className="p-0">
                    <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
                      {secao.label}
                      <ChevronDown
                        aria-hidden="true"
                        className={cn('h-4 w-4 transition-transform duration-200', !aberta && '-rotate-90')}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                      <SidebarGroupContent>
                        <SidebarMenu>{secao.itens.map(renderItem)}</SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>
              );
            })
          )}
        </SidebarContent>

        {/* Fora das seções: com tudo fechado, ainda dá para sair e abrir os ajustes */}
        <div className="mt-auto border-t border-sidebar-border p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={collapsed ? t.sidebar.settings : undefined}
                onClick={() => setSettingsOpen(true)}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-sidebar-accent">
                <Settings className="h-5 w-5 shrink-0 text-sidebar-foreground" />
                {!collapsed && <span className="text-sm">{t.sidebar.settings}</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>

            {user &&
            <SidebarMenuItem>
                <SidebarMenuButton
                tooltip={collapsed ? t.sidebar.logout : undefined}
                onClick={signOut}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-destructive transition-colors hover:bg-destructive/10">
                  <LogOut className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="text-sm">{t.sidebar.logout}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            }
          </SidebarMenu>

          <SidebarTrigger className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-sidebar-accent">
            <Menu className="h-5 w-5" />
            {!collapsed && <span className="text-sm">{t.sidebar.collapse}</span>}
          </SidebarTrigger>
        </div>
      </Sidebar>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>);
}
