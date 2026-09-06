import { useCallback } from 'react';
import { Upload, FileText, FileSpreadsheet, FileType } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  currentFile: File | null;
}

export function FileUploader({ onFileSelect, currentFile }: FileUploaderProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    if (ext === 'ofx' || ext === 'qfx') {
      return <FileText className="h-8 w-8 text-primary" />;
    }
    if (ext === 'pdf') {
      return <FileType className="h-8 w-8 text-primary" />;
    }
    return <FileSpreadsheet className="h-8 w-8 text-primary" />;
  };

  return (
    <Card>
      <CardContent className="p-0">
        <label
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
        >
          <input
            type="file"
            accept=".ofx,.qfx,.csv,.pdf,application/pdf,text/csv"
            onChange={handleChange}
            className="hidden"
          />
          
          {currentFile ? (
            <div className="flex flex-col items-center gap-2 text-center px-4">
              {getFileIcon(currentFile.name)}
              <p className="font-medium">{currentFile.name}</p>
              <p className="text-sm text-muted-foreground">
                Clique ou arraste outro arquivo para substituir
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center px-4">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Arraste seu arquivo aqui</p>
              <p className="text-sm text-muted-foreground">
                ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Formatos suportados: OFX, QFX, CSV, PDF
              </p>
            </div>
          )}
        </label>
      </CardContent>
    </Card>
  );
}
