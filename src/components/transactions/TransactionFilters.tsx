import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TransactionFilters as Filters } from '@/hooks/useTransactions';
import { Category } from '@/hooks/useCategories';
import { Account } from '@/hooks/useAccounts';
import { DatePicker } from '@/components/ui/date-picker';

interface TransactionFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  categories: Category[];
  accounts: Account[];
}

export function TransactionFilters({
  filters,
  onFiltersChange,
  categories,
  accounts,
}: TransactionFiltersProps) {
  const updateFilter = (key: keyof Filters, value: string | undefined) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {/* Busca */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value || undefined)}
            className="pl-9"
          />
        </div>

        {/* Tipo */}
        <Select
          value={filters.type || 'all'}
          onValueChange={(v) => updateFilter('type', v === 'all' ? undefined : v as 'income' | 'expense')}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="income">Receitas</SelectItem>
            <SelectItem value="expense">Despesas</SelectItem>
          </SelectContent>
        </Select>

        {/* Categoria */}
        <Select
          value={filters.categoryId || 'all'}
          onValueChange={(v) => updateFilter('categoryId', v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Conta */}
        <Select
          value={filters.accountId || 'all'}
          onValueChange={(v) => updateFilter('accountId', v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Conta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas contas</SelectItem>
            {accounts.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>
                {acc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => updateFilter('status', v === 'all' ? undefined : v as Filters['status'])}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="confirmed">Confirmada</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
          </SelectContent>
        </Select>

        {/* Período - Data Início */}
        <DatePicker
          value={filters.startDate || ''}
          onChange={(value) => updateFilter('startDate', value || undefined)}
          className="w-[150px]"
        />

        {/* Período - Data Fim */}
        <DatePicker
          value={filters.endDate || ''}
          onChange={(value) => updateFilter('endDate', value || undefined)}
          className="w-[150px]"
        />

        {/* Limpar filtros */}
        {hasActiveFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
