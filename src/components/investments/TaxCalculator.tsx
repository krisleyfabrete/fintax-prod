import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, FileText, Download, AlertTriangle, Info } from 'lucide-react';
import { Investment, InvestmentType } from '@/hooks/useInvestments';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TaxCalculatorProps {
  investments: Investment[];
}

interface TaxInfo {
  type: InvestmentType;
  label: string;
  taxRate: number;
  exemptionLimit: number | null;
  exemptionType: 'monthly_sales' | 'gain' | 'none';
  notes: string;
}

const TAX_INFO: TaxInfo[] = [
  { 
    type: 'stock', 
    label: 'Ações', 
    taxRate: 15, 
    exemptionLimit: 20000, 
    exemptionType: 'monthly_sales',
    notes: 'Isento se vendas mensais ≤ R$20.000. Day trade: 20%.'
  },
  { 
    type: 'fii', 
    label: 'FIIs', 
    taxRate: 20, 
    exemptionLimit: null, 
    exemptionType: 'none',
    notes: 'Sem isenção. Dividendos são isentos para PF.'
  },
  { 
    type: 'etf', 
    label: 'ETFs', 
    taxRate: 15, 
    exemptionLimit: null, 
    exemptionType: 'none',
    notes: 'Sem isenção de vendas. ETFs de renda fixa: 15%.'
  },
  { 
    type: 'bdr', 
    label: 'BDRs', 
    taxRate: 15, 
    exemptionLimit: null, 
    exemptionType: 'none',
    notes: 'Sem isenção de vendas.'
  },
  { 
    type: 'crypto', 
    label: 'Criptomoedas', 
    taxRate: 15, 
    exemptionLimit: 35000, 
    exemptionType: 'monthly_sales',
    notes: 'Isento se vendas mensais ≤ R$35.000.'
  },
  { 
    type: 'fixed_income', 
    label: 'Renda Fixa', 
    taxRate: 15, 
    exemptionLimit: null, 
    exemptionType: 'none',
    notes: 'Tabela regressiva: 22,5% (até 180 dias) a 15% (acima de 720 dias).'
  },
  { 
    type: 'treasury', 
    label: 'Tesouro Direto', 
    taxRate: 15, 
    exemptionLimit: null, 
    exemptionType: 'none',
    notes: 'Tabela regressiva: 22,5% (até 180 dias) a 15% (acima de 720 dias).'
  },
];

