import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  parseOFX, 
  parseCSV, 
  detectFileType, 
  detectCSVDelimiter,
  ParsedTransaction 
} from '@/lib/importParsers';
import { parsePDF, PDFParseProgress, getBankDisplayName } from '@/lib/pdfParser';
import { BankName } from '@/lib/bankParsers';
import { suggestCategory, findCategoryIdByName } from '@/lib/categorySuggestion';
import { checkDuplicates, DuplicateCheckResult } from '@/lib/duplicateDetection';

export interface ImportState {
  file: File | null;
  parsedTransactions: ParsedTransaction[];
  selectedAccountId: string;
  mappedTransactions: MappedTransaction[];
  isProcessing: boolean;
  pdfProgress: PDFParseProgress | null;
  detectedBank: BankName | null;
}

export interface MappedTransaction extends ParsedTransaction {
  selected: boolean;
  categoryId?: string;
  suggestedCategory?: string;
  isDuplicate?: boolean;
  duplicateId?: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

export function useImport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [importState, setImportState] = useState<ImportState>({
    file: null,
    parsedTransactions: [],
    selectedAccountId: '',
    mappedTransactions: [],
    isProcessing: false,
    pdfProgress: null,
    detectedBank: null,
  });
  const [categories, setCategories] = useState<Category[]>([]);

