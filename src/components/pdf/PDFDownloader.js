import React, { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import CoverPagePDF from './CoverPagePDF';
import { Download, FileText, Loader } from 'lucide-react';

const PDFDownloader = ({ 
  project, 
  logos, 
  template, 
  customStyles,
  fileName,
  className = '' 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAndDownload = async () => {
    setIsGenerating(true);
    try {
      // Generate PDF blob
      const blob = await pdf(
        <CoverPagePDF
          project={project}
          logos={logos}
          template={template}
          customStyles={customStyles}
        />
      ).toBlob();

      // Create filename
      const defaultFileName = `${project?.title || 'Closing-Binder'}-Cover-Page.pdf`;
      const finalFileName = fileName || defaultFileName;

      // Download file
      saveAs(blob, finalFileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={generateAndDownload}
      disabled={isGenerating || !project}
      className={`inline-flex items-center px-4 py-2 border border-black text-sm font-medium rounded text-white bg-black hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {isGenerating ? (
        <>
          <Loader className="animate-spin h-4 w-4 mr-2" />
          Generating...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Download Cover Page
        </>
      )}
    </button>
  );
};

export default PDFDownloader;