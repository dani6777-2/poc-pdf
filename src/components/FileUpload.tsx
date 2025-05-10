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
    <div className="file-upload">
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        disabled={isProcessing}
        className="file-input"
      />
      <p className="file-info">
        {isProcessing ? 'Procesando archivo...' : 'Selecciona un archivo PDF'}
      </p>
    </div>
  );
}; 