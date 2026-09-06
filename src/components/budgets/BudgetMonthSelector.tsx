import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BudgetMonthSelectorProps {
  month: number;
  year: number;
  onMonthChange: (month: number, year: number) => void;
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function BudgetMonthSelector({
  month,
  year,
  onMonthChange,
}: BudgetMonthSelectorProps) {
  const goToPreviousMonth = () => {
    if (month === 1) {
      onMonthChange(12, year - 1);
    } else {
      onMonthChange(month - 1, year);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      onMonthChange(1, year + 1);
    } else {
      onMonthChange(month + 1, year);
    }
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    onMonthChange(now.getMonth() + 1, now.getFullYear());
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return month === now.getMonth() + 1 && year === now.getFullYear();
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={goToPreviousMonth}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="min-w-[160px] text-center">
        <span className="font-semibold text-lg">
          {monthNames[month - 1]} {year}
        </span>
      </div>
      
      <Button
        variant="outline"
        size="icon"
        onClick={goToNextMonth}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrentMonth() && (
        <Button
          variant="ghost"
          size="sm"
          onClick={goToCurrentMonth}
          className="ml-2"
        >
          Hoje
        </Button>
      )}
    </div>
  );
}
