import { useState } from 'react';
import { Zap, TableProperties, BarChart3, Menu, Settings, Bell, MessageSquare, Lock, Trophy, LogOut, Heart, GraduationCap, HandHeart, Award, User, Search, Users, BookOpen, ShieldCheck, ExternalLink } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { SettingsModal } from './SettingsModal';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import gtoreiLogo from '@/assets/gtorei-logo.png';

const ADMIN_EMAIL = 'farubini2@gmail.com';

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { t } = useLanguage();

  const navItems = [
    { title: t.sidebar.train, url: '/treinar', icon: Zap, locked: false },
    { title: t.sidebar.tables, url: '/tabelas', icon: TableProperties, locked: false },
    { title: t.sidebar.analysis, url: '/analise', icon: BarChart3, locked: false },
    { title: t.sidebar.ranking, url: '/ranking', icon: Trophy, locked: false },
    { title: t.sidebar.achievements, url: '/conquistas', icon: Award, locked: false },
    { title: t.sidebar.community, url: '/comunidade', icon: Users, locked: false },
    { title: t.sidebar.favorites, url: '/favoritos', icon: Heart, locked: false },
    { title: t.sidebar.profile, url: '/perfil', icon: User, locked: false },
    { title: t.sidebar.search, url: '/buscar', icon: Search, locked: false },
    { title: t.sidebar.beginner, url: '/iniciante', icon: BookOpen, locked: false },
    { title: t.sidebar.classes, url: '#', icon: GraduationCap, locked: true },
    { title: t.sidebar.updates, url: '/atualizacoes', icon: Bell, locked: false },
    { title: t.sidebar.support, url: '/apoiar', icon: HandHeart, locked: false },
  ];

  return (
    <>
      <Sidebar
        className={cn(
          'border-r border-sidebar-border transition-all duration-300'
        )}
        collapsible="icon">

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
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const isActive = location.pathname === item.url ||
                  item.url === '/treinar' && location.pathname === '/';

                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive && !item.locked}
                        tooltip={collapsed ? item.title : undefined}>
                        <NavLink
                          to={item.locked ? '#' : item.url}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                            'hover:bg-sidebar-accent',
                            isActive && !item.locked && 'bg-sidebar-accent text-primary',
                            item.locked && 'opacity-50 cursor-not-allowed'
                          )}
                          activeClassName={item.locked ? '' : 'bg-sidebar-accent text-primary font-medium'}
                          onClick={(e) => item.locked && e.preventDefault()}>
                          <div className="relative">
                            <item.icon className={cn(
                              'h-5 w-5 shrink-0',
                              isActive && !item.locked ? 'text-primary' : 'text-sidebar-foreground'
                            )} />
                            {item.locked &&
                            <Lock className="h-3 w-3 absolute -top-1 -right-1 text-muted-foreground" />
                            }
                          </div>
                          {!collapsed && <span className="text-sm">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>);
                })}

                {user?.email === ADMIN_EMAIL && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/admin'}
                      tooltip={collapsed ? 'Admin' : undefined}>
                      <NavLink
                        to="/admin"
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                          'hover:bg-sidebar-accent',
                          location.pathname === '/admin' && 'bg-sidebar-accent text-primary'
                        )}
                        activeClassName="bg-sidebar-accent text-primary font-medium">
                        <ShieldCheck className={cn(
                          'h-5 w-5 shrink-0',
                          location.pathname === '/admin' ? 'text-primary' : 'text-sidebar-foreground'
                        )} />
                        {!collapsed && <span className="text-sm">Admin</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={collapsed ? t.sidebar.giveOpinion : undefined}>
                    <a
                      href="https://forms.gle/JJeiS3UvBint5jG16"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-sidebar-accent">
                      <MessageSquare className="h-5 w-5 shrink-0 text-sidebar-foreground" />
                      {!collapsed && <span className="text-sm">{t.sidebar.feedback}</span>}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={collapsed ? t.sidebar.settings : undefined}
                    onClick={() => setSettingsOpen(true)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-sidebar-accent cursor-pointer">
                    <Settings className="h-5 w-5 shrink-0 text-sidebar-foreground" />
                    {!collapsed && <span className="text-sm">{t.sidebar.settings}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {user &&
                <SidebarMenuItem>
                    <SidebarMenuButton
                    tooltip={collapsed ? t.sidebar.logout : undefined}
                    onClick={signOut}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-destructive/10 cursor-pointer text-destructive">
                      <LogOut className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="text-sm">{t.sidebar.logout}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                }
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <div className="mt-auto p-3 border-t border-sidebar-border">
          <SidebarTrigger className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors">
            <Menu className="h-5 w-5" />
            {!collapsed && <span className="text-sm">{t.sidebar.collapse}</span>}
          </SidebarTrigger>
        </div>
      </Sidebar>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>);
}
