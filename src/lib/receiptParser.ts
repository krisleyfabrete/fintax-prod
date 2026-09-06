import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Configure the worker for pdfjs-dist v3
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export interface ReceiptData {
  id: string;
  fileName: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  transactionType: string; // PIX, TED, Boleto, etc
  recipient?: string;
  sender?: string;
  status: 'processing' | 'success' | 'error';
  error?: string;
  previewUrl?: string; // URL for image preview
  categoryId?: string;
  confidence: number; // 0-100
}

export interface ReceiptProgress {
  fileId: string;
  fileName: string;
  progress: number;
  stage: 'loading' | 'extracting' | 'parsing' | 'done' | 'error';
  message: string;
}

// Extract text from an image using OCR
async function extractTextFromImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const imageUrl = URL.createObjectURL(file);
  
  try {
    const result = await Tesseract.recognize(imageUrl, 'por', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });
    
    return result.data.text;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

// Extract text from PDF
async function extractTextFromPDF(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  const totalPages = pdf.numPages;
  
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: { str: string }) => item.str)
      .join(' ');
    fullText += pageText + '\n';
    
    onProgress?.(Math.round((i / totalPages) * 50));
  }
  
  // If no text found, try OCR on the first page
  if (fullText.trim().length < 50) {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (context) {
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
      
      const imageDataUrl = canvas.toDataURL('image/png');
      
      const result = await Tesseract.recognize(imageDataUrl, 'por', {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(50 + Math.round(m.progress * 50));
          }
        },
      });
      
      fullText = result.data.text;
    }
  }
  
  return fullText;
}

