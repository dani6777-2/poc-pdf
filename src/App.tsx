import { useState, useEffect } from 'react';
import './App.css';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const GEMINI_API_KEY = 'AIzaSyDlbQwoxzrkHGfc1UTuHuLyYrN3TPVAaFA';
const GEMINI_MODEL_NAME = 'gemini-1.5-flash-8b';
const QUESTIONS_PER_API_CALL = 10;
const MAX_PAGES_PER_SEGMENT = 10;
const MAX_CHARS_PER_SEGMENT = 4000;
const MAX_PDF_PAGES_ALLOWED = 1000;

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  justification: string;
}

function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [totalPagesInPdf, setTotalPagesInPdf] = useState<number | null>(null);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [overallError, setOverallError] = useState<string | null>(null);
  const [partialErrorMessages, setPartialErrorMessages] = useState<string[]>([]); // To store non-fatal errors
  
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: number]: string}>({});
  const [numQuestionsToGenerate, setNumQuestionsToGenerate] = useState<number>(5);
  const [score, setScore] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setPdfFile(file);
    setQuizQuestions(null);
    setSelectedAnswers({});
    setOverallError(null);
    setPartialErrorMessages([]);
    setProcessingStatus('');
    setScore(null);
    setQuizSubmitted(false);
    setTotalPagesInPdf(null);
  };

  const performOcrAndSegment = async (file: File): Promise<string[] | null> => {
    setProcessingStatus('Iniciando procesamiento de PDF...');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      setTotalPagesInPdf(pdf.numPages);

      if (pdf.numPages > MAX_PDF_PAGES_ALLOWED) {
        setOverallError(`El PDF tiene ${pdf.numPages} páginas. El máximo permitido es ${MAX_PDF_PAGES_ALLOWED}.`);
        return null;
      }

      const textSegments: string[] = [];
      let currentSegmentText = '';
      let currentSegmentPageCount = 0;

      for (let i = 0; i < pdf.numPages; i++) {
        setProcessingStatus(`Realizando OCR en página ${i + 1} de ${pdf.numPages}...`);
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
            (currentSegmentText.length + pageOcrText.length > MAX_CHARS_PER_SEGMENT || currentSegmentPageCount >= MAX_PAGES_PER_SEGMENT)) {
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
        setOverallError("El OCR no pudo extraer texto significativo para formar segmentos.");
        return null;
      }
      setProcessingStatus(`PDF procesado en ${textSegments.length} segmentos.`);
      return textSegments;

    } catch (err: any) {
      console.error("Error durante OCR y segmentación:", err);
      setOverallError("Error al realizar OCR y segmentar el PDF.");
      return null;
    }
  };

  const generatePromptForQuestions = (textChunk: string, numQs: number): string => {
    return `A partir del siguiente fragmento de texto, genera un objeto JSON que represente un cuestionario de ${numQs} preguntas de opción múltiple.
Cada pregunta debe ser un objeto con las siguientes propiedades:
- "question": una cadena de texto con la pregunta.
- "options": un array de 4 cadenas de texto con las opciones de respuesta.
- "correctAnswer": una cadena de texto que sea exactamente igual a una de las opciones y represente la respuesta correcta.
- "justification": una cadena de texto que explique brevemente por qué la respuesta correcta es correcta, basándose en el texto proporcionado.
El resultado final debe ser un array de estos ${numQs} objetos de pregunta, formateado como una cadena JSON válida.
No incluyas ninguna explicación adicional fuera del JSON. No uses bloques de código markdown como \`\`\`json al principio o al final de tu respuesta. Solo el JSON puro.

Fragmento de Texto:
${textChunk}`;
  };

  const generateTestWithGeminiFromSegments = async (textSegments: string[]) => {
    if (!textSegments || textSegments.length === 0) {
      setOverallError("No hay segmentos de texto para generar el cuestionario.");
      return null;
    }
    setProcessingStatus('Generando cuestionario con IA...');
    
    let allGeneratedQuestions: QuizQuestion[] = [];
    const totalQuestionsRequested = numQuestionsToGenerate;
    let questionsGeneratedSoFar = 0;
    const batchErrors: string[] = []; // Store errors from individual batches

    for (let segmentIndex = 0; segmentIndex < textSegments.length; segmentIndex++) {
      if (questionsGeneratedSoFar >= totalQuestionsRequested) break;

      const currentTextSegment = textSegments[segmentIndex];
      if (!currentTextSegment.trim()) continue;

      const remainingSegments = textSegments.length - segmentIndex;
      const questionsToAttemptForThisSegment = Math.ceil((totalQuestionsRequested - questionsGeneratedSoFar) / remainingSegments);
      
      const numApiCallBatchesForSegment = Math.ceil(questionsToAttemptForThisSegment / QUESTIONS_PER_API_CALL);
      const approxTextLengthPerApiCallInSegment = Math.ceil(currentTextSegment.length / numApiCallBatchesForSegment);

      for (let batchIndex = 0; batchIndex < numApiCallBatchesForSegment; batchIndex++) {
        if (questionsGeneratedSoFar >= totalQuestionsRequested) break;

        const questionsForThisBatch = Math.min(QUESTIONS_PER_API_CALL, questionsToAttemptForThisSegment - (batchIndex * QUESTIONS_PER_API_CALL), totalQuestionsRequested - questionsGeneratedSoFar);
        if (questionsForThisBatch <= 0) continue;

        const textChunkStart = batchIndex * approxTextLengthPerApiCallInSegment;
        const textChunkEnd = (batchIndex + 1) * approxTextLengthPerApiCallInSegment;
        const currentTextChunkForApi = currentTextSegment.substring(textChunkStart, textChunkEnd);

        if (!currentTextChunkForApi.trim()) continue;
        
        setProcessingStatus(`Generando preguntas (segmento ${segmentIndex + 1}/${textSegments.length}, lote ${batchIndex + 1}/${numApiCallBatchesForSegment})...`);
        
        // --- Inicio: Try-Catch por lote ---
        try {
          const prompt = generatePromptForQuestions(currentTextChunkForApi, questionsForThisBatch);

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
          );

          if (!response.ok) {
            const errorData = await response.json();
            // Throw error to be caught by the inner catch block
            throw new Error(`Error API Gemini: ${errorData.error?.message || response.statusText}`);
          }

          const responseData = await response.json();
          const rawGeneratedText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
          console.log(`Raw AI Response (Segmento ${segmentIndex + 1}, Lote ${batchIndex + 1}):`, rawGeneratedText);

          if (rawGeneratedText) {
            let jsonStringToParse = rawGeneratedText.trim();
            jsonStringToParse = jsonStringToParse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            
            const firstBracket = jsonStringToParse.indexOf('[');
            const firstBrace = jsonStringToParse.indexOf('{');
            let startIndex = -1;

            if (firstBracket !== -1 && firstBrace !== -1) startIndex = Math.min(firstBracket, firstBrace);
            else if (firstBracket !== -1) startIndex = firstBracket;
            else startIndex = firstBrace;

            if (startIndex !== -1) {
              const lastBracket = jsonStringToParse.lastIndexOf(']');
              const lastBrace = jsonStringToParse.lastIndexOf('}');
              let endIndex = -1;

              if (lastBracket !== -1 && lastBrace !== -1) endIndex = Math.max(lastBracket, lastBrace);
              else if (lastBracket !== -1) endIndex = lastBracket;
              else endIndex = lastBrace;

              if (endIndex !== -1 && endIndex >= startIndex) {
                 jsonStringToParse = jsonStringToParse.substring(startIndex, endIndex + 1);
              } else {
                 console.warn(`No se encontraron límites JSON claros (seg ${segmentIndex+1}, lote ${batchIndex+1}). Se intentará parsear el texto limpiado.`);
              }
            } else {
               console.warn(`No se encontró [ o { inicial (seg ${segmentIndex+1}, lote ${batchIndex+1}). Se intentará parsear el texto limpiado.`);
            }

            try {
              const parsedChunkQuiz: QuizQuestion[] = JSON.parse(jsonStringToParse);
              allGeneratedQuestions = allGeneratedQuestions.concat(parsedChunkQuiz);
              questionsGeneratedSoFar = allGeneratedQuestions.length;
            } catch (parseError) {
              // Throw error to be caught by the inner catch block
              throw new Error(`Error parseando JSON. Texto intentado: ${jsonStringToParse.substring(0,100)}...`);
            }
          } else {
            console.warn(`No se recibió contenido (seg ${segmentIndex+1}, lote ${batchIndex+1})`);
            // Optionally add to batchErrors if this is considered an error
            // batchErrors.push(`No se recibió contenido de la IA para el segmento ${segmentIndex + 1}, lote ${batchIndex + 1}.`);
          }
        } catch (batchError: any) {
           const errorMsg = `Error procesando segmento ${segmentIndex + 1}, lote ${batchIndex + 1}: ${batchError.message}`;
           console.error(errorMsg);
           batchErrors.push(errorMsg);
           // Continue to the next batch/segment instead of stopping
        }
        // --- Fin: Try-Catch por lote ---
      }
    }

    setPartialErrorMessages(batchErrors); // Store batch errors for potential display

    if (allGeneratedQuestions.length > 0) {
      return allGeneratedQuestions.slice(0, totalQuestionsRequested);
    } else {
       // Only set overallError if NO questions were generated AND no fatal error was set before
       if (!overallError) {
           setOverallError("La IA no pudo generar ninguna pregunta a partir de los segmentos del PDF.");
       }
       return null;
    }
  };

  const handleGenerateQuizOrchestrator = async () => {
    if (!pdfFile) {
      setOverallError("Por favor, selecciona un archivo PDF primero.");
      return;
    }
    setIsProcessing(true);
    setOverallError(null);
    setPartialErrorMessages([]); // Clear previous partial errors
    setQuizQuestions(null);
    setSelectedAnswers({});
    setScore(null);
    setQuizSubmitted(false);
    setTotalPagesInPdf(null);

    const textSegments = await performOcrAndSegment(pdfFile);

    if (textSegments && textSegments.length > 0) {
      const questions = await generateTestWithGeminiFromSegments(textSegments);
      if (questions && questions.length > 0) {
        setQuizQuestions(questions);
        if (partialErrorMessages.length > 0) {
             setProcessingStatus(`Cuestionario generado (${questions.length} preguntas), pero con errores en algunos lotes.`);
        } else {
             setProcessingStatus('¡Cuestionario generado!');
        }
      } else if (!overallError) {
         setProcessingStatus('Falló la generación del cuestionario.');
         if (!overallError) setOverallError("No se pudieron generar preguntas a partir del contenido del PDF.");
      }
    } else if (!overallError) {
        setProcessingStatus('Falló el procesamiento del PDF.');
        if (!overallError) setOverallError("El OCR no pudo extraer segmentos de texto del PDF.");
    }
    
    setIsProcessing(false);
  };

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    if (quizSubmitted) return;
    setSelectedAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  const handleSubmitQuiz = () => {
    if (!quizQuestions) return;
    let correctAnswers = 0;
    quizQuestions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctAnswer) {
        correctAnswers++;
      }
    });
    setScore(correctAnswers);
    setQuizSubmitted(true);
    setProcessingStatus('Cuestionario finalizado.');
  };

  return (
    <div className="App">
      <h1>Extractor de PDF y Generador de Cuestionarios (OCR)</h1>
      <input type="file" accept=".pdf" onChange={handleFileChange} disabled={isProcessing} />

      {pdfFile && (
        <div>
          <p>Archivo seleccionado: {pdfFile.name} {totalPagesInPdf ? `(${totalPagesInPdf} páginas)` : ''}</p>

          <div style={{ margin: '20px 0' }}>
            <label htmlFor="numQuestions">Número de preguntas (5-30): {numQuestionsToGenerate}</label>
            <input
              type="range"
              id="numQuestions"
              min="5"
              max="30"
              value={numQuestionsToGenerate}
              onChange={(e) => setNumQuestionsToGenerate(parseInt(e.target.value, 10))}
              style={{ width: '100%', maxWidth: '300px', marginLeft: '10px' }}
              disabled={isProcessing}
            />
          </div>

          <button onClick={handleGenerateQuizOrchestrator} disabled={isProcessing || !pdfFile}>
            {isProcessing ? processingStatus : 'Generar Cuestionario (vía OCR)'}
          </button>
          
          {overallError && <p style={{ color: 'red', marginTop: '10px' }}>Error Principal: {overallError}</p>}
          {partialErrorMessages.length > 0 && !isProcessing && (
             <details style={{marginTop: '10px', color: 'orange'}}>
               <summary>Se produjeron errores en {partialErrorMessages.length} lotes durante la generación.</summary>
               <ul>
                 {partialErrorMessages.map((msg, idx) => <li key={idx}>{msg}</li>)}
               </ul>
             </details>
          )}

          {quizQuestions && !isProcessing && ( // Mostrar cuestionario incluso si hubo errores parciales
            <div style={{marginTop: '20px'}}>
              <h2>Cuestionario Generado ({quizQuestions.length} preguntas):</h2>
              {quizSubmitted && score !== null && (
                <h3 style={{color: score === quizQuestions.length ? 'green' : (score / quizQuestions.length >= 0.5 ? 'orange' : 'red')}}>
                  Tu Puntuación: {score} / {quizQuestions.length}
                </h3>
              )}
              {quizQuestions.map((q, index) => (
                <div key={index} style={{ marginBottom: '20px', border: '1px solid #eee', padding: '10px' }}>
                  <h4>{index + 1}. {q.question}</h4>
                  <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
                    {q.options.map((opt, optIndex) => (
                      <li key={optIndex}>
                        <label style={{
                           color: quizSubmitted && opt === q.correctAnswer ? 'green' : (quizSubmitted && selectedAnswers[index] === opt && opt !== q.correctAnswer ? 'red' : 'inherit')
                        }}>
                          <input
                            type="radio"
                            name={`question-${index}`}
                            value={opt}
                            checked={selectedAnswers[index] === opt}
                            onChange={() => handleAnswerChange(index, opt)}
                            disabled={quizSubmitted}
                          />
                          {opt}
                           {quizSubmitted && opt === q.correctAnswer && ' (Correcta)'}
                           {quizSubmitted && selectedAnswers[index] === opt && opt !== q.correctAnswer && ' (Tu respuesta)'}
                        </label>
                      </li>
                    ))}
                  </ul>
                  {quizSubmitted && (
                    <div style={{ marginTop: '10px', padding: '5px', borderTop: '1px dashed #eee', backgroundColor: '#f9f9f9' }}>
                      <p><strong>Justificación:</strong> {q.justification}</p>
                    </div>
                  )}
                </div>
              ))}
              {!quizSubmitted && quizQuestions.length > 0 && (
                <button onClick={handleSubmitQuiz} style={{marginTop: '20px', padding: '10px 20px', fontSize: '16px'}}>
                  Finalizar Cuestionario y Ver Puntuación
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
