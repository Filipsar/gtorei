import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { MaintenanceBanner } from './MaintenanceBanner';
import { UpdatesPopup } from '@/components/ui/UpdatesPopup';
import { Menu } from 'lucide-react';
import { AppShell } from '@/components/app/AppShell';
import { usarLayoutDoApp } from '@/lib/nativo/plataforma';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  // No app, abas embaixo no lugar da barra lateral (src/components/app/AppShell.tsx)
  if (usarLayoutDoApp()) return <AppShell>{children}</AppShell>;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        {/* Primeiro item do Tab: pula o menu lateral inteiro */}
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Pular para o conteúdo
        </a>
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          {/* Maintenance banner */}
          <MaintenanceBanner />
          
          {/* Mobile header */}
          <header className="lg:hidden flex items-center gap-3 p-4 border-b border-border">
            <SidebarTrigger className="p-2 hover:bg-accent rounded-lg">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <span className="text-lg font-bold">
              <span className="text-primary">GTO</span>
              <span className="text-foreground">Rei</span>
            </span>
          </header>

          {/* Page content */}
          <div id="conteudo" tabIndex={-1} className="flex-1 overflow-auto focus:outline-none">
            {children}
          </div>
          <UpdatesPopup />
        </main>
      </div>
    </SidebarProvider>
  );
}
