import { useState } from 'react';
import { Zap, TableProperties, BarChart3, Menu, Settings, Bell, MessageSquare, Lock, Trophy, LogOut, Heart } from 'lucide-react';
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
import { getLevelName } from '@/data/localStorage';
import { SettingsModal } from './SettingsModal';
import { useAuth } from '@/contexts/AuthContext';
import gtoreiLogo from '@/assets/gtorei-logo.png';

const navItems = [
  { title: 'Treinar', url: '/treinar', icon: Zap, locked: false },
  { title: 'Tabelas', url: '/tabelas', icon: TableProperties, locked: false },
  { title: 'Análise', url: '/analise', icon: BarChart3, locked: false },
  { title: 'Ranking', url: '/ranking', icon: Trophy, locked: false },
  { title: 'Favoritos', url: '/favoritos', icon: Heart, locked: false },
  { title: 'Atualizações', url: '/atualizacoes', icon: Bell, locked: false },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
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
              <div className="flex items-center gap-3">
                <img src={gtoreiLogo} alt="GTORei" className="h-8 w-8 object-contain" />
                <span className="text-xl font-bold">
                  <span className="text-primary">GTO</span>
                  <span className="text-white">Rei</span>
                </span>
              </div>
            )}
            {collapsed && (
              <div className="w-full flex justify-center px-1">
                <img src={gtoreiLogo} alt="GTORei" className="h-7 w-7 object-contain" />
              </div>
            )}
          </div>

          {/* User info */}
          {!collapsed && user && (
            <div className="mt-4 p-3 rounded-lg bg-sidebar-accent">
              <div className="flex items-center gap-3">
                {profile?.avatar_url ? (
                  profile.avatar_url.length <= 4 ? (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">
                      {profile.avatar_url}
                    </div>
                  ) : (
                    <img 
                      src={profile.avatar_url} 
                      alt="Avatar" 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {(profile?.username || user.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {profile?.username || user.email?.split('@')[0] || 'Jogador'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.email}
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
                          {!collapsed && <span className="text-sm">{item.title}</span>}
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
                      {!collapsed && <span className="text-sm">Feedback</span>}
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
                    {!collapsed && <span className="text-sm">Configurações</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Logout button */}
                {user && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip={collapsed ? 'Sair' : undefined}
                      onClick={signOut}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-destructive/10 cursor-pointer text-destructive"
                    >
                      <LogOut className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="text-sm">Sair</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
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
