import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DowngradeRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  isLoading: boolean;
  currentPlan: string;
}

export function DowngradeRequestDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  currentPlan,
}: DowngradeRequestDialogProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason.trim() || undefined);
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Solicitar Downgrade
          </DialogTitle>
          <DialogDescription>
            Você está solicitando o downgrade do plano {currentPlan} para o plano Gratuito.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Sua solicitação será analisada por um administrador. Você continuará com acesso ao plano atual até a aprovação.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Textarea
              id="reason"
              placeholder="Conte-nos o motivo do downgrade para que possamos melhorar..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Solicitar Downgrade'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
