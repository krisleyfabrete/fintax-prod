import { ParsedTransaction } from './importParsers';

export type BankName = 
  | 'nubank' 
  | 'itau' 
  | 'bradesco' 
  | 'pan' 
  | 'santander' 
  | 'caixa' 
  | 'bb' 
  | 'inter' 
  | 'c6' 
  | 'generic';

interface BankParser {
  name: string;
  detect: (text: string) => boolean;
  parse: (text: string) => ParsedTransaction[];
}

// Detect which bank the statement is from
export function detectBank(text: string): BankName {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('nubank') || lowerText.includes('nu pagamentos')) {
    return 'nubank';
  }
  if (lowerText.includes('itaú') || lowerText.includes('itau') || lowerText.includes('iti ')) {
    return 'itau';
  }
  if (lowerText.includes('bradesco')) {
    return 'bradesco';
  }
  if (lowerText.includes('banco pan') || lowerText.includes('bancopan')) {
    return 'pan';
  }
  if (lowerText.includes('santander')) {
    return 'santander';
  }
  if (lowerText.includes('caixa econômica') || lowerText.includes('caixa economica') || lowerText.includes('cef ')) {
    return 'caixa';
  }
  if (lowerText.includes('banco do brasil') || lowerText.includes('bb ') || lowerText.includes(' bb.')) {
    return 'bb';
  }
  if (lowerText.includes('banco inter') || lowerText.includes('inter ')) {
    return 'inter';
  }
  if (lowerText.includes('c6 bank') || lowerText.includes('c6bank')) {
    return 'c6';
  }
  
  return 'generic';
}

// Nubank parser
function parseNubank(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Nubank pattern: DD MMM YYYY Description Value
  // Example: "02 DEZ 2024 Pix Enviado - João 150,00"
  const patterns = [
    // DD MMM YYYY format
    /(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})\s+(.+?)\s+([\d.,]+)$/gim,
    // DD/MM format with description and value
    /(\d{2})\/(\d{2})\s+(.+?)\s+R?\$?\s*([\d.,]+)/gi,
  ];
  
  const monthMap: Record<string, string> = {
    'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04',
    'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
    'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12',
  };
  
  let match;
  
  // Try first pattern (DD MMM YYYY)
  while ((match = patterns[0].exec(text)) !== null) {
    const day = match[1];
    const month = monthMap[match[2].toUpperCase()];
    const year = match[3];
    const description = match[4].trim();
    const amountStr = match[5];
    
    if (!month) continue;
    
    const amount = parseAmount(amountStr);
    if (amount === 0) continue;
    
    // Skip header-like content
    if (description.length < 3 || /^(data|valor|descri)/i.test(description)) continue;
    
    // Nubank: negative indicators in description
    const isExpense = /pix enviado|transferência enviada|compra|pagamento|débito/i.test(description);
    
    transactions.push({
      date: `${year}-${month}-${day}`,
      description,
      amount: Math.abs(amount),
      type: isExpense ? 'expense' : 'income',
    });
  }
  
  return transactions;
}

// Itaú parser
function parseItau(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Itaú pattern: DD/MM Description Value D/C
  const pattern = /(\d{2}\/\d{2})\s+(.+?)\s+([\d.,]+)\s*([DC])?/gi;
  
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const dateStr = match[1];
    const description = match[2].trim();
    const amountStr = match[3];
    const indicator = match[4];
    
    const date = parseDateShort(dateStr);
    if (!date) continue;
    
    const amount = parseAmount(amountStr);
    if (amount === 0) continue;
    
    // Skip headers
    if (description.length < 3 || /^(data|lançamento|valor|saldo)/i.test(description)) continue;
    
    let type: 'income' | 'expense' = 'expense';
    if (indicator) {
      type = indicator.toUpperCase() === 'C' ? 'income' : 'expense';
    }
    
    transactions.push({
      date,
      description,
      amount: Math.abs(amount),
      type,
    });
  }
  
  return transactions;
}

// Bradesco parser
function parseBradesco(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Bradesco pattern: DD/MM/YYYY Description Value
  const pattern = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d.,]+)\s*([+-])?/gi;
  
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const dateStr = match[1];
    const description = match[2].trim();
    const amountStr = match[3];
    const indicator = match[4];
    
    const date = parseDateFull(dateStr);
    if (!date) continue;
    
    const amount = parseAmount(amountStr);
    if (amount === 0) continue;
    
    // Skip headers
    if (description.length < 3 || /^(data|histórico|valor|saldo)/i.test(description)) continue;
    
    let type: 'income' | 'expense' = 'expense';
    if (indicator === '+' || /depósito|crédito|transferência recebida/i.test(description)) {
      type = 'income';
    }
    
    transactions.push({
      date,
      description,
      amount: Math.abs(amount),
      type,
    });
  }
  
  return transactions;
}

