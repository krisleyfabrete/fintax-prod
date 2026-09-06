import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Account } from '@/hooks/useAccounts';
import { BRAZILIAN_BANKS, Bank } from '@/lib/banks';
import { Loader2, Building2, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FamilySharingToggle } from '@/components/family/FamilySharingToggle';

// Formata valor para moeda brasileira
const formatCurrency = (value: string): string => {
  const numericValue = value.replace(/\D/g, '');
  if (!numericValue) return '';
  
  const number = parseInt(numericValue, 10) / 100;
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Converte string formatada para número
const parseCurrency = (value: string): number => {
  if (!value) return 0;
  const numericValue = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(numericValue) || 0;
};

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Conta Corrente' },
  { value: 'savings', label: 'Poupança' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'investment', label: 'Investimento' },
  { value: 'other', label: 'Outro' },
];

const COLORS = [
  '#8B5CF6', '#10B981', '#3B82F6', '#F59E0B', 
  '#EF4444', '#EC4899', '#6366F1', '#14B8A6',
  '#F97316', '#84CC16', '#06B6D4', '#A855F7',
];

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
  onSave: (data: {
    name: string;
    type: Account['type'];
    balance: number;
    icon: string;
    color: string;
    is_shared_with_family?: boolean;
  }) => void;
  isLoading?: boolean;
  hasFamily?: boolean;
}

export function AccountDialog({ open, onOpenChange, account, onSave, isLoading, hasFamily = false }: AccountDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('checking');
  const [balance, setBalance] = useState('');
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [color, setColor] = useState('#8B5CF6');
  const [logoError, setLogoError] = useState<Record<string, boolean>>({});
  const [bankSearch, setBankSearch] = useState('');
  const [isSharedWithFamily, setIsSharedWithFamily] = useState(false);

  const filteredBanks = useMemo(() => {
    if (!bankSearch.trim()) return BRAZILIAN_BANKS;
    const search = bankSearch.toLowerCase();
    return BRAZILIAN_BANKS.filter(bank => 
      bank.name.toLowerCase().includes(search) ||
      bank.code.toLowerCase().includes(search)
    );
  }, [bankSearch]);

  useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.type);
      setBalance(formatCurrency(String(Math.round(account.balance * 100))));
      setColor(account.color || '#8B5CF6');
      setIsSharedWithFamily((account as { is_shared_with_family?: boolean }).is_shared_with_family || false);
      // Try to match existing account name with a bank
      const matchedBank = BRAZILIAN_BANKS.find(
        b => account.name.toLowerCase().includes(b.name.toLowerCase()) ||
             b.name.toLowerCase().includes(account.name.toLowerCase())
      );
      setSelectedBank(matchedBank?.code || 'other');
    } else {
      setName('');
      setType('checking');
      setBalance('');
      setSelectedBank('');
      setColor('#8B5CF6');
      setIsSharedWithFamily(false);
    }
    setLogoError({});
    setBankSearch('');
  }, [account, open]);

  // Handler para formatação de moeda
  const handleCurrencyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setBalance(formatted);
  }, []);

  const handleBankSelect = (bankCode: string) => {
    setSelectedBank(bankCode);
    if (bankCode !== 'other') {
      const bank = BRAZILIAN_BANKS.find(b => b.code === bankCode);
      if (bank) {
        setName(bank.name);
        setColor(bank.color);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bank = BRAZILIAN_BANKS.find(b => b.code === selectedBank);
    onSave({
      name,
      type,
      balance: parseCurrency(balance),
      icon: selectedBank !== 'other' ? selectedBank : 'wallet',
      color,
      is_shared_with_family: isSharedWithFamily,
    });
  };

  const selectedBankData = BRAZILIAN_BANKS.find(b => b.code === selectedBank);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Bank Selection */}
          <div className="space-y-2">
            <Label>Banco / Instituição</Label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar banco..."
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[140px] rounded-lg border p-2">
              <div className="grid grid-cols-4 gap-2">
                {filteredBanks.map((bank) => (
                  <button
                    key={bank.code}
                    type="button"
                    onClick={() => handleBankSelect(bank.code)}
                    className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                      selectedBank === bank.code 
                        ? 'border-primary bg-primary/10' 
                        : 'border-transparent bg-muted hover:bg-muted/80'
                    }`}
                    title={bank.name}
                  >
                    {!logoError[bank.code] ? (
                      <img 
                        src={bank.logo} 
                        alt={bank.name}
                        className="h-6 w-6 object-contain rounded"
                        onError={() => setLogoError(prev => ({ ...prev, [bank.code]: true }))}
                      />
                    ) : (
                      <div 
                        className="h-6 w-6 rounded flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ backgroundColor: bank.color }}
                      >
                        {bank.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="text-[10px] truncate w-full text-center">
                      {bank.name.split(' ')[0]}
                    </span>
                  </button>
                ))}
                {!bankSearch.trim() && (
                  <button
                    type="button"
                    onClick={() => handleBankSelect('other')}
                    className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                      selectedBank === 'other' 
                        ? 'border-primary bg-primary/10' 
                        : 'border-transparent bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                    <span className="text-[10px] truncate w-full text-center">Outro</span>
                  </button>
                )}
                {filteredBanks.length === 0 && (
                  <div className="col-span-4 text-center text-sm text-muted-foreground py-4">
                    Nenhum banco encontrado
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome da conta</Label>
            <div className="flex items-center gap-2">
              {selectedBankData && !logoError[selectedBankData.code] && (
                <img 
                  src={selectedBankData.logo} 
                  alt={selectedBankData.name}
                  className="h-8 w-8 object-contain rounded"
                  onError={() => setLogoError(prev => ({ ...prev, [selectedBankData.code]: true }))}
                />
              )}
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Nubank, Carteira, Itaú"
                required
                className="flex-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as Account['type'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="balance">Saldo inicial</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="balance"
                  type="text"
                  inputMode="numeric"
                  value={balance}
                  onChange={handleCurrencyChange}
                  placeholder="0,00"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor {selectedBankData && <span className="text-xs text-muted-foreground">(sugerida pelo banco)</span>}</Label>
            <div className="flex flex-wrap gap-2">
              {selectedBankData && (
                <button
                  type="button"
                  onClick={() => setColor(selectedBankData.color)}
                  className={`h-8 w-8 rounded-full transition-all ${
                    color === selectedBankData.color ? 'ring-2 ring-offset-2 ring-primary' : ''
                  }`}
                  style={{ backgroundColor: selectedBankData.color }}
                  title={`Cor do ${selectedBankData.name}`}
                />
              )}
              {COLORS.filter(c => c !== selectedBankData?.color).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-primary' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Family Sharing */}
          {hasFamily && (
            <FamilySharingToggle
              checked={isSharedWithFamily}
              onCheckedChange={setIsSharedWithFamily}
              hasFamily={hasFamily}
            />
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="gradient-primary text-white">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                account ? 'Salvar' : 'Criar conta'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
