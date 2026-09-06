import { Progress } from '@/components/ui/progress';
import { ReceiptProgress } from '@/lib/receiptParser';
import { Loader2, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface ReceiptProcessingProgressProps {
  progress: ReceiptProgress;
  processedCount: number;
  totalCount: number;
}

export function ReceiptProcessingProgress({ 
  progress, 
  processedCount, 
  totalCount 
}: ReceiptProcessingProgressProps) {
  const getStageIcon = () => {
    switch (progress.stage) {
      case 'loading':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case 'extracting':
        return <FileText className="h-5 w-5 text-primary animate-pulse" />;
      case 'parsing':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case 'done':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const overallProgress = totalCount > 0 
    ? Math.round(((processedCount + (progress.progress / 100)) / totalCount) * 100)
    : 0;

  return (
    <div className="bg-muted/50 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          Processando {processedCount + 1} de {totalCount}
        </span>
        <span className="text-muted-foreground">{overallProgress}%</span>
      </div>
      
      <Progress value={overallProgress} className="h-2" />
      
      <div className="flex items-center gap-3 p-3 bg-background rounded-md">
        {getStageIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{progress.fileName}</p>
          <p className="text-xs text-muted-foreground">{progress.message}</p>
        </div>
        <span className="text-xs font-medium">{progress.progress}%</span>
      </div>
    </div>
  );
}
