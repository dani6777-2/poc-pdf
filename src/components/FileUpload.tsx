import React from 'react';

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  isProcessing: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, isProcessing }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    onFileChange(file);
  };

  return (
    <div className="relative">
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        disabled={isProcessing}
        className="block w-full p-8 border-3 border-dashed border-primary rounded-2xl cursor-pointer transition-all duration-300 bg-primary/5 hover:bg-primary/10 hover:border-primary-dark hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <p className="mt-3 text-gray-600 flex items-center gap-2">
        <span className="text-xl">📄</span>
        {isProcessing ? 'Procesando archivo...' : 'Selecciona un archivo PDF'}
      </p>
    </div>
  );
}; 