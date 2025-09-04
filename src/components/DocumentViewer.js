// ===============================
// FILE: src/components/DocumentViewer.js
// Component that opens documents in custom-sized windows via URL parameter
// ===============================

import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { documentUrlUtils } from '../utils/documentUrlUtils';

const DocumentViewer = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const openDocument = async () => {
      const documentUrl = searchParams.get('url');
      const documentName = searchParams.get('name') || 'Document';
      
      if (!documentUrl) {
        alert('No document URL provided');
        window.close();
        return;
      }

      try {
        // Decode the URL
        const decodedUrl = decodeURIComponent(documentUrl);
        
        // Calculate window dimensions (2/3 screen width, 80% screen height)
        const screenWidth = window.screen.availWidth;
        const screenHeight = window.screen.availHeight;
        const windowWidth = Math.floor(screenWidth * 0.67); // 2/3 width
        const windowHeight = Math.floor(screenHeight * 0.8); // 80% height
        
        // Center the window
        const left = Math.floor((screenWidth - windowWidth) / 2);
        const top = Math.floor((screenHeight - windowHeight) / 2);

        // Resize current window if it was opened from a PDF link
        if (window.opener) {
          window.resizeTo(windowWidth, windowHeight);
          window.moveTo(left, top);
        }

        // Redirect to the actual document
        window.location.href = decodedUrl;
        
      } catch (error) {
        console.error('Error opening document:', error);
        alert('Error opening document. Please try again.');
        window.close();
      }
    };

    openDocument();
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
        <p className="text-gray-600">Opening document...</p>
        <p className="text-sm text-gray-500 mt-2">
          If the document doesn't open automatically, please check your popup blocker settings.
        </p>
      </div>
    </div>
  );
};

export default DocumentViewer;