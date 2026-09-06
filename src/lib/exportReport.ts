import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type RGBTuple = [number, number, number];

interface ReportColors {
  background: RGBTuple;
  cardBg: RGBTuple;
  primary: RGBTuple;
  primaryDark: RGBTuple;
  text: RGBTuple;
  textMuted: RGBTuple;
  income: RGBTuple;
  expense: RGBTuple;
  border: RGBTuple;
  headerText: RGBTuple;
}

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

interface ExportData {
  transactions: Transaction[];
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpense: number;
}

interface CategoryData {
  name: string;
  amount: number;
  color: string;
  percentage: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (date: string) =>
  format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });

export function exportToCSV(data: ExportData, filename = 'relatorio') {
  const { transactions, startDate, endDate, totalIncome, totalExpense } = data;
  
  const headers = ['Data', 'Descrição', 'Categoria', 'Conta', 'Tipo', 'Status', 'Valor'];
  
  const rows = transactions.map((t) => [
    formatDate(t.date),
    t.description || '-',
    t.category?.name || 'Sem categoria',
    t.account?.name || '-',
    t.type === 'income' ? 'Receita' : 'Despesa',
    t.status === 'confirmed' ? 'Confirmada' : 'Pendente',
    formatCurrency(t.amount),
  ]);

  // Add summary rows
  rows.push([]);
  rows.push(['', '', '', '', '', 'Total Receitas:', formatCurrency(totalIncome)]);
  rows.push(['', '', '', '', '', 'Total Despesas:', formatCurrency(totalExpense)]);
  rows.push(['', '', '', '', '', 'Saldo:', formatCurrency(totalIncome - totalExpense)]);

  const csvContent = [
    `Relatório Financeiro - ${formatDate(startDate)} a ${formatDate(endDate)}`,
    '',
    headers.join(';'),
    ...rows.map((row) => row.join(';')),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Helper to load image as base64
async function loadImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Generate category data from transactions
function getCategoryData(transactions: Transaction[], type: 'expense' | 'income'): CategoryData[] {
  const categoryMap = new Map<string, { amount: number; color: string }>();
  
  transactions
    .filter(t => t.type === type)
    .forEach(t => {
      const categoryName = t.category?.name || 'Sem categoria';
      const categoryColor = t.category?.color || '#64748b';
      const existing = categoryMap.get(categoryName);
      if (existing) {
        existing.amount += t.amount;
      } else {
        categoryMap.set(categoryName, { amount: t.amount, color: categoryColor });
      }
    });

  const total = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.amount, 0);
  
  return Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      name,
      amount: data.amount,
      color: data.color,
      percentage: total > 0 ? (data.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6); // Top 6 categories
}

// Generate monthly data from transactions
function getMonthlyData(transactions: Transaction[], startDate: string, endDate: string): MonthlyData[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const monthlyMap = new Map<string, { income: number; expense: number }>();

  // Initialize all months in the range
  let currentDate = startOfMonth(start);
  const endMonth = endOfMonth(end);
  
  while (currentDate <= endMonth) {
    const monthKey = format(currentDate, 'yyyy-MM');
    monthlyMap.set(monthKey, { income: 0, expense: 0 });
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  }

  // Aggregate transactions by month
  transactions.forEach(t => {
    const monthKey = format(parseISO(t.date), 'yyyy-MM');
    const existing = monthlyMap.get(monthKey);
    if (existing) {
      if (t.type === 'income') {
        existing.income += t.amount;
      } else {
        existing.expense += t.amount;
      }
    }
  });

  return Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month: format(parseISO(`${month}-01`), 'MMM/yy', { locale: ptBR }),
      income: data.income,
      expense: data.expense,
      balance: data.income - data.expense,
    }))
    .slice(-12); // Last 12 months max
}

