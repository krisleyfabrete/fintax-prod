import { ReactNode, useState } from 'react';
import { NewAdminSidebar } from './NewAdminSidebar';
import { AdminBottomDock } from './AdminBottomDock';
import { cn } from '@/lib/utils';
import fintaxLogo from '@/assets/fintax-logo-principal.png';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header — padrão centralizado igual tela de IA */}
      <header className="lg:hidden flex items-center justify-between border-b border-white/10 bg-background/95 backdrop-blur px-4 py-[max(2.7rem,env(safe-area-inset-top))]">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-white/85"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <img
          src={fintaxLogo}
          alt="Fintax Finanças"
          className="h-10 w-auto object-contain"
        />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {}}
          aria-label="Mais"
          className="text-white/85"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <NewAdminSidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      </div>

      {/* Main Content */}
      <main
        className={cn(
          'transition-all duration-300 min-h-screen admin-main pt-2 lg:pt-0',
          'lg:px-6',
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'
        )}
      >
        <div className={cn(
          'p-4 lg:p-6',
          'flex flex-col items-center lg:items-stretch'
        )}>
          {children}
        </div>
      </main>

      {/* Mobile Bottom Dock — só visível em mobile */}
      <div className="lg:hidden">
        <AdminBottomDock />
      </div>
    </div>
  );
}