  // Fetch categories for auto-suggestion
  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name, type');
    if (data) {
      setCategories(data);
    }
    return data || [];
  }, []);

  const parseFile = async (file: File): Promise<{ 
    transactions: ParsedTransaction[]; 
    detectedBank: BankName | null;
  }> => {
    const extension = file.name.toLowerCase().split('.').pop();
    
    // Handle PDF separately (needs ArrayBuffer, not text)
    if (extension === 'pdf') {
      const result = await parsePDF(file, (progress) => {
        setImportState(prev => ({ ...prev, pdfProgress: progress }));
      });
      return {
        transactions: result.transactions,
        detectedBank: result.detectedBank,
      };
    }
    
    // Handle text-based files (OFX, CSV)
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const fileType = detectFileType(content, file.name);
          
          let transactions: ParsedTransaction[] = [];
          
          if (fileType === 'ofx') {
            transactions = parseOFX(content);
          } else if (fileType === 'csv') {
            const delimiter = detectCSVDelimiter(content);
            transactions = parseCSV(content, delimiter);
          } else {
            throw new Error('Formato de arquivo não suportado');
          }
          
          resolve({ transactions, detectedBank: null });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsText(file, 'UTF-8');
    });
  };

  // Apply category suggestions to transactions
  const applyCategorySuggestions = (
    transactions: ParsedTransaction[],
    categoryList: Category[]
  ): MappedTransaction[] => {
    return transactions.map(t => {
      const suggestion = suggestCategory(t.description, t.type);
      let categoryId: string | undefined;
      let suggestedCategory: string | undefined;
      
      if (suggestion) {
        suggestedCategory = suggestion.categoryName;
        const foundId = findCategoryIdByName(suggestion.categoryName, categoryList, t.type);
        if (foundId) {
          categoryId = foundId;
        }
      }
      
      return {
        ...t,
        selected: true,
        categoryId,
        suggestedCategory,
      };
    });
  };

  // Check for duplicates and update transactions
  const applyDuplicateCheck = async (
    transactions: MappedTransaction[],
    accountId: string
  ): Promise<MappedTransaction[]> => {
    if (!user || !accountId) return transactions;
    
    const duplicateResults = await checkDuplicates(
      transactions,
      accountId,
      user.id
    );
    
    return transactions.map((t, index) => {
      const result = duplicateResults[index];
      return {
        ...t,
        isDuplicate: result?.isDuplicate || false,
        duplicateId: result?.existingId,
        // Deselect duplicates by default
        selected: result?.isDuplicate ? false : t.selected,
      };
    });
  };

  const handleFileSelect = async (file: File) => {
    setImportState(prev => ({ ...prev, isProcessing: true, pdfProgress: null }));
    
    try {
      // Fetch categories first
      const categoryList = await fetchCategories();
      
      // Parse file
      const { transactions, detectedBank } = await parseFile(file);
      
      if (transactions.length === 0) {
        toast.error('Nenhuma transação encontrada no arquivo');
        setImportState(prev => ({ ...prev, isProcessing: false, pdfProgress: null }));
        return;
      }
      
      // Apply category suggestions
      const mappedTransactions = applyCategorySuggestions(transactions, categoryList);
      
      setImportState({
        file,
        parsedTransactions: transactions,
        selectedAccountId: '',
        mappedTransactions,
        isProcessing: false,
        pdfProgress: null,
        detectedBank,
      });
      
      // Show success message with bank detection info
      let message = `${transactions.length} transações encontradas`;
      if (detectedBank && detectedBank !== 'generic') {
        message += ` (${getBankDisplayName(detectedBank)})`;
      }
      toast.success(message);
    } catch (error) {
      toast.error('Erro ao processar arquivo: ' + (error as Error).message);
      setImportState(prev => ({ ...prev, isProcessing: false, pdfProgress: null }));
    }
  };

  const setSelectedAccount = async (accountId: string) => {
    setImportState(prev => ({ ...prev, selectedAccountId: accountId, isProcessing: true }));
    
    try {
      // Check for duplicates when account is selected
      const updatedTransactions = await applyDuplicateCheck(
        importState.mappedTransactions,
        accountId
      );
      
      const duplicateCount = updatedTransactions.filter(t => t.isDuplicate).length;
      
      setImportState(prev => ({ 
        ...prev, 
        selectedAccountId: accountId,
        mappedTransactions: updatedTransactions,
        isProcessing: false,
      }));
      
      if (duplicateCount > 0) {
        toast.warning(`${duplicateCount} transações duplicadas encontradas e desmarcadas`);
      }
    } catch (error) {
      setImportState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const toggleTransaction = (index: number) => {
    setImportState(prev => ({
      ...prev,
      mappedTransactions: prev.mappedTransactions.map((t, i) => 
        i === index ? { ...t, selected: !t.selected } : t
      ),
    }));
  };

  const toggleAll = (selected: boolean) => {
    setImportState(prev => ({
      ...prev,
      mappedTransactions: prev.mappedTransactions.map(t => ({ 
        ...t, 
        selected: t.isDuplicate ? false : selected // Keep duplicates unselected
      })),
    }));
  };

  const setCategoryForTransaction = (index: number, categoryId: string) => {
    setImportState(prev => ({
      ...prev,
      mappedTransactions: prev.mappedTransactions.map((t, i) => 
        i === index ? { ...t, categoryId } : t
      ),
    }));
  };

  const importTransactions = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      if (!importState.selectedAccountId) throw new Error('Selecione uma conta');
      
      const selectedTransactions = importState.mappedTransactions.filter(t => t.selected);
      
      if (selectedTransactions.length === 0) {
        throw new Error('Nenhuma transação selecionada');
      }
      
      const transactionsToInsert = selectedTransactions.map(t => ({
        user_id: user.id,
        account_id: importState.selectedAccountId,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category_id: t.categoryId || null,
        status: 'confirmed' as const,
      }));
      
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionsToInsert)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`${data.length} transações importadas com sucesso!`);
      resetImport();
    },
    onError: (error) => {
      toast.error('Erro ao importar: ' + error.message);
    },
  });

  const resetImport = () => {
    setImportState({
      file: null,
      parsedTransactions: [],
      selectedAccountId: '',
      mappedTransactions: [],
      isProcessing: false,
      pdfProgress: null,
      detectedBank: null,
    });
  };

  return {
    importState,
    handleFileSelect,
    setSelectedAccount,
    toggleTransaction,
    toggleAll,
    setCategoryForTransaction,
    importTransactions,
    resetImport,
    isImporting: importTransactions.isPending,
  };
}
