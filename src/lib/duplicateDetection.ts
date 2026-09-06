import { supabase } from '@/integrations/supabase/client';
import { ParsedTransaction } from './importParsers';

export interface DuplicateCheckResult {
  transaction: ParsedTransaction;
  isDuplicate: boolean;
  existingId?: string;
  similarity?: number;
}

// Check for duplicate transactions
export async function checkDuplicates(
  transactions: ParsedTransaction[],
  accountId: string,
  userId: string
): Promise<DuplicateCheckResult[]> {
  if (transactions.length === 0) return [];

  // Get date range from transactions
  const dates = transactions.map(t => t.date);
  const minDate = dates.reduce((a, b) => a < b ? a : b);
  const maxDate = dates.reduce((a, b) => a > b ? a : b);

  // Fetch existing transactions in the date range
  const { data: existingTransactions, error } = await supabase
    .from('transactions')
    .select('id, date, amount, description, type')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .gte('date', minDate)
    .lte('date', maxDate);

  if (error) {
    console.error('Error fetching existing transactions:', error);
    return transactions.map(t => ({ transaction: t, isDuplicate: false }));
  }

  // Check each transaction for duplicates
  return transactions.map(transaction => {
    const duplicate = existingTransactions?.find(existing => {
      // Same date
      if (existing.date !== transaction.date) return false;
      
      // Same amount (with small tolerance for floating point)
      if (Math.abs(existing.amount - transaction.amount) > 0.01) return false;
      
      // Same type
      if (existing.type !== transaction.type) return false;
      
      // Similar description (using simple similarity)
      const similarity = calculateSimilarity(
        normalizeDescription(existing.description || ''),
        normalizeDescription(transaction.description)
      );
      
      return similarity >= 0.7; // 70% similarity threshold
    });

    return {
      transaction,
      isDuplicate: !!duplicate,
      existingId: duplicate?.id,
      similarity: duplicate ? 1.0 : 0,
    };
  });
}

// Normalize description for comparison
function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

// Calculate similarity between two strings (Jaccard similarity on words)
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0;

  const words1 = new Set(str1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(str2.split(' ').filter(w => w.length > 2));

  if (words1.size === 0 && words2.size === 0) return 1.0;
  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}
