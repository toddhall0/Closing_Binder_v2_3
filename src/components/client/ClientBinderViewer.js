// src/components/client/ClientBinderViewer.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClientDashboardService } from '../../services/clientDashboardService';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
import ClientCoverPage from './ClientCoverPage';
import ClientTableOfContents from './ClientTableOfContents';

const ClientBinderViewer = () => {
  const { accessCode } = useParams();
  const navigate = useNavigate();
  const [binder, setBinder] = useState(null);
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('cover'); // 'cover' or 'toc'

  useEffect(() => {
    loadBinder();
  }, [accessCode]);

  const loadBinder = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await ClientDashboardService.getPublishedBinder(accessCode);
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to load binder');
      }

      setBinder(result.binder);
      setLogos(result.logos || []);

      // Track the view
      await ClientDashboardService.trackBinderView(result.binder.id, {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error('Error loading binder:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDocument = async (documentItem) => {
    try {
      // Track document access
      await ClientDashboardService.trackDocumentAccess(
        binder.id, 
        documentItem.document_id, 
        'view'
      );

      // Get the document URL
      const doc = documentItem.documents || documentItem;
      if (doc.file_url) {
        // Open in new window/tab
        window.open(doc.file_url, '_blank', 'noopener,noreferrer');
      } else {
        console.error('No file URL available for document');
      }
    } catch (err) {
      console.error('Error opening document:', err);
    }
  };

  const handleDownloadDocument = async (documentItem) => {
    try {
      // Track document access
      await ClientDashboardService.trackDocumentAccess(
        binder.id, 
        documentItem.document_id, 
        'download'
      );

      // Get the document URL
      const doc = documentItem.documents || documentItem;
      if (doc.file_url) {
        // Create download link
        const link = document.createElement('a');
        link.href = doc.file_url;
        link.download = doc.name || 'document.pdf';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        console.error('No file URL available for document');
      }
    } catch (err) {
      console.error('Error downloading document:', err);
    }
  };

  const handleNavigateToTOC = () => {
    setCurrentView('toc');
  };

  const handleNavigateToCover = () => {
    setCurrentView('cover');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-gray-600">Loading closing binder...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.084 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Binder</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // No binder found
  if (!binder) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md mx-auto px-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Binder Not Found</h2>
          <p className="text-gray-600 mb-6">The requested closing binder could not be found.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Render current view
  return (
    <div className="min-h-screen bg-white">
      {currentView === 'cover' ? (
        <ClientCoverPage
          binder={binder}
          logos={logos}
          onNavigateToTOC={handleNavigateToTOC}
        />
      ) : (
        <ClientTableOfContents
          binder={binder}
          documents={binder.client_binder_documents || []}
          logos={logos}
          onNavigateToCover={handleNavigateToCover}
          onOpenDocument={handleOpenDocument}
          onDownloadDocument={handleDownloadDocument}
        />
      )}
    </div>
  );
};

export default ClientBinderViewer;