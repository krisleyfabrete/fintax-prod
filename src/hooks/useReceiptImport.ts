import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { processMultipleReceipts, ReceiptData, ReceiptProgress } from '@/lib/receiptParser';

export interface ReceiptImportState {
  files: File[];
  receipts: ReceiptData[];
  selectedAccountId: string;
  isProcessing: boolean;
  currentProgress: ReceiptProgress | null;
  processedCount: number;
  totalCount: number;
}

export function useReceiptImport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [importState, setImportState] = useState<ReceiptImportState>({
    files: [],
    receipts: [],
    selectedAccountId: '',
    isProcessing: false,
    currentProgress: null,
    processedCount: 0,
    totalCount: 0,
  });

  const handleFilesSelect = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    
    setImportState(prev => ({ 
      ...prev, 
      files,
      isProcessing: true,
      processedCount: 0,
      totalCount: files.length,
    }));
    
    try {
      const receipts = await processMultipleReceipts(files, (progress, index, total) => {
        setImportState(prev => ({
          ...prev,
          currentProgress: progress,
          processedCount: progress.stage === 'done' || progress.stage === 'error' ? index + 1 : index,
          totalCount: total,
        }));
      });
      
      const successCount = receipts.filter(r => r.status === 'success').length;
      const errorCount = receipts.filter(r => r.status === 'error').length;
      
      setImportState(prev => ({
        ...prev,
        receipts,
        isProcessing: false,
        currentProgress: null,
      }));
      
      if (successCount > 0) {
        toast.success(`${successCount} comprovante(s) processado(s) com sucesso`);
      }
      if (errorCount > 0) {
        toast.warning(`${errorCount} comprovante(s) com erro`);
      }
    } catch (error) {
      toast.error('Erro ao processar arquivos');
      setImportState(prev => ({ 
        ...prev, 
        isProcessing: false,
        currentProgress: null,
      }));
    }
  }, []);

  const setSelectedAccount = (accountId: string) => {
    setImportState(prev => ({ ...prev, selectedAccountId: accountId }));
  };

  const updateReceipt = (id: string, updates: Partial<ReceiptData>) => {
    setImportState(prev => ({
      ...prev,
      receipts: prev.receipts.map(r => 
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
  };

  const removeReceipt = (id: string) => {
    setImportState(prev => ({
      ...prev,
      receipts: prev.receipts.filter(r => r.id !== id),
    }));
  };

  const importReceipts = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      if (!importState.selectedAccountId) throw new Error('Selecione uma conta');
      
      const validReceipts = importState.receipts.filter(
        r => r.status === 'success' && r.amount > 0
      );
      
      if (validReceipts.length === 0) {
        throw new Error('Nenhum comprovante válido para importar');
      }
      
      const transactionsToInsert = validReceipts.map(r => ({
        user_id: user.id,
        account_id: importState.selectedAccountId,
        date: r.date,
        description: r.description,
        amount: r.amount,
        type: r.type,
        category_id: r.categoryId || null,
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
      toast.success(`${data.length} transação(ões) importada(s) com sucesso!`);
      resetImport();
    },
    onError: (error) => {
      toast.error('Erro ao importar: ' + error.message);
    },
  });

  const resetImport = () => {
    setImportState({
      files: [],
      receipts: [],
      selectedAccountId: '',
      isProcessing: false,
      currentProgress: null,
      processedCount: 0,
      totalCount: 0,
    });
  };

  return {
    importState,
    handleFilesSelect,
    setSelectedAccount,
    updateReceipt,
    removeReceipt,
    importReceipts,
    resetImport,
    isImporting: importReceipts.isPending,
  };
}
