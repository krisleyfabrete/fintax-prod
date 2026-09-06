import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Account {
  id: string;
  name: string;
}

interface ReportFiltersProps {
  startDate: string;
  endDate: string;
  accountId: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onAccountChange: (accountId: string) => void;
  accounts: Account[];
}

export function ReportFilters({
  startDate,
  endDate,
  accountId,
  onStartDateChange,
  onEndDateChange,
  onAccountChange,
  accounts,
}: ReportFiltersProps) {
  const today = new Date();

  const presets = [
    {
      label: 'Este mês',
      getValue: () => ({
        start: format(startOfMonth(today), 'yyyy-MM-dd'),
        end: format(endOfMonth(today), 'yyyy-MM-dd'),
      }),
    },
    {
      label: 'Mês passado',
      getValue: () => ({
        start: format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'),
        end: format(endOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'),
      }),
    },
    {
      label: 'Últimos 3 meses',
      getValue: () => ({
        start: format(startOfMonth(subMonths(today, 2)), 'yyyy-MM-dd'),
        end: format(endOfMonth(today), 'yyyy-MM-dd'),
      }),
    },
    {
      label: 'Últimos 6 meses',
      getValue: () => ({
        start: format(startOfMonth(subMonths(today, 5)), 'yyyy-MM-dd'),
        end: format(endOfMonth(today), 'yyyy-MM-dd'),
      }),
    },
    {
      label: 'Este ano',
      getValue: () => ({
        start: format(startOfYear(today), 'yyyy-MM-dd'),
        end: format(endOfYear(today), 'yyyy-MM-dd'),
      }),
    },
    {
      label: 'Últimos 12 meses',
      getValue: () => ({
        start: format(startOfMonth(subMonths(today, 11)), 'yyyy-MM-dd'),
        end: format(endOfMonth(today), 'yyyy-MM-dd'),
      }),
    },
  ];

  const handlePresetClick = (preset: typeof presets[0]) => {
    const { start, end } = preset.getValue();
    onStartDateChange(start);
    onEndDateChange(end);
  };

  return (
    <div className="glass-card flex flex-wrap items-end gap-4 p-4">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="h-4 w-4" />
              Período
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {presets.map((preset) => (
              <DropdownMenuItem key={preset.label} onClick={() => handlePresetClick(preset)}>
                {preset.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">De</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-36 h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Até</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-36 h-9"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Conta</Label>
        <Select value={accountId} onValueChange={onAccountChange}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Todas as contas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
