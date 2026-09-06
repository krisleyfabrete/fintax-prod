import { Code2, Server } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { getAppVersion } from '@/lib/appVersion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const APP_VERSION = getAppVersion();

export function DevBadge() {
  const { user } = useAuth();
  
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname.includes('preview');
  
  if (!isDevelopment) {
    return null;
  }

  const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('preview');
  const environment = isProduction ? 'PROD' : 'DEV';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            <Badge 
              variant="outline" 
              className="gap-1.5 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/30 text-violet-400 hover:bg-violet-500/20 transition-colors cursor-help"
            >
              <Code2 className="h-3 w-3" />
              <span className="text-xs font-medium">DEV</span>
            </Badge>
            <Badge 
              variant="outline" 
              className={`gap-1 text-xs cursor-help ${
                isProduction 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              <Server className="h-3 w-3" />
              {environment}
            </Badge>
            <Badge 
              variant="outline" 
              className="bg-muted/50 border-muted-foreground/20 text-muted-foreground text-xs cursor-help"
            >
              v{APP_VERSION}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <div className="flex flex-col gap-1">
            <span><strong>Versão:</strong> {APP_VERSION}</span>
            <span><strong>Ambiente:</strong> {environment}</span>
            <span><strong>Host:</strong> {window.location.hostname}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
