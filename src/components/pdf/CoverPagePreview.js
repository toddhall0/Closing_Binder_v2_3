import React, { useState, useEffect } from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import CoverPagePDF from './CoverPagePDF';

const CoverPagePreview = ({ 
  project, 
  logos, 
  template, 
  customStyles, 
  onStyleChange,
  className = '' 
}) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, [project, logos, template, customStyles]);

  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">Generating preview...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Cover Page Preview</h3>
      </div>
      <div style={{ height: '600px' }}>
        <PDFViewer
          style={{
            width: '100%',
            height: '100%',
            border: 'none'
          }}
          showToolbar={false}
        >
          <CoverPagePDF
            project={project}
            logos={logos}
            template={template}
            customStyles={customStyles}
          />
        </PDFViewer>
      </div>
    </div>
  );
};

export default CoverPagePreview;