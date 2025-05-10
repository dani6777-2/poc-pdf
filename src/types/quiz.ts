export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  justification: string;
}

export interface QuizState {
  questions: QuizQuestion[] | null;
  selectedAnswers: { [key: number]: string };
  score: number | null;
  isSubmitted: boolean;
}

export interface ProcessingState {
  isProcessing: boolean;
  status: string;
  error: string | null;
  partialErrors: string[];
} 