export function TaxCalculator({ investments }: TaxCalculatorProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Calcular ganhos por tipo de ativo
  const calculateGainsByType = () => {
    const gainsByType = {} as Record<InvestmentType, { invested: number; current: number; gain: number; taxDue: number }>;

    investments.forEach((inv) => {
      const invested = inv.quantity * inv.purchase_price;
      const current = inv.quantity * inv.current_price;
      const gain = current - invested;

      if (!gainsByType[inv.type]) {
        gainsByType[inv.type] = { invested: 0, current: 0, gain: 0, taxDue: 0 };
      }

      gainsByType[inv.type].invested += invested;
      gainsByType[inv.type].current += current;
      gainsByType[inv.type].gain += gain;
    });

    // Calcular imposto devido
    Object.entries(gainsByType).forEach(([type, data]) => {
      const taxInfo = TAX_INFO.find(t => t.type === type);
      if (taxInfo && data.gain > 0) {
        // Simplificação: assumir que vendeu tudo
        // Em produção, precisaria rastrear vendas reais
        const taxableGain = data.gain;
        gainsByType[type as InvestmentType].taxDue = taxableGain * (taxInfo.taxRate / 100);
      }
    });

    return gainsByType;
  };

  const gainsByType = calculateGainsByType();
  
  const totalGain = Object.values(gainsByType).reduce((sum, data) => sum + data.gain, 0);
  const totalTaxDue = Object.values(gainsByType).reduce((sum, data) => sum + data.taxDue, 0);

  // Gerar relatório de posição para IRPF
  const generatePositionReport = () => {
    const byType: Record<string, Investment[]> = {};
    
    investments.forEach((inv) => {
      if (!byType[inv.type]) {
        byType[inv.type] = [];
      }
      byType[inv.type].push(inv);
    });

    return byType;
  };

  const positionReport = generatePositionReport();

  // Exportar PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    const currentDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    // Título
    doc.setFontSize(18);
    doc.text('Relatório de Investimentos para IR', 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${currentDate}`, 14, 30);
    doc.text(`Ano-base: ${selectedYear}`, 14, 36);

    // Resumo
    doc.setFontSize(14);
    doc.text('Resumo de Ganhos de Capital', 14, 50);

    const summaryData = Object.entries(gainsByType).map(([type, data]) => {
      const taxInfo = TAX_INFO.find(t => t.type === type);
      return [
        taxInfo?.label || type,
        formatCurrency(data.invested),
        formatCurrency(data.current),
        formatCurrency(data.gain),
        `${taxInfo?.taxRate || 15}%`,
        formatCurrency(data.taxDue),
      ];
    });

    autoTable(doc, {
      startY: 55,
      head: [['Tipo', 'Investido', 'Valor Atual', 'Ganho', 'Alíquota', 'IR Estimado']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] },
    });

    // Posição detalhada
    let yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

    doc.setFontSize(14);
    doc.text('Posição Detalhada (Bens e Direitos)', 14, yPos);

    const detailedData = investments.map((inv) => {
      const taxInfo = TAX_INFO.find(t => t.type === inv.type);
      const totalValue = inv.quantity * inv.current_price;
      return [
        inv.ticker,
        inv.name,
        taxInfo?.label || inv.type,
        String(inv.quantity),
        formatCurrency(inv.purchase_price),
        formatCurrency(totalValue),
      ];
    });

    autoTable(doc, {
      startY: yPos + 5,
      head: [['Ticker', 'Nome', 'Tipo', 'Qtd', 'Preço Médio', 'Valor Total']],
      body: detailedData,
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      },
    });

    // Notas
    yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Notas:', 14, yPos);
    doc.text('- Este relatório é apenas informativo e não substitui a análise de um contador.', 14, yPos + 5);
    doc.text('- Os valores de IR são estimados considerando a venda total dos ativos.', 14, yPos + 10);
    doc.text('- Consulte a legislação vigente para isenções e regras específicas.', 14, yPos + 15);

    doc.save(`relatorio-ir-${selectedYear}.pdf`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calculadora de IR
            </CardTitle>
            <CardDescription>
              Estimativa de imposto sobre ganhos de capital
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">Resumo</TabsTrigger>
            <TabsTrigger value="details">Detalhado</TabsTrigger>
            <TabsTrigger value="rules">Regras de IR</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-500">
                    {formatCurrency(Math.max(0, totalGain))}
                  </div>
                  <p className="text-sm text-muted-foreground">Ganho Total Estimado</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-orange-500">
                    {formatCurrency(Math.max(0, totalTaxDue))}
                  </div>
                  <p className="text-sm text-muted-foreground">IR Estimado a Pagar</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
              <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium">Importante:</p>
                <p>Este cálculo considera a venda hipotética de todos os ativos. O IR real depende das operações realizadas e pode ter isenções aplicáveis.</p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Investido</TableHead>
                  <TableHead className="text-right">Atual</TableHead>
                  <TableHead className="text-right">Ganho</TableHead>
                  <TableHead className="text-right">IR Estimado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(gainsByType).map(([type, data]) => {
                  const taxInfo = TAX_INFO.find(t => t.type === type);
                  return (
                    <TableRow key={type}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {taxInfo?.label || type}
                          <Badge variant="outline" className="text-xs">
                            {taxInfo?.taxRate || 15}%
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(data.invested)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.current)}</TableCell>
                      <TableCell className={`text-right ${data.gain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(data.gain)}
                      </TableCell>
                      <TableCell className="text-right text-orange-500">
                        {formatCurrency(data.taxDue)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">PM</TableHead>
                  <TableHead className="text-right">Atual</TableHead>
                  <TableHead className="text-right">Ganho</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investments.map((inv) => {
                  const cost = inv.quantity * inv.purchase_price;
                  const value = inv.quantity * inv.current_price;
                  const gain = value - cost;
                  const taxInfo = TAX_INFO.find(t => t.type === inv.type);
                  
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.ticker}</TableCell>
                      <TableCell>{inv.name}</TableCell>
                      <TableCell>{taxInfo?.label || inv.type}</TableCell>
                      <TableCell className="text-right">{inv.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(inv.purchase_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(inv.current_price)}</TableCell>
                      <TableCell className={`text-right ${gain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(gain)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            <div className="grid gap-3">
              {TAX_INFO.map((info) => (
                <Card key={info.type}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{info.label}</h4>
                          <Badge variant="outline">{info.taxRate}%</Badge>
                          {info.exemptionLimit && (
                            <Badge variant="secondary" className="text-xs">
                              Isenção: {formatCurrency(info.exemptionLimit)}/mês
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{info.notes}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-600 dark:text-yellow-400">Atenção:</p>
                <p className="text-muted-foreground">
                  As regras fiscais podem mudar. Consulte sempre um contador ou a Receita Federal para informações atualizadas.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