// Parse receipt text to extract transaction data
function parseReceiptText(text: string, fileName: string): Omit<ReceiptData, 'id' | 'status' | 'fileName'> {
  const lowerText = text.toLowerCase();
  let transactionType = 'Outros';
  let type: 'income' | 'expense' = 'expense';
  let date = '';
  let amount = 0;
  let description = '';
  let recipient = '';
  let sender = '';
  let confidence = 0;
  
  // Detect transaction type
  if (lowerText.includes('pix')) {
    transactionType = 'PIX';
    confidence += 20;
  } else if (lowerText.includes('ted') || lowerText.includes('transferência eletrônica')) {
    transactionType = 'TED';
    confidence += 20;
  } else if (lowerText.includes('doc')) {
    transactionType = 'DOC';
    confidence += 20;
  } else if (lowerText.includes('boleto')) {
    transactionType = 'Boleto';
    confidence += 20;
  } else if (lowerText.includes('débito automático')) {
    transactionType = 'Débito Automático';
    confidence += 15;
  } else if (lowerText.includes('cartão') || lowerText.includes('compra')) {
    transactionType = 'Cartão';
    confidence += 15;
  }
  
  // ===== IMPROVED: Detect if it's income or expense based on specific patterns =====
  
  // Patterns that indicate INCOME (valor recebido)
  const incomePatterns = [
    /valor\s*recebido/i,
    /você\s*recebeu/i,
    /pix\s*recebido/i,
    /transferência\s*recebida/i,
    /ted\s*recebida?/i,
    /doc\s*recebido/i,
    /crédito\s*em\s*conta/i,
    /depósito/i,
    /recebimento/i,
    /entrada/i,
    /valor\s*creditado/i,
  ];
  
  // Patterns that indicate EXPENSE (valor pago)
  const expensePatterns = [
    /valor\s*pago/i,
    /valor\s*enviado/i,
    /você\s*pagou/i,
    /você\s*enviou/i,
    /pix\s*enviado/i,
    /transferência\s*enviada/i,
    /ted\s*enviada?/i,
    /doc\s*enviado/i,
    /pagamento\s*(realizado|efetuado|confirmado)/i,
    /débito\s*em\s*conta/i,
    /débito/i,
    /saída/i,
    /valor\s*debitado/i,
    /comprovante\s*de\s*pagamento/i,
  ];
  
  let incomeScore = 0;
  let expenseScore = 0;
  
  for (const pattern of incomePatterns) {
    if (pattern.test(text)) {
      incomeScore++;
    }
  }
  
  for (const pattern of expensePatterns) {
    if (pattern.test(text)) {
      expenseScore++;
    }
  }
  
  // Determine type based on score
  if (incomeScore > expenseScore) {
    type = 'income';
    confidence += 15 + (incomeScore * 5);
  } else if (expenseScore > incomeScore) {
    type = 'expense';
    confidence += 15 + (expenseScore * 5);
  } else {
    // Default to expense if can't determine
    type = 'expense';
  }
  
  // Extract date
  const datePatterns = [
    // DD/MM/YYYY HH:MM
    /(\d{2}\/\d{2}\/\d{4})\s+(?:\d{2}:\d{2})?/,
    // DD/MM/YYYY
    /(\d{2}\/\d{2}\/\d{4})/,
    // DD de MES de YYYY
    /(\d{1,2})\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})/i,
    // YYYY-MM-DD
    /(\d{4}-\d{2}-\d{2})/,
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[2]) {
        // Month name format
        const monthMap: Record<string, string> = {
          'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
          'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
          'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12',
        };
        const day = match[1].padStart(2, '0');
        const month = monthMap[match[2].toLowerCase()];
        const year = match[3];
        date = `${year}-${month}-${day}`;
      } else if (match[1].includes('-')) {
        date = match[1];
      } else {
        const parts = match[1].split('/');
        date = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      confidence += 20;
      break;
    }
  }
  
  // If no date found, use today
  if (!date) {
    date = new Date().toISOString().split('T')[0];
  }
  
  // ===== IMPROVED: Extract amount with context for type detection =====
  // Try to find "valor pago" or "valor recebido" with amount first
  const contextAmountPatterns = [
    { pattern: /valor\s*pago[:\s]*R?\$?\s*([\d.]+,\d{2})/i, type: 'expense' as const },
    { pattern: /valor\s*enviado[:\s]*R?\$?\s*([\d.]+,\d{2})/i, type: 'expense' as const },
    { pattern: /valor\s*debitado[:\s]*R?\$?\s*([\d.]+,\d{2})/i, type: 'expense' as const },
    { pattern: /valor\s*recebido[:\s]*R?\$?\s*([\d.]+,\d{2})/i, type: 'income' as const },
    { pattern: /valor\s*creditado[:\s]*R?\$?\s*([\d.]+,\d{2})/i, type: 'income' as const },
  ];
  
  let amountFound = false;
  for (const { pattern, type: amountType } of contextAmountPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amountStr = match[1].replace(/\./g, '').replace(',', '.');
      amount = parseFloat(amountStr);
      if (amount > 0) {
        type = amountType; // Override type based on amount context
        confidence += 30;
        amountFound = true;
        break;
      }
    }
  }
  
  // If no contextual amount found, try generic patterns
  if (!amountFound) {
    const amountPatterns = [
      // R$ 1.234,56
      /R\$\s*([\d.]+,\d{2})/i,
      // Valor: R$ 1.234,56
      /valor[:\s]+R?\$?\s*([\d.]+,\d{2})/i,
      // 1.234,56 (at least one comma for cents)
      /(?:^|\s)([\d.]+,\d{2})(?:\s|$)/,
    ];
    
    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        const amountStr = match[1].replace(/\./g, '').replace(',', '.');
        amount = parseFloat(amountStr);
        if (amount > 0) {
          confidence += 25;
          break;
        }
      }
    }
  }
  
  // Extract recipient/sender names
  const namePatterns = [
    /(?:destinatário|favorecido|para|beneficiário)[:\s]+([A-Za-záàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?:\n|CPF|CNPJ|$)/i,
    /(?:pagador|remetente|de|origem)[:\s]+([A-Za-záàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?:\n|CPF|CNPJ|$)/i,
  ];
  
  const recipientMatch = text.match(namePatterns[0]);
  if (recipientMatch) {
    recipient = recipientMatch[1].trim().substring(0, 100);
    confidence += 10;
  }
  
  const senderMatch = text.match(namePatterns[1]);
  if (senderMatch) {
    sender = senderMatch[1].trim().substring(0, 100);
    confidence += 10;
  }
  
  // Build description based on type
  if (type === 'expense') {
    description = recipient 
      ? `${transactionType} para ${recipient}`
      : `${transactionType} - Pagamento`;
  } else {
    description = sender 
      ? `${transactionType} de ${sender}`
      : `${transactionType} - Recebimento`;
  }
  
  // Cap confidence at 100
  confidence = Math.min(confidence, 100);
  
  return {
    date,
    amount,
    type,
    description,
    transactionType,
    recipient,
    sender,
    confidence,
  };
}

// Main function to process a receipt file
export async function processReceipt(
  file: File,
  onProgress?: (progress: ReceiptProgress) => void
): Promise<ReceiptData> {
  const fileId = crypto.randomUUID();
  const fileName = file.name;
  const extension = fileName.toLowerCase().split('.').pop();
  
  try {
    onProgress?.({
      fileId,
      fileName,
      progress: 0,
      stage: 'loading',
      message: 'Carregando arquivo...',
    });
    
    let text = '';
    
    if (extension === 'pdf') {
      onProgress?.({
        fileId,
        fileName,
        progress: 10,
        stage: 'extracting',
        message: 'Extraindo texto do PDF...',
      });
      
      text = await extractTextFromPDF(file, (p) => {
        onProgress?.({
          fileId,
          fileName,
          progress: 10 + Math.round(p * 0.6),
          stage: 'extracting',
          message: p > 50 ? 'Aplicando OCR...' : 'Extraindo texto...',
        });
      });
    } else if (['jpg', 'jpeg', 'png', 'webp'].includes(extension || '')) {
      onProgress?.({
        fileId,
        fileName,
        progress: 10,
        stage: 'extracting',
        message: 'Aplicando OCR na imagem...',
      });
      
      text = await extractTextFromImage(file, (p) => {
        onProgress?.({
          fileId,
          fileName,
          progress: 10 + Math.round(p * 0.6),
          stage: 'extracting',
          message: `OCR: ${p}%`,
        });
      });
    } else {
      throw new Error('Formato de arquivo não suportado');
    }
    
    onProgress?.({
      fileId,
      fileName,
      progress: 80,
      stage: 'parsing',
      message: 'Analisando comprovante...',
    });
    
    const data = parseReceiptText(text, fileName);
    
    onProgress?.({
      fileId,
      fileName,
      progress: 100,
      stage: 'done',
      message: 'Concluído',
    });
    
    // Create preview URL for images
    let previewUrl: string | undefined;
    if (['jpg', 'jpeg', 'png', 'webp'].includes(extension || '')) {
      previewUrl = URL.createObjectURL(file);
    }
    
    return {
      id: fileId,
      fileName,
      ...data,
      previewUrl,
      status: 'success',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    onProgress?.({
      fileId,
      fileName,
      progress: 100,
      stage: 'error',
      message: errorMessage,
    });
    
    return {
      id: fileId,
      fileName,
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      type: 'expense',
      description: fileName,
      transactionType: 'Outros',
      status: 'error',
      error: errorMessage,
      confidence: 0,
    };
  }
}

// Process multiple receipts
export async function processMultipleReceipts(
  files: File[],
  onProgress?: (progress: ReceiptProgress, index: number, total: number) => void
): Promise<ReceiptData[]> {
  const results: ReceiptData[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const result = await processReceipt(files[i], (progress) => {
      onProgress?.(progress, i, files.length);
    });
    results.push(result);
  }
  
  return results;
}
