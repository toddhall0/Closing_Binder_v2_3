// src/components/client/ClientBinderViewer.js - Fixed to pass documents to ClientCoverPage
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

      // Use the corrected getBinderByAccessCode method
      const result = await ClientDashboardService.getBinderByAccessCode(accessCode);
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to load binder');
      }

      if (!result.data) {
        throw new Error('Binder not found');
      }

      setBinder(result.data);
      setLogos(result.data.logos || []);

      // Track the view
      await ClientDashboardService.trackBinderView(result.data.id, {
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
        documentItem.id, 
        'view',
        {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      );

      // Open document in new window
      if (documentItem.url) {
        window.open(documentItem.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening document:', error);
    }
  };

  const handleDownloadDocument = async (documentItem) => {
    try {
      // Track document access
      await ClientDashboardService.trackDocumentAccess(
        binder.id, 
        documentItem.id, 
        'download',
        {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      );

      // Trigger download
      if (documentItem.url) {
        const link = document.createElement('a');
        link.href = documentItem.url;
        link.download = documentItem.original_name || documentItem.name || 'document.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const handleNavigateToTOC = () => {
    setCurrentView('toc');
  };

  const ClientContactInfo = () => {
    const roles = [
      { key: 'buyer', label: 'Buyer' },
      { key: 'seller', label: 'Seller' },
      { key: 'buyer_attorney', label: "Buyer's Attorney" },
      { key: 'seller_attorney', label: "Seller's Attorney" },
      { key: 'escrow_agent', label: 'Escrow Agent' },
      { key: 'title_company', label: 'Title Insurance Company' },
      { key: 'lender', label: 'Lender' },
      { key: 'buyer_broker', label: "Buyer's Broker" },
      { key: 'seller_broker', label: "Seller's Broker" },
    ];
    const info = binder?.contact_info || binder?.cover_page_data?.contact_info || {};
    return (
      <div className="max-w-4xl mx-auto bg-white p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-black">Contact Information</h1>
        </div>
        <div className="space-y-8">
          {roles.map((role) => {
            const data = info[role.key] || {};
            const hasAny = ['company','representative','address','email','phone','web'].some(k => !!data[k]);
            if (!hasAny) return null;
            return (
              <div key={role.key} className="border-l-4 border-black pl-4 py-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{role.label}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {data.company && <div><span className="font-medium">Company:</span> {data.company}</div>}
                  {data.representative && <div><span className="font-medium">Representative:</span> {data.representative}</div>}
                  {data.address && <div className="md:col-span-2"><span className="font-medium">Address:</span> {data.address}</div>}
                  {data.email && <div><span className="font-medium">Email:</span> {data.email}</div>}
                  {data.phone && <div><span className="font-medium">Phone:</span> {data.phone}</div>}
                  {data.web && <div className="md:col-span-2"><span className="font-medium">Web:</span> {data.web}</div>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 text-left">
          <button onClick={() => setCurrentView('toc')} className="text-sm text-blue-600 hover:text-blue-800 underline">
            Back to Table of Contents
          </button>
        </div>
      </div>
    );
  };

  const handleNavigateToCover = () => {
    setCurrentView('cover');
  };

  // Listen for custom navigation events from child buttons
  useEffect(() => {
    const handler = () => setCurrentView('contact');
    window.addEventListener('navigate-client-contact', handler);
    return () => window.removeEventListener('navigate-client-contact', handler);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner />
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

  // Extract and normalize documents into flat list with expected fields
  const documents = (binder.client_binder_documents || binder.documents || []).map((item) => {
    // If coming from join: { document_id, is_viewable, is_downloadable, documents: { ...actualDoc } }
    const doc = item.documents ? item.documents : item;
    const id = doc.id || item.document_id || item.id;
    const name = doc.name || doc.original_name || doc.display_name;
    const display_name = doc.display_name || doc.original_name || doc.name || 'Unnamed Document';
    const section_id = doc.section_id || item.section_id || null;
    const storage_path = doc.storage_path || doc.file_path || null;
    const file_url = doc.file_url || item.url || null;

    // Build a best-effort URL
    let url = null;
    if (storage_path) {
      url = `${process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/documents/${storage_path}`;
    } else if (file_url) {
      url = file_url;
    }

    return {
      ...doc,
      id,
      name,
      display_name,
      section_id,
      storage_path,
      file_url,
      url
    };
  });

  // Build structure for TOC numbering using binder.table_of_contents_data if available
  const structure = {
    sections: binder?.table_of_contents_data?.sections || []
  };

  // Debug logging to help troubleshoot
  console.log('Binder data:', {
    binderId: binder.id,
    title: binder.title,
    documentCount: documents.length,
    documentsStructure: documents.map(doc => ({
      id: doc.id,
      title: doc.title || doc.name,
      hasBlob: !!doc.blob,
      hasStoragePath: !!doc.storage_path,
      hasUrl: !!doc.url
    }))
  });

  // Render current view
  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      {/* lightweight event bridge for deep-link buttons */}
      <script dangerouslySetInnerHTML={{ __html: `
        window.addEventListener('navigate-client-contact', function() {
          var root = document.getElementById('root');
          // no-op; React state handler below
        });
      `}} />
      {currentView === 'cover' ? (
        <ClientCoverPage
          binder={binder}
          logos={logos}
          documents={documents} // ← This was missing!
          onNavigateToTOC={handleNavigateToTOC}
        />
      ) : currentView === 'toc' ? (
        <ClientTableOfContents
          binder={binder}
          documents={documents}
          structure={structure}
          logos={logos}
          onNavigateToCover={handleNavigateToCover}
          onOpenDocument={handleOpenDocument}
          onDownloadDocument={handleDownloadDocument}
        />
      ) : (
        <ClientContactInfo />
      )}
    </div>
  );
};

export default ClientBinderViewer;