import { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { MAX_PDF_PAGES_ALLOWED, MAX_CHARS_PER_SEGMENT, MAX_PAGES_PER_SEGMENT } from '../constants/config';
import type { ProcessingState } from '../types/quiz';

export const usePdfProcessor = () => {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    status: '',
    error: null,
    partialErrors: []
  });
  const [totalPages, setTotalPages] = useState<number | null>(null);

  const processPdf = async (file: File): Promise<string[] | null> => {
    setProcessingState(prev => ({ ...prev, isProcessing: true, status: 'Iniciando procesamiento de PDF...' }));
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      setTotalPages(pdf.numPages);

      if (pdf.numPages > MAX_PDF_PAGES_ALLOWED) {
        setProcessingState(prev => ({
          ...prev,
          error: `El PDF tiene ${pdf.numPages} páginas. El máximo permitido es ${MAX_PDF_PAGES_ALLOWED}.`
        }));
        return null;
      }

      const textSegments: string[] = [];
      let currentSegmentText = '';
      let currentSegmentPageCount = 0;

      for (let i = 0; i < pdf.numPages; i++) {
        setProcessingState(prev => ({
          ...prev,
          status: `Realizando OCR en página ${i + 1} de ${pdf.numPages}...`
        }));

        const page = await pdf.getPage(i + 1);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = { canvasContext: context!, viewport: viewport };
        await page.render(renderContext).promise;
        
        const { data: { text: pageOcrText } } = await Tesseract.recognize(canvas, 'spa');
        canvas.remove();

        if (currentSegmentText.length > 0 && 
            (currentSegmentText.length + pageOcrText.length > MAX_CHARS_PER_SEGMENT || 
             currentSegmentPageCount >= MAX_PAGES_PER_SEGMENT)) {
          textSegments.push(currentSegmentText);
          currentSegmentText = '';
          currentSegmentPageCount = 0;
        }
        
        currentSegmentText += pageOcrText + '\n\n';
        currentSegmentPageCount++;
      }

      if (currentSegmentText.trim().length > 0) {
        textSegments.push(currentSegmentText);
      }
      
      if (textSegments.length === 0 && pdf.numPages > 0) {
        setProcessingState(prev => ({
          ...prev,
          error: "El OCR no pudo extraer texto significativo para formar segmentos."
        }));
        return null;
      }

      setProcessingState(prev => ({
        ...prev,
        status: `PDF procesado en ${textSegments.length} segmentos.`
      }));

      return textSegments;

    } catch (err: any) {
      console.error("Error durante OCR y segmentación:", err);
      setProcessingState(prev => ({
        ...prev,
        error: "Error al realizar OCR y segmentar el PDF."
      }));
      return null;
    } finally {
      setProcessingState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  return {
    processPdf,
    processingState,
    totalPages
  };
}; 