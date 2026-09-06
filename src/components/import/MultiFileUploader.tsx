import { useCallback, useState } from 'react';
import { Upload, FileImage, FileText, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MultiFileUploaderProps {
  onFilesSelect: (files: File[]) => void;
  maxFiles?: number;
}

export function MultiFileUploader({ 
  onFilesSelect, 
  maxFiles = 20 
}: MultiFileUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).slice(0, maxFiles);
      const validFiles = files.filter(file => 
        file.type === 'application/pdf' || 
        file.type.startsWith('image/')
      );
      setSelectedFiles(validFiles);
    },
    [maxFiles]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, maxFiles);
    const validFiles = files.filter(file => 
      file.type === 'application/pdf' || 
      file.type.startsWith('image/')
    );
    setSelectedFiles(validFiles);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcess = () => {
    if (selectedFiles.length > 0) {
      onFilesSelect(selectedFiles);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    return <FileImage className="h-4 w-4 text-blue-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
            accept=".pdf,application/pdf,image/*"
            onChange={handleChange}
            className="hidden"
            multiple
          />
          
          <div className="flex flex-col items-center gap-2 text-center px-4">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Arraste seus comprovantes aqui</p>
            <p className="text-sm text-muted-foreground">
              ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              PDF ou imagens (JPG, PNG) • Máx. {maxFiles} arquivos
            </p>
          </div>
        </label>

        {/* Selected files list */}
        {selectedFiles.length > 0 && (
          <div className="p-4 border-t space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {selectedFiles.length} arquivo(s) selecionado(s)
              </p>
              <Badge variant="secondary">
                {formatFileSize(selectedFiles.reduce((acc, f) => acc + f.size, 0))}
              </Badge>
            </div>
            
            <div className="max-h-40 overflow-y-auto space-y-2">
              {selectedFiles.map((file, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 p-2 bg-muted/50 rounded-md"
                >
                  {getFileIcon(file)}
                  <span className="flex-1 text-sm truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      removeFile(index);
                    }}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>

            <Button 
              className="w-full" 
              onClick={(e) => {
                e.preventDefault();
                handleProcess();
              }}
            >
              Processar Comprovantes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
