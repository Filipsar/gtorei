import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { MaintenanceBanner } from './MaintenanceBanner';
import { Menu } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          {/* Maintenance banner */}
          <MaintenanceBanner />
          
          {/* Mobile header */}
          <header className="lg:hidden flex items-center gap-3 p-4 border-b border-border">
            <SidebarTrigger className="p-2 hover:bg-accent rounded-lg">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <span className="text-lg font-bold text-primary">GTORei</span>
          </header>

          {/* Page content */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
