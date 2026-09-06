import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToCSV, exportToPDF } from '@/lib/exportReport';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  type: 'income' | 'expense';
  status: string;
  category?: { name: string; color: string } | null;
  account?: { name: string } | null;
}

interface ExportButtonsProps {
  transactions: Transaction[];
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpense: number;
}

export function ExportButtons({
  transactions,
  startDate,
  endDate,
  totalIncome,
  totalExpense,
}: ExportButtonsProps) {
  const exportData = {
    transactions,
    startDate,
    endDate,
    totalIncome,
    totalExpense,
  };

  const handleExportPDF = async () => {
    try {
      await exportToPDF(exportData);
      toast.success('Relatório PDF exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar PDF');
      console.error(error);
    }
  };

  const handleExportCSV = () => {
    try {
      exportToCSV(exportData);
      toast.success('Relatório CSV exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar CSV');
      console.error(error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4" />
          Exportar PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4" />
          Exportar CSV (Excel)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
