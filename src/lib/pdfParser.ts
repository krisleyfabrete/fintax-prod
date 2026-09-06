import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { ParsedTransaction } from './importParsers';
import { parseWithBankDetection, BankName, getBankDisplayName } from './bankParsers';

// Configure the worker for pdfjs-dist v3
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export interface PDFParseProgress {
  stage: 'extracting' | 'ocr' | 'parsing' | 'done';
  progress: number; // 0-100
  currentPage?: number;
  totalPages?: number;
  message: string;
}

export interface PDFParseResult {
  transactions: ParsedTransaction[];
  detectedBank: BankName;
  usedOCR: boolean;
}

export async function parsePDF(
  file: File,
  onProgress?: (progress: PDFParseProgress) => void
): Promise<PDFParseResult> {
  let transactions: ParsedTransaction[] = [];
  let detectedBank: BankName = 'generic';
  let usedOCR = false;
  
  try {
    onProgress?.({
      stage: 'extracting',
      progress: 0,
      message: 'Carregando PDF...',
    });
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    
    let fullText = '';
    
    // Extract text from all pages
    for (let i = 1; i <= totalPages; i++) {
      onProgress?.({
        stage: 'extracting',
        progress: Math.round((i / totalPages) * 50),
        currentPage: i,
        totalPages,
        message: `Extraindo texto da página ${i}/${totalPages}...`,
      });
      
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: { str: string }) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    onProgress?.({
      stage: 'parsing',
      progress: 60,
      message: 'Analisando transações...',
    });
    
    // Try to parse with bank detection
    const result = parseWithBankDetection(fullText);
    transactions = result.transactions;
    detectedBank = result.detectedBank;
    
    // If no transactions found with text extraction, try OCR
    if (transactions.length === 0) {
      console.log('No text found in PDF, attempting OCR...');
      usedOCR = true;
      
      const ocrResult = await parsePDFWithOCR(pdf, onProgress);
      transactions = ocrResult.transactions;
      detectedBank = ocrResult.detectedBank;
    }
    
    onProgress?.({
      stage: 'done',
      progress: 100,
      message: `${transactions.length} transações encontradas`,
    });
    
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Erro ao processar PDF. Verifique se o arquivo está correto.');
  }
  
  return { transactions, detectedBank, usedOCR };
}

// Convert PDF page to image and run OCR
async function parsePDFWithOCR(
  pdf: pdfjsLib.PDFDocumentProxy,
  onProgress?: (progress: PDFParseProgress) => void
): Promise<{ transactions: ParsedTransaction[]; detectedBank: BankName }> {
  let allText = '';
  
  try {
    // Process first few pages (to avoid long processing times)
    const maxPages = Math.min(pdf.numPages, 10);
    
    for (let i = 1; i <= maxPages; i++) {
      onProgress?.({
        stage: 'ocr',
        progress: 60 + Math.round((i / maxPages) * 35),
        currentPage: i,
        totalPages: maxPages,
        message: `OCR na página ${i}/${maxPages}...`,
      });
      
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
      
      // Create canvas to render PDF page
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) continue;
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
      
      // Convert canvas to image data URL
      const imageDataUrl = canvas.toDataURL('image/png');
      
      // Run OCR on the image
      console.log(`Running OCR on page ${i}...`);
      const result = await Tesseract.recognize(imageDataUrl, 'por', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pageProgress = 60 + Math.round(((i - 1 + m.progress) / maxPages) * 35);
            onProgress?.({
              stage: 'ocr',
              progress: pageProgress,
              currentPage: i,
              totalPages: maxPages,
              message: `OCR página ${i}: ${Math.round(m.progress * 100)}%`,
            });
          }
        },
      });
      
      allText += result.data.text + '\n';
    }
    
    // Parse with bank detection
    const parseResult = parseWithBankDetection(allText);
    return {
      transactions: parseResult.transactions,
      detectedBank: parseResult.detectedBank,
    };
    
  } catch (error) {
    console.error('Error during OCR:', error);
    throw new Error('Erro ao processar OCR do PDF. O arquivo pode estar protegido ou corrompido.');
  }
}

// Legacy export for backward compatibility
export { getBankDisplayName };
