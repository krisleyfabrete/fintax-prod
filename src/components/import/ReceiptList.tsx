import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Edit2,
  FileText,
  ZoomIn,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ReceiptData } from '@/lib/receiptParser';

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
}

interface ReceiptListProps {
  receipts: ReceiptData[];
  categories: Category[];
  onUpdate: (id: string, updates: Partial<ReceiptData>) => void;
  onRemove: (id: string) => void;
}

export function ReceiptList({ receipts, categories, onUpdate, onRemove }: ReceiptListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const successCount = receipts.filter(r => r.status === 'success').length;
  const errorCount = receipts.filter(r => r.status === 'error').length;
  const lowConfidenceCount = receipts.filter(r => r.status === 'success' && r.confidence < 40).length;
  const totalAmount = receipts
    .filter(r => r.status === 'success')
    .reduce((acc, r) => acc + (r.type === 'income' ? r.amount : -r.amount), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 70) {
      return <Badge variant="default" className="bg-green-500">Alta</Badge>;
    }
    if (confidence >= 40) {
      return <Badge variant="secondary">Média</Badge>;
    }
    return <Badge variant="destructive">Baixa</Badge>;
  };

  // Filter categories by transaction type
  const getCategoriesForType = (type: 'income' | 'expense') => {
    return categories.filter(c => c.type === type);
  };

  const getCategoryById = (id: string) => {
    return categories.find(c => c.id === id);
  };

  return (
    <>
      {/* Low Confidence Alert */}
      {lowConfidenceCount > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Revisão necessária</AlertTitle>
          <AlertDescription>
            {lowConfidenceCount} comprovante{lowConfidenceCount > 1 ? 's' : ''} com baixa confiança de leitura. 
            Revise os dados marcados em vermelho e corrija manualmente se necessário.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Comprovantes Processados</CardTitle>
            <div className="flex items-center gap-2">
              {successCount > 0 && (
                <Badge variant="outline" className="gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  {successCount}
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="outline" className="gap-1">
                  <AlertCircle className="h-3 w-3 text-destructive" />
                  {errorCount}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Balanço: <span className={totalAmount >= 0 ? 'text-green-500' : 'text-destructive'}>
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
          {receipts.map((receipt) => {
            const selectedCategory = receipt.categoryId ? getCategoryById(receipt.categoryId) : null;
            
            return (
              <div 
                key={receipt.id}
                className={`p-4 rounded-lg border ${
                  receipt.status === 'error' 
                    ? 'border-destructive/50 bg-destructive/5' 
                    : 'border-border bg-muted/30'
                }`}
              >
                <div className="flex gap-4">
                  {/* Preview Thumbnail */}
                  <div className="flex-shrink-0">
                    {receipt.previewUrl ? (
                      <button
                        onClick={() => setPreviewImage(receipt.previewUrl!)}
                        className="relative w-20 h-20 rounded-lg overflow-hidden border bg-muted hover:ring-2 hover:ring-primary transition-all group"
                      >
                        <img 
                          src={receipt.previewUrl} 
                          alt={receipt.fileName}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ZoomIn className="h-5 w-5 text-white" />
                        </div>
                      </button>
                    ) : (
                      <div className="w-20 h-20 rounded-lg border bg-muted flex items-center justify-center">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Type Toggle Buttons & Amount */}
                    <div className="flex items-center gap-2 mb-2">
                      {/* Type Toggle Buttons */}
                      <div className="flex rounded-lg border overflow-hidden">
                        <button
                          onClick={() => onUpdate(receipt.id, { type: 'income', categoryId: undefined })}
                          className={`px-2 py-1 text-xs font-medium flex items-center gap-1 transition-colors ${
                            receipt.type === 'income'
                              ? 'bg-green-500 text-white'
                              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                          }`}
                        >
                          <ArrowDownCircle className="h-3 w-3" />
                          Entrada
                        </button>
                        <button
                          onClick={() => onUpdate(receipt.id, { type: 'expense', categoryId: undefined })}
                          className={`px-2 py-1 text-xs font-medium flex items-center gap-1 transition-colors ${
                            receipt.type === 'expense'
                              ? 'bg-red-500 text-white'
                              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                          }`}
                        >
                          <ArrowUpCircle className="h-3 w-3" />
                          Saída
                        </button>
                      </div>
                      
                      <span className="text-xs text-muted-foreground truncate flex-1">
                        {receipt.fileName}
                      </span>
                      <span className={`font-semibold ${
                        receipt.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {receipt.type === 'income' ? '+' : '-'} {formatCurrency(receipt.amount)}
                      </span>
                    </div>
                    
                    {editingId === receipt.id ? (
                      <div className="space-y-2">
                        <Input
                          value={receipt.description}
                          onChange={(e) => onUpdate(receipt.id, { description: e.target.value })}
                          placeholder="Descrição"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            value={receipt.amount}
                            onChange={(e) => onUpdate(receipt.id, { amount: parseFloat(e.target.value) || 0 })}
                            placeholder="Valor"
                          />
                          <Input
                            type="date"
                            value={receipt.date}
                            onChange={(e) => onUpdate(receipt.id, { date: e.target.value })}
                          />
                        </div>
                        <Select
                          value={receipt.categoryId || ''}
                          onValueChange={(value) => onUpdate(receipt.id, { categoryId: value || undefined })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {getCategoriesForType(receipt.type).map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: cat.color }}
                                  />
                                  {cat.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          size="sm" 
                          onClick={() => setEditingId(null)}
                        >
                          Salvar
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium">{receipt.description}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span>{format(new Date(receipt.date), "dd/MM/yyyy", { locale: ptBR })}</span>
                          <span>•</span>
                          <Badge variant="outline" className="text-xs">
                            {receipt.transactionType}
                          </Badge>
                          {selectedCategory && (
                            <Badge 
                              variant="secondary" 
                              className="text-xs gap-1"
                              style={{ 
                                backgroundColor: `${selectedCategory.color}20`,
                                color: selectedCategory.color,
                                borderColor: selectedCategory.color
                              }}
                            >
                              {selectedCategory.name}
                            </Badge>
                          )}
                          {!selectedCategory && receipt.status === 'success' && (
                            <Select
                              value={receipt.categoryId || ''}
                              onValueChange={(value) => onUpdate(receipt.id, { categoryId: value || undefined })}
                            >
                              <SelectTrigger className="h-6 text-xs w-auto min-w-[120px]">
                                <SelectValue placeholder="+ Categoria" />
                              </SelectTrigger>
                              <SelectContent>
                                {getCategoriesForType(receipt.type).map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: cat.color }}
                                      />
                                      {cat.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {receipt.status === 'success' && getConfidenceBadge(receipt.confidence)}
                        </div>
                      </>
                    )}
                    
                    {receipt.error && (
                      <p className="text-xs text-destructive mt-1">{receipt.error}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setEditingId(editingId === receipt.id ? null : receipt.id)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onRemove(receipt.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview do Comprovante</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex items-center justify-center max-h-[70vh] overflow-auto">
              <img 
                src={previewImage} 
                alt="Preview do comprovante"
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
