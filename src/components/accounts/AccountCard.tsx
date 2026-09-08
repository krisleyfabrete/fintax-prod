import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Account } from '@/hooks/useAccounts';
import { getBankByCode } from '@/lib/banks';
import { 
  MoreVertical, 
  Pencil, 
  Trash2,
  Wallet
} from 'lucide-react';

const ACCOUNT_TYPE_LABELS: Record<Account['type'], string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  credit_card: 'Cartão de Crédito',
  cash: 'Dinheiro',
  investment: 'Investimento',
  other: 'Outro',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
}

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const [logoError, setLogoError] = useState(false);
  const bank = getBankByCode(account.icon || '');
  const isNegative = account.balance < 0;

  return (
    <Card className="shadow-card border-0 overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        <div className="flex items-center gap-4 p-4">
          <div 
            className="h-12 w-12 rounded-xl flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: `${account.color}20` }}
          >
            {bank && !logoError ? (
              <img 
                src={bank.logo} 
                alt={bank.name}
                className="h-8 w-8 object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <Wallet 
                className="h-6 w-6" 
                style={{ color: account.color || '#8B5CF6' }} 
              />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{account?.name || 'Sem nome'}</h3>
              {!account?.is_active && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                  Inativa
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {account ? ACCOUNT_TYPE_LABELS[account.type] : '--'}
            </p>
          </div>

          <div className="text-right">
            <p className={`text-lg font-bold ${isNegative ? 'text-expense' : ''}`}>
              {formatCurrency(account.balance)}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(account)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(account)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Color bar */}
        <div 
          className="h-1" 
          style={{ backgroundColor: account.color || '#8B5CF6' }} 
        />
      </CardContent>
    </Card>
  );
}
