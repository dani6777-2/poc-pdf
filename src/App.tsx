import { useState } from 'react';
import './App.css';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { FileUpload } from './components/FileUpload';
import { QuizQuestion } from './components/QuizQuestion';
import { ExportQuiz } from './components/ExportQuiz';
import { usePdfProcessor } from './hooks/usePdfProcessor';
import { useQuiz } from './hooks/useQuiz';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  justification: string;
}

function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [numQuestionsToGenerate, setNumQuestionsToGenerate] = useState<number>(5);

  const { processPdf, processingState } = usePdfProcessor();
  const { quizState, generateQuestions, handleAnswerChange, handleSubmitQuiz, resetQuiz, setQuizState } = useQuiz();

  const handleFileChange = (file: File | null) => {
    setPdfFile(file);
    resetQuiz();
  };

  const handleGenerateQuiz = async () => {
    if (!pdfFile) return;

    const textSegments = await processPdf(pdfFile);
    if (!textSegments) return;

    const questions = await generateQuestions(textSegments, numQuestionsToGenerate);
    if (questions) {
      setQuizState({
        questions,
        selectedAnswers: {},
        score: null,
        isSubmitted: false
      });
    }
  };

  return (
    <div className="app">
      <h1>Generador de Cuestionarios PDF</h1>
      
      <div className="controls">
        <FileUpload onFileChange={handleFileChange} isProcessing={processingState.isProcessing} />
        
        {pdfFile && (
          <div className="generation-controls">
            <div className="questions-input">
              <label htmlFor="numQuestions">Número de preguntas:</label>
              <input
                type="number"
                id="numQuestions"
                min="1"
                max="20"
                value={numQuestionsToGenerate}
                onChange={(e) => setNumQuestionsToGenerate(Number(e.target.value))}
                disabled={processingState.isProcessing}
              />
            </div>
            
            <button
              className="generate-button"
              onClick={handleGenerateQuiz}
              disabled={processingState.isProcessing || !pdfFile}
            >
              {processingState.isProcessing ? 'Procesando...' : 'Generar Cuestionario'}
            </button>
          </div>
        )}
      </div>

      {processingState.isProcessing && (
        <div className="status">
          <div className="status-content">
            <div className="spinner"></div>
            <p>{processingState.status}</p>
          </div>
        </div>
      )}

      {processingState.error && (
        <div className="error">
          <p>{processingState.error}</p>
        </div>
      )}

      {quizState.questions && quizState.questions.length > 0 && (
        <div className="quiz">
          <div className="quiz-header">
            <h2>Cuestionario Generado</h2>
            <p className="quiz-info">
              {quizState.questions.length} preguntas generadas
              {quizState.isSubmitted && quizState.score !== null && ` • Puntuación: ${quizState.score.toFixed(1)}%`}
            </p>
          </div>

          <div className="quiz-questions">
            {quizState.questions.map((question, index) => (
              <QuizQuestion
                key={index}
                question={question}
                index={index}
                selectedAnswer={quizState.selectedAnswers[index]}
                onAnswerChange={handleAnswerChange}
                isSubmitted={quizState.isSubmitted}
              />
            ))}
          </div>

          {!quizState.isSubmitted && (
            <div className="quiz-actions">
              <button
                className="submit-button"
                onClick={handleSubmitQuiz}
                disabled={Object.keys(quizState.selectedAnswers).length !== quizState.questions.length}
              >
                Enviar Respuestas
              </button>
              <p className="submit-info">
                {Object.keys(quizState.selectedAnswers).length} de {quizState.questions.length} preguntas respondidas
              </p>
            </div>
          )}

          {quizState.isSubmitted && quizState.score !== null && (
            <div className="score">
              <div className="score-content">
                <h2>Puntuación Final</h2>
                <div className="score-value">{quizState.score.toFixed(1)}%</div>
                <p className="score-message">
                  {quizState.score >= 70 ? '¡Excelente trabajo!' : 'Sigue practicando, ¡lo harás mejor!'}
                </p>
                <button className="new-quiz-button" onClick={resetQuiz}>
                  Generar Nuevo Cuestionario
                </button>
              </div>
            </div>
          )}

          <ExportQuiz questions={quizState.questions} score={quizState.score} />
        </div>
      )}
    </div>
  );
}

export default App;
