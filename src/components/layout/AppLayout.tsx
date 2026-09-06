import { ReactNode, useState } from 'react';
import { NewAppSidebar } from './NewAppSidebar';
import { AppHeader } from './AppHeader';
import { BottomDock } from '@/components/BottomDock';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <NewAppSidebar
        className="hidden lg:block"
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <div
        className={cn(
          'flex flex-1 flex-col min-h-screen',
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72',
        )}
      >
        <AppHeader />
        <main className="app-main flex-1 overflow-y-auto p-4 md:p-6 animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Dock — fixa, fora do fluxo de scroll */}
      <div className="lg:hidden">
        <BottomDock />
      </div>
    </div>
  );
}