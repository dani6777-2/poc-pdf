import type { QuizQuestion } from '../types/quiz';
import { jsPDF } from 'jspdf';

interface ExportQuizProps {
  questions: QuizQuestion[];
  score?: number | null;
}

export const ExportQuiz = ({ questions, score }: ExportQuizProps) => {
  const exportToPDF = () => {
    const doc = new jsPDF();
    let yOffset = 20;

    // Título
    doc.setFontSize(20);
    doc.text('Cuestionario', 20, yOffset);
    yOffset += 20;

    // Preguntas
    doc.setFontSize(12);
    questions.forEach((question, index) => {
      // Pregunta
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${question.question}`, 20, yOffset);
      yOffset += 10;

      // Opciones
      doc.setFont('helvetica', 'normal');
      question.options.forEach((option, optIndex) => {
        const prefix = String.fromCharCode(97 + optIndex); // a, b, c, d
        doc.text(`${prefix}) ${option}`, 30, yOffset);
        yOffset += 8;
      });

      // Respuesta correcta y justificación
      yOffset += 5;
      doc.setFont('helvetica', 'italic');
      doc.text(`Respuesta correcta: ${question.correctAnswer}`, 20, yOffset);
      yOffset += 8;
      doc.text(`Justificación: ${question.justification}`, 20, yOffset);
      yOffset += 15;

      // Nueva página si es necesario
      if (yOffset > 250) {
        doc.addPage();
        yOffset = 20;
      }
    });

    // Puntuación si está disponible
    if (score !== null && score !== undefined) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text(`Puntuación final: ${score.toFixed(1)}%`, 20, 20);
    }

    doc.save('cuestionario.pdf');
  };

  const exportToJSON = () => {
    const data = {
      questions,
      score: score || null,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cuestionario.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-4 justify-center mt-8 pt-8 border-t border-gray-200">
      <button 
        onClick={exportToPDF} 
        className="btn btn-danger flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Exportar a PDF
      </button>
      <button 
        onClick={exportToJSON} 
        className="btn btn-success flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
        </svg>
        Exportar a JSON
      </button>
    </div>
  );
}; 