// Draw pie chart on canvas and return as base64
function drawPieChart(categories: CategoryData[], title: string, colors: ReportColors): string {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 280;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = `rgb(${colors.cardBg.join(',')})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = `rgb(${colors.text.join(',')})`;
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(title, canvas.width / 2, 25);

  if (categories.length === 0) {
    ctx.fillStyle = `rgb(${colors.textMuted.join(',')})`;
    ctx.font = '12px Arial';
    ctx.fillText('Sem dados para exibir', canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL('image/png');
  }

  // Pie chart
  const centerX = 120;
  const centerY = 150;
  const radius = 80;
  let startAngle = -Math.PI / 2;

  categories.forEach(category => {
    const sliceAngle = (category.percentage / 100) * 2 * Math.PI;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = category.color;
    ctx.fill();
    
    // Add white border between slices
    ctx.strokeStyle = `rgb(${colors.cardBg.join(',')})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    startAngle += sliceAngle;
  });

  // Legend
  const legendX = 230;
  let legendY = 60;
  const legendItemHeight = 32;

  categories.forEach((category, index) => {
    // Color box
    ctx.fillStyle = category.color;
    ctx.fillRect(legendX, legendY, 12, 12);
    
    // Category name
    ctx.fillStyle = `rgb(${colors.text.join(',')})`;
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    const displayName = category.name.length > 12 ? category.name.substring(0, 12) + '...' : category.name;
    ctx.fillText(displayName, legendX + 18, legendY + 10);
    
    // Amount and percentage
    ctx.fillStyle = `rgb(${colors.textMuted.join(',')})`;
    ctx.font = '10px Arial';
    const amountText = formatCurrency(category.amount);
    ctx.fillText(`${amountText} (${category.percentage.toFixed(1)}%)`, legendX + 18, legendY + 24);
    
    legendY += legendItemHeight;
  });

  return canvas.toDataURL('image/png');
}

