import { useState } from 'react';
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-animated px-4">
      <header className="w-full max-w-5xl mx-auto text-center mb-16 mt-12">
        <div className="relative">
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-success/10 rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="inline-flex items-center gap-4 mb-6 transform hover:scale-105 transition-transform duration-300">
              <span className="text-6xl animate-bounce">📄</span>
              <h1 className="text-6xl font-extrabold text-gray-900 drop-shadow-lg tracking-tight">
                Generador de Cuestionarios <span className="text-primary">PDF</span>
              </h1>
            </div>
            <div className="flex justify-center gap-3 mt-4">
              <span className="badge transform hover:scale-105 transition-transform duration-300">UX/UI Mejorada</span>
              <span className="badge bg-success/10 text-success transform hover:scale-105 transition-transform duration-300">Glassmorphism</span>
              <span className="badge bg-primary/10 text-primary transform hover:scale-105 transition-transform duration-300">100% Responsive</span>
            </div>
            <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Sube un PDF y genera cuestionarios interactivos con feedback inmediato, exportación y una experiencia visual moderna.
            </p>
          </div>
        </div>
      </header>

      <main className="w-full flex-1 flex flex-col items-center justify-center">
        <div className="card max-w-4xl mx-auto mb-12 transform hover:scale-[1.02] transition-transform duration-300">
          <FileUpload onFileChange={handleFileChange} isProcessing={processingState.isProcessing} />
          {pdfFile && (
            <div className="mt-8 p-8 glass rounded-2xl">
              <div className="flex flex-wrap items-center gap-8">
                <div className="flex-1 bg-white/80 p-6 rounded-xl shadow-inner relative group transform hover:scale-[1.02] transition-transform duration-300">
                  <label htmlFor="numQuestions" className="flex items-center gap-3 text-gray-700 font-semibold text-lg">
                    <span className="text-2xl">📝</span>
                    Número de preguntas:
                    <span className="ml-1 text-primary cursor-pointer relative">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 14h.01M16 10h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
                      <span className="tooltip group-hover:opacity-100">Puedes elegir entre 1 y 100 preguntas</span>
                    </span>
                  </label>
                  <input
                    type="number"
                    id="numQuestions"
                    min="1"
                    max="100"
                    value={numQuestionsToGenerate}
                    onChange={(e) => setNumQuestionsToGenerate(Number(e.target.value))}
                    disabled={processingState.isProcessing}
                    className={`input w-32 mt-3 text-xl ${numQuestionsToGenerate < 1 || numQuestionsToGenerate > 100 ? 'border-danger ring-danger/30' : ''}`}
                    aria-invalid={numQuestionsToGenerate < 1 || numQuestionsToGenerate > 100}
                  />
                  {(numQuestionsToGenerate < 1 || numQuestionsToGenerate > 100) && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-danger text-sm font-bold animate-pulse">¡Fuera de rango!</span>
                  )}
                </div>
                <button
                  className="btn btn-primary min-w-[280px] relative overflow-hidden group"
                  onClick={handleGenerateQuiz}
                  disabled={processingState.isProcessing || !pdfFile || numQuestionsToGenerate < 1 || numQuestionsToGenerate > 100}
                >
                  <span className="absolute inset-0 w-full h-full bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                  <span className="text-2xl mr-3">🎲</span>
                  {processingState.isProcessing ? (
                    <span className="flex items-center gap-3">
                      <span className="w-6 h-6 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></span>
                      Procesando...
                    </span>
                  ) : 'Generar Cuestionario'}
                </button>
              </div>
            </div>
          )}
        </div>

        {processingState.isProcessing && (
          <div className="card max-w-md mx-auto mb-8 transform hover:scale-[1.02] transition-transform duration-300">
            <div className="flex items-center justify-center gap-4">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <p className="text-gray-700 text-lg">{processingState.status}</p>
            </div>
          </div>
        )}

        {processingState.error && (
          <div className="bg-red-50 text-red-600 p-8 rounded-2xl shadow-soft border border-red-100 max-w-md mx-auto mb-8 animate-shake flex items-center gap-4">
            <span className="text-3xl">❌</span>
            <p className="text-lg">{processingState.error}</p>
          </div>
        )}

        {quizState.questions && quizState.questions.length > 0 && (
          <div className="card max-w-5xl mx-auto transform hover:scale-[1.02] transition-transform duration-300">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-6 drop-shadow">Cuestionario Generado</h2>
              <p className="text-xl text-gray-600">
                <span className="badge bg-primary/10 text-primary mr-3 text-base">{quizState.questions.length} preguntas</span>
                {quizState.isSubmitted && quizState.score !== null && (
                  <span className="badge bg-success/10 text-success text-base">Puntuación: {quizState.score.toFixed(1)}%</span>
                )}
              </p>
            </div>

            <div className="space-y-10 mb-12">
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
              <div className="flex flex-col items-center gap-6 mt-12">
                <button
                  className="btn btn-success min-w-[320px] text-xl"
                  onClick={handleSubmitQuiz}
                  disabled={Object.keys(quizState.selectedAnswers).length !== quizState.questions.length}
                >
                  <span className="text-2xl mr-3">✓</span>
                  Enviar Respuestas
                </button>
                <p className="text-gray-600 flex items-center gap-3 text-lg">
                  <span className="text-2xl">📝</span>
                  {Object.keys(quizState.selectedAnswers).length} de {quizState.questions.length} preguntas respondidas
                </p>
              </div>
            )}

            {quizState.isSubmitted && quizState.score !== null && (
              <div className="mt-16 p-10 glass rounded-3xl shadow-soft">
                <div className="text-center max-w-2xl mx-auto">
                  <h2 className="text-4xl font-bold text-gray-900 mb-8">Puntuación Final</h2>
                  <div className="text-7xl font-extrabold text-gray-900 mb-8 drop-shadow animate-bounce">{quizState.score.toFixed(1)}%</div>
                  <p className="text-2xl text-gray-600 mb-10">
                    {quizState.score >= 70 ? '¡Excelente trabajo! 🎉' : 'Sigue practicando, ¡lo harás mejor! 💪'}
                  </p>
                  <button className="btn btn-primary min-w-[320px] text-xl" onClick={resetQuiz}>
                    <span className="text-2xl mr-3">🔄</span>
                    Generar Nuevo Cuestionario
                  </button>
                </div>
              </div>
            )}

            <ExportQuiz questions={quizState.questions} score={quizState.score} />
          </div>
        )}
      </main>

      <footer className="w-full text-center py-8 text-gray-500 text-base mt-16">
        Hecho con <span className="text-primary animate-pulse">♥</span> por tu equipo
      </footer>
    </div>
  );
}

export default App;
