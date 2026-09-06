import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { getCurrentAal } from '@/lib/mfa';
import { Loader2, ShieldX } from 'lucide-react';

interface AdminProtectedRouteProps {
  children: ReactNode;
}

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const location = useLocation();
  const [mfaPending, setMfaPending] = useState(false);

  useEffect(() => {
    if (!user || !isAdmin || authLoading || adminLoading) return;
    let cancelled = false;
    getCurrentAal().then((aal) => {
      if (!cancelled && aal !== 'aal2') setMfaPending(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, authLoading, adminLoading]);

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          <p className="text-slate-400">Verificando permissões de administrador...</p>
        </div>
      </div>
    );
  }

  // Redirect to admin login if not authenticated
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // Require 2FA (aal2) for administrators
  if (isAdmin && mfaPending) {
    return <Navigate to="/admin/login?mfa=1" replace state={{ from: location }} />;
  }

  // Show access denied if authenticated but not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4 text-center p-8">
          <ShieldX className="h-16 w-16 text-red-500" />
          <h1 className="text-2xl font-bold text-white">Acesso Negado</h1>
          <p className="text-slate-400 max-w-md">
            Você não tem permissão para acessar o painel administrativo.
          </p>
          <a
            href="/admin/login"
            className="mt-4 text-red-400 hover:text-red-300 underline"
          >
            Fazer login como administrador
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}