// Draw bar chart on canvas and return as base64
function drawBarChart(monthlyData: MonthlyData[], colors: ReportColors): string {
  const canvas = document.createElement('canvas');
  canvas.width = 560;
  canvas.height = 220;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = `rgb(${colors.cardBg.join(',')})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = `rgb(${colors.text.join(',')})`;
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Evolução Mensal', canvas.width / 2, 25);

  if (monthlyData.length === 0) {
    ctx.fillStyle = `rgb(${colors.textMuted.join(',')})`;
    ctx.font = '12px Arial';
    ctx.fillText('Sem dados para exibir', canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL('image/png');
  }

  const chartX = 70;
  const chartY = 45;
  const chartWidth = 470;
  const chartHeight = 130;
  const barGroupWidth = chartWidth / monthlyData.length;
  const barWidth = barGroupWidth * 0.35;

  // Find max value for scaling
  const maxValue = Math.max(
    ...monthlyData.map(d => Math.max(d.income, d.expense)),
    1
  );

  // Draw grid lines
  ctx.strokeStyle = `rgba(${colors.border.join(',')}, 0.5)`;
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = chartY + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(chartX, y);
    ctx.lineTo(chartX + chartWidth, y);
    ctx.stroke();

    // Y-axis labels
    const value = maxValue - (maxValue / 4) * i;
    ctx.fillStyle = `rgb(${colors.textMuted.join(',')})`;
    ctx.font = '9px Arial';
    ctx.textAlign = 'right';
    const formattedValue = value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toFixed(0);
    ctx.fillText(`R$ ${formattedValue}`, chartX - 8, y + 4);
  }

  // Draw bars and labels
  monthlyData.forEach((data, index) => {
    const x = chartX + index * barGroupWidth + barGroupWidth / 2;
    
    // Income bar (green)
    const incomeHeight = (data.income / maxValue) * chartHeight;
    ctx.fillStyle = `rgb(${colors.income.join(',')})`;
    ctx.fillRect(x - barWidth - 2, chartY + chartHeight - incomeHeight, barWidth, incomeHeight);
    
    // Expense bar (red)
    const expenseHeight = (data.expense / maxValue) * chartHeight;
    ctx.fillStyle = `rgb(${colors.expense.join(',')})`;
    ctx.fillRect(x + 2, chartY + chartHeight - expenseHeight, barWidth, expenseHeight);
    
    // Month label
    ctx.fillStyle = `rgb(${colors.textMuted.join(',')})`;
    ctx.font = '9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(data.month, x, chartY + chartHeight + 15);
  });

  // Legend
  const legendY = chartY + chartHeight + 30;
  
  // Income legend
  ctx.fillStyle = `rgb(${colors.income.join(',')})`;
  ctx.fillRect(canvas.width / 2 - 80, legendY, 10, 10);
  ctx.fillStyle = `rgb(${colors.text.join(',')})`;
  ctx.font = '10px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Receitas', canvas.width / 2 - 65, legendY + 9);
  
  // Expense legend
  ctx.fillStyle = `rgb(${colors.expense.join(',')})`;
  ctx.fillRect(canvas.width / 2 + 20, legendY, 10, 10);
  ctx.fillStyle = `rgb(${colors.text.join(',')})`;
  ctx.fillText('Despesas', canvas.width / 2 + 35, legendY + 9);

  return canvas.toDataURL('image/png');
}

export async function exportToPDF(data: ExportData, filename = 'relatorio') {
  const { transactions, startDate, endDate, totalIncome, totalExpense } = data;
  
  const doc = new jsPDF();
  
  // Standard margins
  const margin = 15;
  const pageWidth = 210;
  const contentWidth = pageWidth - (margin * 2);
  
  // Fintax Design System Colors (as tuples for jsPDF)
  const colors = {
    background: [15, 23, 42] as [number, number, number],
    cardBg: [23, 34, 55] as [number, number, number],
    primary: [34, 197, 94] as [number, number, number],
    primaryDark: [22, 163, 74] as [number, number, number],
    text: [248, 250, 252] as [number, number, number],
    textMuted: [148, 163, 184] as [number, number, number],
    income: [34, 197, 94] as [number, number, number],
    expense: [239, 68, 68] as [number, number, number],
    border: [51, 65, 85] as [number, number, number],
    headerText: [15, 23, 42] as [number, number, number],
  };

  // Set dark background for the entire page
  doc.setFillColor(colors.background[0], colors.background[1], colors.background[2]);
  doc.rect(0, 0, 210, 297, 'F');

  // Header card
  doc.setFillColor(colors.cardBg[0], colors.cardBg[1], colors.cardBg[2]);
  doc.roundedRect(margin, margin, contentWidth, 30, 3, 3, 'F');
  
  // Green accent line at top
  doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.rect(margin, margin, contentWidth, 2, 'F');

  // Try to load and add logo
  try {
    const logoUrl = new URL('/src/assets/fintax-logo-principal.png', window.location.origin).href;
    const logoBase64 = await loadImageAsBase64(logoUrl);
    doc.addImage(logoBase64, 'PNG', margin + 5, margin + 6, 40, 18);
  } catch (e) {
    // Fallback to text if logo fails
    doc.setFontSize(20);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('FINTAX', margin + 5, margin + 20);
  }

  // Report title and period info on the right
  doc.setFontSize(10);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório Financeiro', pageWidth - margin - 5, margin + 14, { align: 'right' });
  
  doc.setFontSize(8);
  doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formatDate(startDate)} a ${formatDate(endDate)}`, pageWidth - margin - 5, margin + 22, { align: 'right' });
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth - margin - 5, margin + 30, { align: 'right' });

  // Summary Cards
  const cardY = margin + 38;
  const cardHeight = 24;
  const cardWidth = (contentWidth - 10) / 3;
  const cardSpacing = 5;

  // Income Card
  doc.setFillColor(colors.cardBg[0], colors.cardBg[1], colors.cardBg[2]);
  doc.roundedRect(margin, cardY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFillColor(colors.income[0], colors.income[1], colors.income[2]);
  doc.rect(margin, cardY, 2, cardHeight, 'F');
  
  doc.setFontSize(7);
  doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
  doc.text('Receitas', margin + 6, cardY + 8);
  doc.setFontSize(10);
  doc.setTextColor(colors.income[0], colors.income[1], colors.income[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(totalIncome), margin + 6, cardY + 17);

  // Expense Card
  const expenseCardX = margin + cardWidth + cardSpacing;
  doc.setFillColor(colors.cardBg[0], colors.cardBg[1], colors.cardBg[2]);
  doc.roundedRect(expenseCardX, cardY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFillColor(colors.expense[0], colors.expense[1], colors.expense[2]);
  doc.rect(expenseCardX, cardY, 2, cardHeight, 'F');
  
  doc.setFontSize(7);
  doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('Despesas', expenseCardX + 6, cardY + 8);
  doc.setFontSize(10);
  doc.setTextColor(colors.expense[0], colors.expense[1], colors.expense[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(totalExpense), expenseCardX + 6, cardY + 17);

  // Balance Card
  const balance = totalIncome - totalExpense;
  const balanceColor = balance >= 0 ? colors.income : colors.expense;
  
  const balanceCardX = expenseCardX + cardWidth + cardSpacing;
  doc.setFillColor(colors.cardBg[0], colors.cardBg[1], colors.cardBg[2]);
  doc.roundedRect(balanceCardX, cardY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFillColor(balanceColor[0], balanceColor[1], balanceColor[2]);
  doc.rect(balanceCardX, cardY, 2, cardHeight, 'F');
  
  doc.setFontSize(7);
  doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('Saldo', balanceCardX + 6, cardY + 8);
  doc.setFontSize(10);
  doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(balance), balanceCardX + 6, cardY + 17);

  // Generate chart data
  const expenseCategories = getCategoryData(transactions, 'expense');
  const incomeCategories = getCategoryData(transactions, 'income');
  const monthlyData = getMonthlyData(transactions, startDate, endDate);

  // Charts section
  const chartsY = cardY + cardHeight + 8;
  
  // Draw expense pie chart
  const expensePieChart = drawPieChart(expenseCategories, 'Despesas por Categoria', colors);
  doc.addImage(expensePieChart, 'PNG', margin, chartsY, 85, 60);
  
  // Draw income pie chart
  const incomePieChart = drawPieChart(incomeCategories, 'Receitas por Categoria', colors);
  doc.addImage(incomePieChart, 'PNG', margin + 93, chartsY, 85, 60);

  // Draw monthly evolution chart
  const barChart = drawBarChart(monthlyData, colors);
  doc.addImage(barChart, 'PNG', margin, chartsY + 65, contentWidth, 50);

  // Transactions Table
  const tableData = transactions.map((t) => [
    formatDate(t.date),
    (t.description || '-').substring(0, 30),
    (t.category?.name || 'Sem categoria').substring(0, 15),
    (t.account?.name || '-').substring(0, 12),
    t.type === 'income' ? 'Receita' : 'Despesa',
    formatCurrency(t.amount),
  ]);

  autoTable(doc, {
    head: [['Data', 'Descrição', 'Categoria', 'Conta', 'Tipo', 'Valor']],
    body: tableData,
    startY: chartsY + 120,
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: colors.text,
      fillColor: colors.background,
      lineColor: colors.border,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: colors.primary,
      textColor: colors.headerText,
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: colors.cardBg,
    },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 45 },
      2: { cellWidth: 25 },
      3: { cellWidth: 22 },
      4: { cellWidth: 16 },
      5: { cellWidth: 24, halign: 'right' },
    },
    didParseCell: function(data) {
      // Color income/expense type cell
      if (data.column.index === 4 && data.section === 'body') {
        if (data.cell.raw === 'Receita') {
          data.cell.styles.textColor = colors.income;
        } else if (data.cell.raw === 'Despesa') {
          data.cell.styles.textColor = colors.expense;
        }
      }
      // Color amount based on type
      if (data.column.index === 5 && data.section === 'body') {
        const rowIndex = data.row.index;
        if (transactions[rowIndex]?.type === 'income') {
          data.cell.styles.textColor = colors.income;
        } else {
          data.cell.styles.textColor = colors.expense;
        }
      }
    },
    willDrawPage: function(data) {
      // Draw background on all NEW pages (page 2+) BEFORE content
      // Page 1 already has background from initial draw
      if (data.pageNumber > 1) {
        doc.setFillColor(colors.background[0], colors.background[1], colors.background[2]);
        doc.rect(0, 0, 210, 297, 'F');
      }
    },
    margin: { left: margin, right: margin, bottom: 20 },
  });

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer background
    doc.setFillColor(colors.cardBg[0], colors.cardBg[1], colors.cardBg[2]);
    doc.rect(0, 285, 210, 12, 'F');
    
    // Footer content
    doc.setFontSize(7);
    doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
    doc.text('Fintax Finanças - Sistema de Gestão Financeira', margin, 291);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, 291, { align: 'right' });
  }

  doc.save(`${filename}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