// Banco Pan parser
function parsePan(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Pan pattern: DD/MM Description Value
  const pattern = /(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.+?)\s+R?\$?\s*([\d.,]+)/gi;
  
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const dateStr = match[1];
    const description = match[2].trim();
    const amountStr = match[3];
    
    const date = dateStr.includes('/') && dateStr.length > 5 
      ? parseDateFull(dateStr) 
      : parseDateShort(dateStr);
    if (!date) continue;
    
    const amount = parseAmount(amountStr);
    if (amount === 0) continue;
    
    // Skip headers
    if (description.length < 3 || /^(data|descri|valor|saldo)/i.test(description)) continue;
    
    // Determine type based on description
    const isIncome = /crédito|depósito|transferência recebida|pix recebido/i.test(description);
    
    transactions.push({
      date,
      description,
      amount: Math.abs(amount),
      type: isIncome ? 'income' : 'expense',
    });
  }
  
  return transactions;
}

// Santander parser
function parseSantander(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Santander pattern: DD/MM Description Value C/D
  const pattern = /(\d{2}\/\d{2}(?:\/\d{4})?)\s+(.+?)\s+([\d.,]+)\s*([CD])?/gi;
  
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const dateStr = match[1];
    const description = match[2].trim();
    const amountStr = match[3];
    const indicator = match[4];
    
    const date = dateStr.length > 5 ? parseDateFull(dateStr) : parseDateShort(dateStr);
    if (!date) continue;
    
    const amount = parseAmount(amountStr);
    if (amount === 0) continue;
    
    if (description.length < 3 || /^(data|descri|valor|saldo)/i.test(description)) continue;
    
    let type: 'income' | 'expense' = 'expense';
    if (indicator?.toUpperCase() === 'C') {
      type = 'income';
    }
    
    transactions.push({
      date,
      description,
      amount: Math.abs(amount),
      type,
    });
  }
  
  return transactions;
}

// Caixa parser
function parseCaixa(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Caixa pattern: DD/MM/YYYY Description Value C/D
  const pattern = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d.,]+)\s*([CD])?/gi;
  
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const dateStr = match[1];
    const description = match[2].trim();
    const amountStr = match[3];
    const indicator = match[4];
    
    const date = parseDateFull(dateStr);
    if (!date) continue;
    
    const amount = parseAmount(amountStr);
    if (amount === 0) continue;
    
    if (description.length < 3 || /^(data|descri|valor|saldo)/i.test(description)) continue;
    
    let type: 'income' | 'expense' = 'expense';
    if (indicator?.toUpperCase() === 'C') {
      type = 'income';
    }
    
    transactions.push({
      date,
      description,
      amount: Math.abs(amount),
      type,
    });
  }
  
  return transactions;
}

// Banco do Brasil parser
function parseBB(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // BB pattern: DD/MM/YYYY Description Value
  const pattern = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d.,]+)\s*([+-])?/gi;
  
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const dateStr = match[1];
    const description = match[2].trim();
    const amountStr = match[3];
    const indicator = match[4];
    
    const date = parseDateFull(dateStr);
    if (!date) continue;
    
    const amount = parseAmount(amountStr);
    if (amount === 0) continue;
    
    if (description.length < 3 || /^(data|descri|valor|saldo)/i.test(description)) continue;
    
    let type: 'income' | 'expense' = 'expense';
    if (indicator === '+' || /crédito|depósito|transferência recebida/i.test(description)) {
      type = 'income';
    }
    
    transactions.push({
      date,
      description,
      amount: Math.abs(amount),
      type,
    });
  }
  
  return transactions;
}

// Inter parser
function parseInter(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Inter pattern similar to Nubank
  const pattern = /(\d{2}\/\d{2}(?:\/\d{4})?)\s+(.+?)\s+R?\$?\s*([\d.,]+)/gi;
  
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const dateStr = match[1];
    const description = match[2].trim();
    const amountStr = match[3];
    
    const date = dateStr.length > 5 ? parseDateFull(dateStr) : parseDateShort(dateStr);
    if (!date) continue;
    
    const amount = parseAmount(amountStr);
    if (amount === 0) continue;
    
    if (description.length < 3 || /^(data|descri|valor|saldo)/i.test(description)) continue;
    
    // Determine type based on keywords
    const isIncome = /recebido|crédito|depósito|cashback/i.test(description);
    
    transactions.push({
      date,
      description,
      amount: Math.abs(amount),
      type: isIncome ? 'income' : 'expense',
    });
  }
  
  return transactions;
}

