import { useState } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Filter, Users, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { FamilyDataFilters as Filters } from '@/hooks/useFamilyData';
import { Badge } from '@/components/ui/badge';

interface MemberProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface FamilyDataFiltersProps {
  memberProfiles: MemberProfile[];
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export function FamilyDataFilters({
  memberProfiles,
  filters,
  onFiltersChange,
}: FamilyDataFiltersProps) {
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: filters.startDate ? new Date(filters.startDate) : undefined,
    to: filters.endDate ? new Date(filters.endDate) : undefined,
  });

  const handleMemberChange = (value: string) => {
    onFiltersChange({
      ...filters,
      memberId: value === 'all' ? undefined : value,
    });
  };

  const handlePeriodPreset = (preset: string) => {
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    switch (preset) {
      case 'this-month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'last-month':
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
        break;
      case 'last-3-months':
        startDate = startOfMonth(subMonths(now, 2));
        endDate = endOfMonth(now);
        break;
      case 'all':
        startDate = undefined;
        endDate = undefined;
        break;
    }

    setDateRange({ from: startDate, to: endDate });
    onFiltersChange({
      ...filters,
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
    });
  };

  const handleDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    setDateRange({ from: range?.from, to: range?.to });
    onFiltersChange({
      ...filters,
      startDate: range?.from ? format(range.from, 'yyyy-MM-dd') : undefined,
      endDate: range?.to ? format(range.to, 'yyyy-MM-dd') : undefined,
    });
  };

  const clearFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    onFiltersChange({});
  };

  const activeFiltersCount = [filters.memberId, filters.startDate].filter(Boolean).length;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filtros</span>
        {activeFiltersCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {activeFiltersCount}
          </Badge>
        )}
      </div>

      {/* Member filter */}
      <Select
        value={filters.memberId || 'all'}
        onValueChange={handleMemberChange}
      >
        <SelectTrigger className="w-[180px]">
          <Users className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Todos os membros" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os membros</SelectItem>
          {memberProfiles.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.full_name || 'Membro'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Period presets */}
      <Select onValueChange={handlePeriodPreset}>
        <SelectTrigger className="w-[160px]">
          <Calendar className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todo período</SelectItem>
          <SelectItem value="this-month">Este mês</SelectItem>
          <SelectItem value="last-month">Mês passado</SelectItem>
          <SelectItem value="last-3-months">Últimos 3 meses</SelectItem>
        </SelectContent>
      </Select>

      {/* Custom date range */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            {dateRange.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, 'dd/MM', { locale: ptBR })} -{' '}
                  {format(dateRange.to, 'dd/MM', { locale: ptBR })}
                </>
              ) : (
                format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })
              )
            ) : (
              'Personalizado'
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            initialFocus
            mode="range"
            defaultMonth={dateRange.from}
            selected={dateRange}
            onSelect={handleDateSelect}
            numberOfMonths={2}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>

      {activeFiltersCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Limpar
        </Button>
      )}
    </div>
  );
}
