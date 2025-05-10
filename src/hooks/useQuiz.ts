import { useState } from 'react';
import type { QuizQuestion, QuizState } from '../types/quiz';
import { GEMINI_API_KEY, GEMINI_MODEL_NAME, QUESTIONS_PER_API_CALL } from '../constants/config';

export const useQuiz = () => {
  const [quizState, setQuizState] = useState<QuizState>({
    questions: null,
    selectedAnswers: {},
    score: null,
    isSubmitted: false
  });

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

  const generateQuestions = async (textSegments: string[], numQuestions: number): Promise<QuizQuestion[] | null> => {
    if (!textSegments || textSegments.length === 0) {
      return null;
    }
    
    let allGeneratedQuestions: QuizQuestion[] = [];
    let questionsGeneratedSoFar = 0;
    const batchErrors: string[] = [];

    for (let segmentIndex = 0; segmentIndex < textSegments.length; segmentIndex++) {
      if (questionsGeneratedSoFar >= numQuestions) break;

      const currentTextSegment = textSegments[segmentIndex];
      if (!currentTextSegment.trim()) continue;

      const remainingSegments = textSegments.length - segmentIndex;
      const questionsToAttemptForThisSegment = Math.ceil((numQuestions - questionsGeneratedSoFar) / remainingSegments);
      
      const numApiCallBatchesForSegment = Math.ceil(questionsToAttemptForThisSegment / QUESTIONS_PER_API_CALL);
      const approxTextLengthPerApiCallInSegment = Math.ceil(currentTextSegment.length / numApiCallBatchesForSegment);

      for (let batchIndex = 0; batchIndex < numApiCallBatchesForSegment; batchIndex++) {
        if (questionsGeneratedSoFar >= numQuestions) break;

        const questionsForThisBatch = Math.min(
          QUESTIONS_PER_API_CALL,
          questionsToAttemptForThisSegment - (batchIndex * QUESTIONS_PER_API_CALL),
          numQuestions - questionsGeneratedSoFar
        );
        
        if (questionsForThisBatch <= 0) continue;

        const textChunkStart = batchIndex * approxTextLengthPerApiCallInSegment;
        const textChunkEnd = (batchIndex + 1) * approxTextLengthPerApiCallInSegment;
        const currentTextChunkForApi = currentTextSegment.substring(textChunkStart, textChunkEnd);

        if (!currentTextChunkForApi.trim()) continue;
        
        try {
          const prompt = generatePromptForQuestions(currentTextChunkForApi, questionsForThisBatch);
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error API Gemini: ${errorData.error?.message || response.statusText}`);
          }

          const responseData = await response.json();
          const rawGeneratedText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

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
              }
            }

            try {
              const parsedChunkQuiz: QuizQuestion[] = JSON.parse(jsonStringToParse);
              allGeneratedQuestions = allGeneratedQuestions.concat(parsedChunkQuiz);
              questionsGeneratedSoFar = allGeneratedQuestions.length;
            } catch (parseError) {
              throw new Error(`Error parseando JSON. Texto intentado: ${jsonStringToParse.substring(0,100)}...`);
            }
          }
        } catch (batchError: any) {
          const errorMsg = `Error procesando segmento ${segmentIndex + 1}, lote ${batchIndex + 1}: ${batchError.message}`;
          console.error(errorMsg);
          batchErrors.push(errorMsg);
        }
      }
    }

    if (allGeneratedQuestions.length > 0) {
      return allGeneratedQuestions.slice(0, numQuestions);
    }
    
    return null;
  };

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setQuizState(prev => ({
      ...prev,
      selectedAnswers: { ...prev.selectedAnswers, [questionIndex]: answer }
    }));
  };

  const handleSubmitQuiz = () => {
    if (!quizState.questions) return;

    let correctAnswers = 0;
    quizState.questions.forEach((question, index) => {
      if (quizState.selectedAnswers[index] === question.correctAnswer) {
        correctAnswers++;
      }
    });

    const score = (correctAnswers / quizState.questions.length) * 100;
    setQuizState(prev => ({
      ...prev,
      score,
      isSubmitted: true
    }));
  };

  const resetQuiz = () => {
    setQuizState({
      questions: null,
      selectedAnswers: {},
      score: null,
      isSubmitted: false
    });
  };

  return {
    quizState,
    generateQuestions,
    handleAnswerChange,
    handleSubmitQuiz,
    resetQuiz,
    setQuizState
  };
}; 