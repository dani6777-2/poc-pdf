import React from 'react';
import type { QuizQuestion as QuizQuestionType } from '../types/quiz';

interface QuizQuestionProps {
  question: QuizQuestionType;
  index: number;
  selectedAnswer: string | undefined;
  onAnswerChange: (index: number, answer: string) => void;
  isSubmitted: boolean;
}

export const QuizQuestion: React.FC<QuizQuestionProps> = ({
  question,
  index,
  selectedAnswer,
  onAnswerChange,
  isSubmitted
}) => {
  const isCorrect = selectedAnswer === question.correctAnswer;
  const showFeedback = isSubmitted;

  return (
    <div
      className={`p-6 rounded-2xl bg-white shadow-soft border-2 transition-all duration-500 animate-fadeIn relative overflow-hidden ${
        showFeedback
          ? isCorrect
            ? 'border-success/50 bg-success/10'
            : 'border-danger/50 bg-danger/10'
          : 'border-gray-100'
      }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="badge bg-primary/10 text-primary">Pregunta {index + 1}</span>
        {showFeedback && (
          <span className={`badge ${isCorrect ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>{isCorrect ? 'Correcta' : 'Incorrecta'}</span>
        )}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2 drop-shadow-sm">{question.question}</h3>
      <div className="space-y-3 mt-4">
        {question.options.map((option, optionIndex) => {
          const isSelected = selectedAnswer === option;
          const isOptionCorrect = showFeedback && option === question.correctAnswer;
          return (
            <label
              key={optionIndex}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 relative group shadow-sm
                ${isSelected ? 'border-primary bg-primary/10 scale-[1.03]' : 'border-gray-200 hover:border-primary/50 hover:bg-primary/5'}
                ${isSubmitted ? 'cursor-default' : ''}
                ${isOptionCorrect ? 'ring-2 ring-success/40' : ''}
              `}
              tabIndex={0}
            >
              <input
                type="radio"
                name={`question-${index}`}
                value={option}
                checked={isSelected}
                onChange={() => onAnswerChange(index, option)}
                disabled={isSubmitted}
                className="w-5 h-5 text-primary focus:ring-primary accent-primary transition-all duration-200"
                tabIndex={-1}
              />
              <span className={`flex-1 text-gray-700 text-lg transition-colors duration-200 ${isOptionCorrect ? 'font-bold text-success' : ''}`}>{option}</span>
              {showFeedback && isOptionCorrect && (
                <span className="ml-2 badge bg-success/20 text-success animate-bounce">Correcta</span>
              )}
              {showFeedback && isSelected && !isCorrect && (
                <span className="ml-2 badge bg-danger/20 text-danger animate-shake">Tu respuesta</span>
              )}
              <span className="absolute left-0 top-0 w-full h-full pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-primary/10 rounded-xl"></span>
            </label>
          );
        })}
      </div>
      {showFeedback && (
        <div className="mt-6 p-4 rounded-xl bg-white/70 border-l-4 border-primary/40 shadow-inner animate-fadeIn">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xl ${isCorrect ? 'text-success' : 'text-danger'}`}>{isCorrect ? '✔️' : '❌'}</span>
            <span className={`font-semibold ${isCorrect ? 'text-success' : 'text-danger'}`}>{isCorrect ? '¡Correcto!' : 'Incorrecto'}</span>
          </div>
          <p className="text-gray-600 text-base"><span className="font-bold text-primary">Justificación:</span> {question.justification}</p>
        </div>
      )}
    </div>
  );
};

// Animaciones personalizadas
const style = document.createElement('style');
style.innerHTML = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(24px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.animate-fadeIn { animation: fadeIn 0.7s cubic-bezier(.4,2,.6,1) both; }
@keyframes shake { 0%,100%{transform:translateX(0);} 25%{transform:translateX(-4px);} 75%{transform:translateX(4px);} }
.animate-shake { animation: shake 0.5s; }
`;
document.head.appendChild(style); 