import { Separator } from '@/components/ui/separator';
import { getAppVersion } from '@/lib/appVersion';

const CURRENT_YEAR = new Date().getFullYear();

interface AppFooterProps {
  className?: string;
}

export function AppFooter({ className }: AppFooterProps) {
  return (
    <footer className={className}>
      <Separator className="mb-4" />
      <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground px-4 pb-4">
        <p>
          © {CURRENT_YEAR} FinTax. Todos os direitos reservados.
        </p>
        <p className="text-center">
          Desenvolvido por <span className="font-medium">Kaleby Fabrete Nascimento</span>
        </p>
        <p className="flex items-center gap-1">
          <span>Versão</span>
          <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{getAppVersion()}</span>
        </p>
      </div>
    </footer>
  );
}
