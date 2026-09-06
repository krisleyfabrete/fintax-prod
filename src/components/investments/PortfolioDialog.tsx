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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Portfolio, PortfolioFormData } from '@/hooks/usePortfolios';
import { Broker } from '@/hooks/useBrokers';

interface PortfolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolio?: Portfolio | null;
  brokers: Broker[];
  onSubmit: (data: PortfolioFormData) => void;
  isLoading?: boolean;
}

export function PortfolioDialog({
  open,
  onOpenChange,
  portfolio,
  brokers,
  onSubmit,
  isLoading,
}: PortfolioDialogProps) {
  const [name, setName] = useState('');
  const [brokerId, setBrokerId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isShared, setIsShared] = useState(false);

  useEffect(() => {
    if (portfolio) {
      setName(portfolio.name);
      setBrokerId(portfolio.broker_id || '');
      setDescription(portfolio.description || '');
      setIsShared(portfolio.is_shared_with_family);
    } else {
      setName('');
      setBrokerId('');
      setDescription('');
      setIsShared(false);
    }
  }, [portfolio, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      broker_id: brokerId === 'none' || !brokerId ? null : brokerId,
      description,
      is_shared_with_family: isShared,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {portfolio ? 'Editar Carteira' : 'Nova Carteira'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Carteira de Ações"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="broker">Corretora (opcional)</Label>
            <Select value={brokerId} onValueChange={setBrokerId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma corretora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {brokers.map((broker) => (
                  <SelectItem key={broker.id} value={broker.id}>
                    {broker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição da carteira..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_shared">Compartilhar com família</Label>
            <Switch
              id="is_shared"
              checked={isShared}
              onCheckedChange={setIsShared}
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
              {isLoading ? 'Salvando...' : portfolio ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
