import { useState } from 'react';
import { Zap, TableProperties, BarChart3, Bot, Star, Menu, Settings, Bell, MessageSquare, Lock } from 'lucide-react';
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
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { getUserProfile, getLevelName } from '@/data/localStorage';
import { SettingsModal } from './SettingsModal';
import gtoreiLogo from '@/assets/gtorei-logo.png';

const navItems = [
  { title: 'Treinar', url: '/treinar', icon: Zap, description: 'Treino rápido', locked: false },
  { title: 'Tabelas', url: '/tabelas', icon: TableProperties, description: 'Ranges GTO', locked: false },
  { title: 'Análise', url: '/analise', icon: BarChart3, description: 'Estatísticas', locked: false },
  { title: 'Autoanálise', url: '/autoanalise', icon: Bot, description: 'Em manutenção', locked: true },
  { title: 'Favoritos', url: '/favoritos', icon: Star, description: 'Salvos', locked: false },
  { title: 'Atualizações', url: '/atualizacoes', icon: Bell, description: 'Novidades', locked: false },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const profile = getUserProfile();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <Sidebar
        className={cn(
          'border-r border-sidebar-border transition-all duration-300'
        )}
        collapsible="icon"
      >
        <SidebarHeader className="border-b border-sidebar-border p-4">
          <div className="flex items-center justify-between w-full">
            {!collapsed && (
              <div className="flex items-center gap-2">
                <img src={gtoreiLogo} alt="GTORei" className="h-8 w-8 object-contain" />
                <span className="text-xl font-bold text-primary">GTORei</span>
              </div>
            )}
            {collapsed && (
              <img src={gtoreiLogo} alt="GTORei" className="h-8 w-8 object-contain mx-auto" />
            )}
          </div>

          {/* User info */}
          {!collapsed && profile && (
            <div className="mt-4 p-3 rounded-lg bg-sidebar-accent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-semibold">
                    {profile.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {getLevelName(profile.level)} • {profile.totalScore} pts
                  </p>
                </div>
              </div>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent className="p-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const isActive = location.pathname === item.url || 
                    (item.url === '/treinar' && location.pathname === '/');

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive && !item.locked}
                        tooltip={collapsed ? item.title : undefined}
                      >
                        <NavLink
                          to={item.locked ? '#' : item.url}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                            'hover:bg-sidebar-accent',
                            isActive && !item.locked && 'bg-sidebar-accent text-primary',
                            item.locked && 'opacity-50 cursor-not-allowed'
                          )}
                          activeClassName={item.locked ? '' : 'bg-sidebar-accent text-primary font-medium'}
                          onClick={(e) => item.locked && e.preventDefault()}
                        >
                          <div className="relative">
                            <item.icon className={cn(
                              'h-5 w-5 shrink-0',
                              isActive && !item.locked ? 'text-primary' : 'text-sidebar-foreground'
                            )} />
                            {item.locked && (
                              <Lock className="h-3 w-3 absolute -top-1 -right-1 text-muted-foreground" />
                            )}
                          </div>
                          {!collapsed && (
                            <div className="flex flex-col">
                              <span className="text-sm">{item.title}</span>
                              <span className="text-xs text-muted-foreground">
                                {item.description}
                              </span>
                            </div>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}

                {/* Give Feedback link */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={collapsed ? 'Dê sua opinião' : undefined}
                  >
                    <a
                      href="https://forms.gle/JJeiS3UvBint5jG16"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-sidebar-accent"
                    >
                      <MessageSquare className="h-5 w-5 shrink-0 text-sidebar-foreground" />
                      {!collapsed && (
                        <div className="flex flex-col">
                          <span className="text-sm">Dê sua opinião</span>
                          <span className="text-xs text-muted-foreground">
                            Feedback
                          </span>
                        </div>
                      )}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Settings button */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={collapsed ? 'Configurações' : undefined}
                    onClick={() => setSettingsOpen(true)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-sidebar-accent cursor-pointer"
                  >
                    <Settings className="h-5 w-5 shrink-0 text-sidebar-foreground" />
                    {!collapsed && (
                      <div className="flex flex-col">
                        <span className="text-sm">Configurações</span>
                        <span className="text-xs text-muted-foreground">
                          Tema e perfil
                        </span>
                      </div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Collapse trigger at bottom */}
        <div className="mt-auto p-3 border-t border-sidebar-border">
          <SidebarTrigger className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors">
            <Menu className="h-5 w-5" />
            {!collapsed && <span className="text-sm">Recolher</span>}
          </SidebarTrigger>
        </div>
      </Sidebar>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
