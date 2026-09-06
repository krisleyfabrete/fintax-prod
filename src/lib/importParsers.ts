import { format } from 'date-fns';

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

// Parse OFX file
export function parseOFX(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Extract transactions between <STMTTRN> tags
  const transactionRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;
  
  while ((match = transactionRegex.exec(content)) !== null) {
    const transactionBlock = match[1];
    
    // Extract date (DTPOSTED)
    const dateMatch = transactionBlock.match(/<DTPOSTED>(\d{8})/);
    // Extract amount (TRNAMT)
    const amountMatch = transactionBlock.match(/<TRNAMT>([+-]?\d+\.?\d*)/);
    // Extract description (MEMO or NAME)
    const memoMatch = transactionBlock.match(/<MEMO>([^<]+)/);
    const nameMatch = transactionBlock.match(/<NAME>([^<]+)/);
    
    if (dateMatch && amountMatch) {
      const dateStr = dateMatch[1];
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const date = `${year}-${month}-${day}`;
      
      const amount = parseFloat(amountMatch[1]);
      const description = (memoMatch?.[1] || nameMatch?.[1] || 'Transação importada').trim();
      
      transactions.push({
        date,
        description,
        amount: Math.abs(amount),
        type: amount >= 0 ? 'income' : 'expense',
      });
    }
  }
  
  return transactions;
}

// Parse CSV file with common formats
export function parseCSV(content: string, delimiter: string = ','): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = content.trim().split('\n');
  
  if (lines.length < 2) return transactions;
  
  // Try to detect header
  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(delimiter).map(h => h.trim().replace(/"/g, ''));
  
  // Find column indexes
  const dateIndex = headers.findIndex(h => 
    h.includes('data') || h.includes('date') || h.includes('dt')
  );
  const descriptionIndex = headers.findIndex(h => 
    h.includes('descri') || h.includes('historico') || h.includes('memo') || h.includes('description')
  );
  const amountIndex = headers.findIndex(h => 
    h.includes('valor') || h.includes('amount') || h.includes('value') || h.includes('quantia')
  );
  const creditIndex = headers.findIndex(h => 
    h.includes('credito') || h.includes('credit') || h.includes('entrada')
  );
  const debitIndex = headers.findIndex(h => 
    h.includes('debito') || h.includes('debit') || h.includes('saida')
  );
  
  // Process data lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line, delimiter);
    
    let date = '';
    let description = '';
    let amount = 0;
    let type: 'income' | 'expense' = 'expense';
    
    // Parse date
    if (dateIndex >= 0 && values[dateIndex]) {
      date = parseDate(values[dateIndex]);
    }
    
    // Parse description
    if (descriptionIndex >= 0 && values[descriptionIndex]) {
      description = values[descriptionIndex].replace(/"/g, '').trim();
    }
    
    // Parse amount
    if (creditIndex >= 0 && debitIndex >= 0) {
      // Separate credit/debit columns
      const credit = parseNumber(values[creditIndex] || '0');
      const debit = parseNumber(values[debitIndex] || '0');
      
      if (credit > 0) {
        amount = credit;
        type = 'income';
      } else if (debit > 0) {
        amount = debit;
        type = 'expense';
      }
    } else if (amountIndex >= 0) {
      // Single amount column (positive = income, negative = expense)
      const rawAmount = parseNumber(values[amountIndex] || '0');
      amount = Math.abs(rawAmount);
      type = rawAmount >= 0 ? 'income' : 'expense';
    }
    
    if (date && amount > 0) {
      transactions.push({
        date,
        description: description || 'Transação importada',
        amount,
        type,
      });
    }
  }
  
  return transactions;
}

// Helper to parse CSV line respecting quotes
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Parse date from various formats
function parseDate(dateStr: string): string {
  const cleaned = dateStr.replace(/"/g, '').trim();
  
  // Try DD/MM/YYYY or DD-MM-YYYY
  const brMatch = cleaned.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return `${year}-${month}-${day}`;
  }
  
  // Try YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = cleaned.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Try DDMMYYYY
  const compactMatch = cleaned.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (compactMatch) {
    return `${compactMatch[3]}-${compactMatch[2]}-${compactMatch[1]}`;
  }
  
  return '';
}

// Parse number from BR or US format
function parseNumber(numStr: string): number {
  const cleaned = numStr.replace(/"/g, '').trim();
  
  // Brazilian format: 1.234,56 or 1234,56
  if (cleaned.includes(',') && (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.') || !cleaned.includes('.'))) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }
  
  // US format: 1,234.56 or 1234.56
  return parseFloat(cleaned.replace(/,/g, '')) || 0;
}

// Detect file type from content or extension
export function detectFileType(content: string, fileName: string): 'ofx' | 'csv' | 'pdf' | 'unknown' {
  const extension = fileName.toLowerCase().split('.').pop();
  
  if (extension === 'ofx' || extension === 'qfx') return 'ofx';
  if (extension === 'csv') return 'csv';
  if (extension === 'pdf') return 'pdf';
  
  // Try to detect from content
  if (content.includes('<OFX>') || content.includes('<ofx>')) return 'ofx';
  if (content.includes(',') || content.includes(';')) return 'csv';
  
  return 'unknown';
}

// Detect CSV delimiter
export function detectCSVDelimiter(content: string): string {
  const firstLine = content.split('\n')[0];
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  
  return semicolonCount > commaCount ? ';' : ',';
}
