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
    <div className="export-controls">
      <button onClick={exportToPDF} className="export-button pdf">
        Exportar a PDF
      </button>
      <button onClick={exportToJSON} className="export-button json">
        Exportar a JSON
      </button>
    </div>
  );
}; 