// C6 Bank parser
function parseC6(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // C6 pattern
  const pattern = /(\d{2}\/\d{2}(?:\/\d{4})?)\s+(.+?)\s+R?\$?\s*([\d.,]+)/gi;
  
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const dateStr = match[1];
    const description = match[2].trim();
    const amountStr = match[3];
    
    const date = dateStr.length > 5 ? parseDateFull(dateStr) : parseDateShort(dateStr);
    if (!date) continue;
    
    const amount = parseAmount(amountStr);
    if (amount === 0) continue;
    
    if (description.length < 3 || /^(data|descri|valor|saldo)/i.test(description)) continue;
    
    const isIncome = /recebido|crédito|depósito/i.test(description);
    
    transactions.push({
      date,
      description,
      amount: Math.abs(amount),
      type: isIncome ? 'income' : 'expense',
    });
  }
  
  return transactions;
}

// Generic parser (fallback)
function parseGeneric(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Try multiple patterns
  const patterns = [
    // DD/MM/YYYY Description Value
    /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d.,]+)\s*([DC+-])?/gi,
    // DD/MM Description Value
    /(\d{2}\/\d{2})\s+(.+?)\s+([\d.,]+)\s*([DC+-])?/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const dateStr = match[1];
      const description = match[2].trim();
      const amountStr = match[3];
      const indicator = match[4];
      
      const date = dateStr.length > 5 ? parseDateFull(dateStr) : parseDateShort(dateStr);
      if (!date) continue;
      
      const amount = parseAmount(amountStr);
      if (amount === 0) continue;
      
      if (description.length < 3 || /^(data|descri|valor|saldo|total)/i.test(description)) continue;
      
      let type: 'income' | 'expense' = 'expense';
      if (indicator === 'C' || indicator === '+') {
        type = 'income';
      }
      
      transactions.push({
        date,
        description,
        amount: Math.abs(amount),
        type,
      });
    }
    
    if (transactions.length > 0) break;
  }
  
  return transactions;
}

// Main parse function that detects bank and uses appropriate parser
export function parseWithBankDetection(text: string): { 
  transactions: ParsedTransaction[]; 
  detectedBank: BankName;
} {
  const bank = detectBank(text);
  let transactions: ParsedTransaction[] = [];
  
  switch (bank) {
    case 'nubank':
      transactions = parseNubank(text);
      break;
    case 'itau':
      transactions = parseItau(text);
      break;
    case 'bradesco':
      transactions = parseBradesco(text);
      break;
    case 'pan':
      transactions = parsePan(text);
      break;
    case 'santander':
      transactions = parseSantander(text);
      break;
    case 'caixa':
      transactions = parseCaixa(text);
      break;
    case 'bb':
      transactions = parseBB(text);
      break;
    case 'inter':
      transactions = parseInter(text);
      break;
    case 'c6':
      transactions = parseC6(text);
      break;
    default:
      transactions = parseGeneric(text);
  }
  
  // If specific parser failed, try generic
  if (transactions.length === 0 && bank !== 'generic') {
    transactions = parseGeneric(text);
  }
  
  return { transactions, detectedBank: bank };
}

// Utility functions
function parseDateFull(dateStr: string): string {
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  // Try DD/MM/YY format
  const matchShortYear = dateStr.match(/(\d{2})\/(\d{2})\/(\d{2})/);
  if (matchShortYear) {
    const year = parseInt(matchShortYear[3]) > 50 ? `19${matchShortYear[3]}` : `20${matchShortYear[3]}`;
    return `${year}-${matchShortYear[2]}-${matchShortYear[1]}`;
  }
  return '';
}

function parseDateShort(dateStr: string): string {
  const match = dateStr.match(/(\d{2})\/(\d{2})/);
  if (match) {
    const year = new Date().getFullYear();
    return `${year}-${match[2]}-${match[1]}`;
  }
  return '';
}

function parseAmount(amountStr: string): number {
  let cleaned = amountStr.replace(/[R$\s]/g, '').trim();
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  return parseFloat(cleaned) || 0;
}

// Get bank display name
export function getBankDisplayName(bank: BankName): string {
  const names: Record<BankName, string> = {
    nubank: 'Nubank',
    itau: 'Itaú',
    bradesco: 'Bradesco',
    pan: 'Banco Pan',
    santander: 'Santander',
    caixa: 'Caixa Econômica',
    bb: 'Banco do Brasil',
    inter: 'Banco Inter',
    c6: 'C6 Bank',
    generic: 'Banco não identificado',
  };
  return names[bank];
}
