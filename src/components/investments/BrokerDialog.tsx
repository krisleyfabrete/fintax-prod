import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Broker, BrokerFormData } from '@/hooks/useBrokers';

interface BrokerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  broker?: Broker | null;
  onSubmit: (data: BrokerFormData) => void;
  isLoading?: boolean;
}

const BROKER_COLORS = [
  '#8B5CF6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

export function BrokerDialog({
  open,
  onOpenChange,
  broker,
  onSubmit,
  isLoading,
}: BrokerDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#8B5CF6');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (broker) {
      setName(broker.name);
      setColor(broker.color || '#8B5CF6');
      setIsActive(broker.is_active ?? true);
    } else {
      setName('');
      setColor('#8B5CF6');
      setIsActive(true);
    }
  }, [broker, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      color,
      is_active: isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {broker ? 'Editar Corretora' : 'Nova Corretora'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: XP Investimentos"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {BROKER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Ativa</Label>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !name}>
              {isLoading ? 'Salvando...' : broker ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
