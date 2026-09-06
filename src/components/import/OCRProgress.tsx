import { Progress } from '@/components/ui/progress';
import { PDFParseProgress } from '@/lib/pdfParser';
import { Loader2, FileText, Search, CheckCircle } from 'lucide-react';

interface OCRProgressProps {
  progress: PDFParseProgress;
}

export function OCRProgress({ progress }: OCRProgressProps) {
  const getStageIcon = () => {
    switch (progress.stage) {
      case 'extracting':
        return <FileText className="h-5 w-5 text-primary animate-pulse" />;
      case 'ocr':
        return <Search className="h-5 w-5 text-primary animate-pulse" />;
      case 'parsing':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case 'done':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getStageLabel = () => {
    switch (progress.stage) {
      case 'extracting':
        return 'Extraindo texto';
      case 'ocr':
        return 'Reconhecimento ótico (OCR)';
      case 'parsing':
        return 'Analisando transações';
      case 'done':
        return 'Concluído';
    }
  };

  return (
    <div className="bg-muted/50 rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-3">
        {getStageIcon()}
        <div className="flex-1">
          <p className="font-medium">{getStageLabel()}</p>
          <p className="text-sm text-muted-foreground">{progress.message}</p>
        </div>
        <span className="text-sm font-medium">{progress.progress}%</span>
      </div>
      
      <Progress value={progress.progress} className="h-2" />
      
      {progress.currentPage && progress.totalPages && (
        <p className="text-xs text-muted-foreground text-center">
          Página {progress.currentPage} de {progress.totalPages}
        </p>
      )}
    </div>
  );
}
