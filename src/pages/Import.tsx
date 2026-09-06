import { useEffect } from 'react';
import { Check, Loader2, Receipt } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiFileUploader } from '@/components/import/MultiFileUploader';
import { ReceiptProcessingProgress } from '@/components/import/ReceiptProcessingProgress';
import { ReceiptList } from '@/components/import/ReceiptList';
import { useReceiptImport } from '@/hooks/useReceiptImport';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import { useUpgradeModal } from '@/components/subscription/UpgradeModal';

export default function Import() {
  const { canAccess } = useSubscription();
  const { showUpgradeModal } = useUpgradeModal();
  const canImportStatements = canAccess('canImportStatements');

  // Show upgrade modal when user lands on blocked feature
  useEffect(() => {
    if (!canImportStatements) {
      showUpgradeModal('import');
    }
  }, [canImportStatements, showUpgradeModal]);

  const {
    importState,
    handleFilesSelect,
    setSelectedAccount,
    updateReceipt,
    removeReceipt,
    importReceipts,
    resetImport,
    isImporting,
  } = useReceiptImport();

  const { accounts } = useAccounts();
  const { categories } = useCategories();

  const hasReceipts = importState.receipts.length > 0;
  const validReceiptsCount = importState.receipts.filter(
    r => r.status === 'success' && r.amount > 0
  ).length;
  const canImport = hasReceipts && importState.selectedAccountId && validReceiptsCount > 0;

  if (!canImportStatements) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Receipt className="h-8 w-8" />
              Importar Comprovantes
            </h1>
            <p className="text-muted-foreground">
              Importe comprovantes de transações automaticamente
            </p>
          </div>
          <UpgradePrompt
            feature="Importação de Comprovantes"
            description="Importe comprovantes de PIX, TED, boletos e extratos bancários com reconhecimento automático via OCR."
            requiredPlan="pro"
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Receipt className="h-8 w-8" />
              Importar Comprovantes
            </h1>
            <p className="text-muted-foreground">
              Importe comprovantes de transações (PIX, TED, boletos, etc)
            </p>
          </div>
          {hasReceipts && (
            <Button variant="outline" onClick={resetImport}>
              Nova Importação
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            {/* File Upload */}
            {!hasReceipts && !importState.isProcessing && (
              <MultiFileUploader
                onFilesSelect={handleFilesSelect}
                maxFiles={20}
              />
            )}

            {/* Processing Progress */}
            {importState.isProcessing && importState.currentProgress && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Processando Comprovantes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReceiptProcessingProgress 
                    progress={importState.currentProgress}
                    processedCount={importState.processedCount}
                    totalCount={importState.totalCount}
                  />
                </CardContent>
              </Card>
            )}

            {/* Receipts List */}
            {hasReceipts && (
              <ReceiptList
                receipts={importState.receipts}
                categories={categories}
                onUpdate={updateReceipt}
                onRemove={removeReceipt}
              />
            )}
          </div>

          {/* Import Settings */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configurações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Conta de destino</label>
                  <Select
                    value={importState.selectedAccountId}
                    onValueChange={setSelectedAccount}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: account.color || '#8B5CF6' }}
                            />
                            {account.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full"
                  disabled={!canImport || isImporting}
                  onClick={() => importReceipts.mutate()}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Importar {validReceiptsCount} Transação(ões)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Instruções</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <div>
                  <p className="font-medium text-foreground">Comprovantes suportados</p>
                  <p>PIX, TED, DOC, boletos e compras com cartão.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Formatos aceitos</p>
                  <p>PDF ou imagens (JPG, PNG, WebP).</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Upload múltiplo</p>
                  <p>Arraste até 20 arquivos de uma vez.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Dica</p>
                  <p>Revise os valores extraídos antes de importar. Você pode editar manualmente.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
