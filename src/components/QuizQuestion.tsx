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
    <div className={`quiz-question ${showFeedback ? (isCorrect ? 'correct' : 'incorrect') : ''}`}>
      <h3>Pregunta {index + 1}</h3>
      <p>{question.question}</p>
      
      <div className="options">
        <ul>
          {question.options.map((option, optionIndex) => (
            <li key={optionIndex} className="option">
              <label>
                <input
                  type="radio"
                  name={`question-${index}`}
                  value={option}
                  checked={selectedAnswer === option}
                  onChange={() => onAnswerChange(index, option)}
                  disabled={isSubmitted}
                />
                <span>{option}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {showFeedback && (
        <div className="feedback">
          <p className={isCorrect ? 'correct-text' : 'incorrect-text'}>
            {isCorrect ? '¡Correcto!' : 'Incorrecto'}
          </p>
          <p className="justification">{question.justification}</p>
        </div>
      )}
    </div>
  );
}; 