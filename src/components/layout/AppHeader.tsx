import { Crown, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DevBadge } from './DevBadge';
import { useSubscription } from '@/hooks/useSubscription';
import fintaxLogo from '@/assets/fintax-logo-principal.png';

export function AppHeader() {
    const { isPro, isFamily } = useSubscription();

    return (
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-[max(2.7rem,env(safe-area-inset-top))]">
        {/* Left — reservado para botão de menu/voltar no futuro */}
        <div className="flex items-center" />

        {/* Center — Logo */}
        <img
          src={fintaxLogo}
          alt="Fintax Finanças"
          className="h-10 w-auto object-contain"
        />

        {/* Right — Badges */}
        <div className="flex items-center gap-2">
          {(isPro || isFamily) && (
            <Badge
              className={`hidden sm:flex items-center justify-center gap-1.5 px-3 py-1 transition-all ${
                isFamily
                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                  : 'bg-primary/10 text-primary border-primary/30'
              }`}
              variant="outline"
            >
              {isFamily ? (
                <>
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-medium">Familiar</span>
                </>
              ) : (
                <>
                  <Crown className="h-3.5 w-3.5" />
                  <span className="font-medium">Pro</span>
                </>
              )}
            </Badge>
          )}

          <DevBadge />
        </div>
      </header>
    );
  }
