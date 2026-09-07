import { useState, useEffect, useCallback } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Investment, InvestmentFormData, InvestmentType, INVESTMENT_TYPES } from '@/hooks/useInvestments';
import { Portfolio } from '@/hooks/usePortfolios';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';

// Função para formatar valor como moeda brasileira
const formatCurrency = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  if (!numbers) return '';
  
  // Converte para número com 2 casas decimais
  const amount = parseInt(numbers, 10) / 100;
  
  // Formata como moeda brasileira
  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Função para converter valor formatado para número
const parseCurrency = (value: string): number => {
  if (!value) return 0;
  // Remove pontos de milhar e troca vírgula por ponto
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

interface InvestmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: Investment | null;
  portfolios: Portfolio[];
  onSubmit: (data: InvestmentFormData) => void;
  isLoading?: boolean;
}

export function InvestmentDialog({
  open,
  onOpenChange,
  investment,
  portfolios,
  onSubmit,
  isLoading,
}: InvestmentDialogProps) {
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<InvestmentType>('stock');
  const [portfolioId, setPortfolioId] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  
  // Campos específicos para FII
  const [paysDividends, setPaysDividends] = useState(false);
  const [dividendYield, setDividendYield] = useState('');
  const [adminFee, setAdminFee] = useState('');

  const handleCurrencyChange = useCallback((setter: (value: string) => void) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatCurrency(e.target.value);
      setter(formatted);
    };
  }, []);

  // Parse FII data from notes
  const parseFIIData = (notesStr: string | null) => {
    if (!notesStr) return { paysDividends: false, dividendYield: '', adminFee: '', cleanNotes: '' };
    
    const dividendMatch = notesStr.match(/\[DIVIDEND_YIELD:([^\]]*)\]/);
    const feeMatch = notesStr.match(/\[ADMIN_FEE:([^\]]*)\]/);
    const paysDividendsMatch = notesStr.match(/\[PAYS_DIVIDENDS:(true|false)\]/);
    
    const cleanNotes = notesStr
      .replace(/\[DIVIDEND_YIELD:[^\]]*\]/g, '')
      .replace(/\[ADMIN_FEE:[^\]]*\]/g, '')
      .replace(/\[PAYS_DIVIDENDS:[^\]]*\]/g, '')
      .trim();
    
    return {
      paysDividends: paysDividendsMatch ? paysDividendsMatch[1] === 'true' : false,
      dividendYield: dividendMatch ? dividendMatch[1] : '',
      adminFee: feeMatch ? feeMatch[1] : '',
      cleanNotes,
    };
  };

  useEffect(() => {
    if (investment) {
      setTicker(investment.ticker);
      setName(investment.name);
      setType(investment.type);
      setPortfolioId(investment.portfolio_id || '');
      setQuantity(String(investment.quantity));
      setPurchasePrice(formatCurrency(String(Math.round(investment.purchase_price * 100))));
      setCurrentPrice(formatCurrency(String(Math.round(investment.current_price * 100))));
      setPurchaseDate(investment.purchase_date);
      
      // Parse FII data from notes
      const fiiData = parseFIIData(investment.notes);
      setPaysDividends(fiiData.paysDividends);
      setDividendYield(fiiData.dividendYield);
      setAdminFee(fiiData.adminFee);
      setNotes(fiiData.cleanNotes);
    } else {
      setTicker('');
      setName('');
      setType('stock');
      setPortfolioId('');
      setQuantity('');
      setPurchasePrice('');
      setCurrentPrice('');
      setPurchaseDate(format(new Date(), 'yyyy-MM-dd'));
      setNotes('');
      setPaysDividends(false);
      setDividendYield('');
      setAdminFee('');
    }
  }, [investment, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build notes with FII data if applicable
    let finalNotes = notes;
    if (type === 'fii') {
      const fiiMetadata = [
        `[PAYS_DIVIDENDS:${paysDividends}]`,
        dividendYield ? `[DIVIDEND_YIELD:${dividendYield}]` : '',
        adminFee ? `[ADMIN_FEE:${adminFee}]` : '',
      ].filter(Boolean).join(' ');
      
      finalNotes = fiiMetadata + (notes ? ' ' + notes : '');
    }
    
    onSubmit({
      ticker,
      name,
      type,
      portfolio_id: portfolioId === 'none' || !portfolioId ? null : portfolioId,
      quantity: parseFloat(quantity) || 0,
      purchase_price: parseCurrency(purchasePrice),
      current_price: parseCurrency(currentPrice),
      purchase_date: purchaseDate,
      notes: finalNotes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {investment ? 'Editar Investimento' : 'Novo Investimento'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ticker">Ticker</Label>
              <Input
                id="ticker"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="Ex: PETR4"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as InvestmentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVESTMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Petrobras PN"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="portfolio">Carteira (opcional)</Label>
            <Select value={portfolioId} onValueChange={setPortfolioId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma carteira" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {portfolios.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase_date">Data da Compra</Label>
              <DatePicker
                value={purchaseDate}
                onChange={setPurchaseDate}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchase_price">Preço de Compra (R$)</Label>
              <Input
                id="purchase_price"
                type="text"
                inputMode="numeric"
                value={purchasePrice}
                onChange={handleCurrencyChange(setPurchasePrice)}
                placeholder="0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_price">Preço Atual (R$)</Label>
              <Input
                id="current_price"
                type="text"
                inputMode="numeric"
                value={currentPrice}
                onChange={handleCurrencyChange(setCurrentPrice)}
                placeholder="0,00"
                required
              />
            </div>
          </div>

          {/* Campos específicos para FII */}
          {type === 'fii' && (
            <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
              <h4 className="text-sm font-medium text-foreground">Informações do Fundo Imobiliário</h4>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="pays_dividends"
                  checked={paysDividends}
                  onChange={(e) => setPaysDividends(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <Label htmlFor="pays_dividends" className="text-sm cursor-pointer">
                  Este FII paga dividendos mensais?
                </Label>
              </div>

              {paysDividends && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dividend_yield">Dividend Yield (% a.a.)</Label>
                    <Input
                      id="dividend_yield"
                      type="text"
                      inputMode="decimal"
                      value={dividendYield}
                       onChange={(e) => setDividendYield(e.target.value.replace(/[^0-9,.]/g, ''))}
                      placeholder="Ex: 8,5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin_fee">Taxa de Administração (%)</Label>
                    <Input
                      id="admin_fee"
                      type="text"
                      inputMode="decimal"
                      value={adminFee}
                       onChange={(e) => setAdminFee(e.target.value.replace(/[^0-9,.]/g, ''))}
                      placeholder="Ex: 0,5"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre o investimento..."
              rows={2}
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
            <Button type="submit" disabled={isLoading || !ticker || !name}>
              {isLoading ? 'Salvando...' : investment ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
