// Fixed ClientTableOfContents with working buttons and proper document names
// File: src/components/client/ClientTableOfContents.js

import React, { useMemo, useState, useRef } from 'react';
import { FileText, Download, Eye, ArrowLeft, ExternalLink } from 'lucide-react';

const ClientTableOfContents = ({ binder, documents, logos, onNavigateToCover, onOpenDocument, onDownloadDocument }) => {
  const [hoveredDocument, setHoveredDocument] = useState(null);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const [previewContent, setPreviewContent] = useState(null);
  const previewTimeoutRef = useRef(null);

  // Debug logging to see what we're working with
  React.useEffect(() => {
    console.log('ClientTableOfContents Debug:', {
      binderTitle: binder?.title,
      documentCount: documents?.length,
      logoCount: logos?.length,
      documentsPreview: documents?.slice(0, 3).map(doc => ({
        id: doc.id,
        title: doc.title,
        name: doc.name,
        original_name: doc.original_name,
        display_name: doc.display_name,
        url: doc.url,
        file_url: doc.file_url,
        storage_path: doc.storage_path,
        section_id: doc.section_id
      }))
    });
  }, [binder, documents, logos]);

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPropertyDetails = () => {
    if (!binder?.property_address) return 'Property Address Not Provided';
    
    const details = [];
    if (binder.property_address) details.push(binder.property_address);
    if (binder.city) details.push(binder.city);
    if (binder.state) details.push(binder.state);
    if (binder.zip_code) details.push(binder.zip_code);
    
    return details.length > 0 ? details.join(', ') : 'Property Address Not Provided';
  };

  // FIXED: Get document display name using proper field priority
  const getDocumentName = (doc) => {
    const name = doc.title || 
                 doc.original_name || 
                 doc.name || 
                 doc.display_name || 
                 doc.filename || 
                 'Untitled Document';
    
    console.log('Document name resolution:', {
      id: doc.id,
      title: doc.title,
      original_name: doc.original_name,
      name: doc.name,
      display_name: doc.display_name,
      filename: doc.filename,
      resolved: name
    });
    
    return name;
  };

  // FIXED: Get document URL using proper field priority
  const getDocumentUrl = async (doc) => {
    console.log('Getting document URL for:', getDocumentName(doc), doc);
    
    // Try direct URL fields first
    if (doc.url && doc.url.trim()) {
      console.log('Using doc.url:', doc.url);
      return doc.url;
    }
    
    if (doc.file_url && doc.file_url.trim()) {
      console.log('Using doc.file_url:', doc.file_url);
      return doc.file_url;
    }

    if (doc.document_url && doc.document_url.trim()) {
      console.log('Using doc.document_url:', doc.document_url);
      return doc.document_url;
    }

    // Try to generate URL from storage path
    if (doc.storage_path && doc.storage_path.trim()) {
      try {
        console.log('Generating signed URL for storage_path:', doc.storage_path);
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.REACT_APP_SUPABASE_URL,
          process.env.REACT_APP_SUPABASE_ANON_KEY
        );
        
        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(doc.storage_path, 3600); // 1 hour expiry
        
        if (error) {
          console.error('Supabase storage error:', error);
          throw error;
        }
        
        if (data?.signedUrl) {
          console.log('Generated signed URL:', data.signedUrl);
          return data.signedUrl;
        }
      } catch (storageError) {
        console.warn('Failed to generate signed URL:', storageError);
      }
    }

    // Try blob URL if available
    if (doc.blob) {
      console.log('Creating blob URL for document');
      return URL.createObjectURL(doc.blob);
    }

    console.warn('No valid URL source found for document:', getDocumentName(doc));
    return null;
  };

  // FIXED: Working document view handler
  const handleDocumentView = async (doc) => {
    console.log('View button clicked for document:', getDocumentName(doc));
    
    try {
      const documentUrl = await getDocumentUrl(doc);
      
      if (documentUrl) {
        // Open in new window
        window.open(documentUrl, '_blank', 'noopener,noreferrer');
        
        // Call the parent handler if provided
        if (onOpenDocument) {
          onOpenDocument(doc);
        }
      } else {
        alert('Document is not available for viewing');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      alert('Failed to open document');
    }
  };

  // FIXED: Working document download handler
  const handleDocumentDownload = async (doc) => {
    console.log('Download button clicked for document:', getDocumentName(doc));
    
    try {
      const documentUrl = await getDocumentUrl(doc);
      
      if (documentUrl) {
        // Create download link
        const link = document.createElement('a');
        link.href = documentUrl;
        link.download = getDocumentName(doc);
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Call the parent handler if provided
        if (onDownloadDocument) {
          onDownloadDocument(doc);
        }
      } else {
        alert('Document is not available for download');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document');
    }
  };

  // Document preview functionality
  const handleMouseEnter = async (doc, event) => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    setHoveredDocument(doc.id);

    const rect = event.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const previewWidth = 400;
    
    let xPosition = rect.left + rect.width + 10;
    
    if (xPosition + previewWidth > viewportWidth) {
      xPosition = rect.left - previewWidth - 10;
    }
    
    setPreviewPosition({
      x: Math.max(10, xPosition),
      y: Math.max(10, rect.top)
    });

    previewTimeoutRef.current = setTimeout(async () => {
      try {
        await loadDocumentPreview(doc);
      } catch (error) {
        console.error('Failed to load document preview:', error);
        setPreviewContent({
          type: 'error',
          content: 'Preview not available'
        });
      }
    }, 500);
  };

  const handleMouseLeave = () => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    setHoveredDocument(null);
    setPreviewContent(null);
  };

  const loadDocumentPreview = async (doc) => {
    try {
      const documentUrl = await getDocumentUrl(doc);
      
      if (!documentUrl) {
        throw new Error('No valid document source found');
      }

      setPreviewContent({
        type: 'pdf',
        url: documentUrl,
        title: getDocumentName(doc),
        doc: doc
      });

    } catch (error) {
      console.error('Error loading document preview:', error);
      setPreviewContent({
        type: 'error',
        content: 'Unable to load preview'
      });
    }
  };

  // Clean up object URLs on unmount
  React.useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);

  // FIXED: Create organized structure from documents
  const numberedStructure = useMemo(() => {
    if (!documents || documents.length === 0) {
      return { sections: {}, subsections: {}, unorganized: [] };
    }

    console.log('Creating numbered structure with documents:', documents.length);

    // For now, since we don't have section structure in the client data,
    // let's organize all documents as unorganized but numbered properly
    const organizedDocs = documents.map((doc, index) => ({
      ...doc,
      number: index + 1,
      displayNumber: (index + 1).toString(),
      displayName: getDocumentName(doc)
    }));

    console.log('Organized documents:', organizedDocs.map(doc => ({
      id: doc.id,
      number: doc.number,
      displayName: doc.displayName
    })));

    return {
      sections: {},
      subsections: {},
      unorganized: organizedDocs
    };
  }, [documents]);

  const DocumentItem = ({ doc }) => (
    <div className="flex items-center justify-between py-3 px-4 border-b border-gray-100 hover:bg-gray-50">
      <div className="flex-1">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-500 min-w-[40px]">
            {doc.number}.
          </span>
          <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-900 truncate">
            {doc.displayName}
          </span>
        </div>
      </div>
      
      {/* Working View and Download buttons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handleDocumentView(doc)}
          onMouseEnter={(e) => handleMouseEnter(doc, e)}
          onMouseLeave={handleMouseLeave}
          className={`px-3 py-1 text-xs rounded border transition-all duration-200 flex items-center ${
            hoveredDocument === doc.id
              ? 'bg-blue-100 text-blue-700 border-blue-300 shadow-sm'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
          }`}
          title="View document (hover for preview)"
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </button>
        
        <button
          onClick={() => handleDocumentDownload(doc)}
          className="px-3 py-1 text-xs bg-green-100 text-green-700 border border-green-300 rounded hover:bg-green-200 transition-colors flex items-center"
          title="Download document"
        >
          <Download className="h-3 w-3 mr-1" />
          Download
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto bg-white">
      {/* Company Logos at top - FIXED: 25% larger */}
      {logos && logos.length > 0 && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-center items-center space-x-8">
            {logos.slice(0, 3).map((logo, index) => {
              const logoUrl = logo?.url || logo?.logo_url || logo?.image_url;
              return logoUrl ? (
                <img
                  key={index}
                  src={logoUrl}
                  alt={`Company logo ${index + 1}`}
                  className="h-20 max-w-40 object-contain" // FIXED: 25% larger (was h-16 max-w-32)
                  onError={(e) => {
                    console.warn(`Failed to load logo ${index + 1}:`, logoUrl);
                    e.target.style.display = 'none';
                  }}
                />
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Header with Back Button */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <button
          onClick={onNavigateToCover}
          className="text-sm text-gray-600 hover:text-black transition-colors duration-200 font-medium flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Cover
        </button>
        
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            TABLE OF CONTENTS
          </h1>
          <p className="text-sm text-gray-600">
            {binder?.title || 'Closing Binder'}
          </p>
        </div>
        
        <div className="w-20"> {/* Spacer for alignment */}
        </div>
      </div>

      {/* Property Details */}
      <div className="p-6 bg-gray-50">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            {binder?.title || 'Closing Binder'}
          </h2>
          <p className="text-gray-600">{formatPropertyDetails()}</p>
          
          {/* Purchase Price and Closing Date */}
          <div className="mt-3 text-sm text-gray-600 space-y-1">
            {binder?.purchase_price && (
              <p>Purchase Price: ${binder.purchase_price.toLocaleString()}</p>
            )}
            {binder?.closing_date && (
              <p>Closing Date: {new Date(binder.closing_date).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      </div>

      {/* Document Structure */}
      <div className="border border-gray-200">
        {!documents || documents.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <FileText className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Found</h3>
            <p className="text-gray-600">
              This binder does not contain any documents yet.
            </p>
          </div>
        ) : (
          <div className="border-b border-gray-200 last:border-b-0">
            <div className="py-3 px-4 bg-blue-50 border-l-4 border-blue-400">
              <h3 className="text-lg font-semibold text-gray-900">
                Documents ({documents.length})
              </h3>
            </div>
            {numberedStructure.unorganized.map((doc, index) => (
              <DocumentItem 
                key={doc.id || index}
                doc={doc}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t-2 border-black pt-6 mt-8 text-center p-6">
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <strong>Generated:</strong> {formatDate()}
          </p>
          <p>
            <strong>Total Documents:</strong> {documents?.length || 0}
          </p>
          <p className="mt-4 text-xs">
            This table of contents provides quick access to all documents in your closing binder.
            Click "View" to open or "Download" to save documents. Hover over "View" for a preview.
          </p>
        </div>
      </div>

      {/* Document Preview Popup */}
      {hoveredDocument && previewContent && (
        <div
          className="fixed z-50 bg-white border border-gray-300 shadow-2xl rounded-lg overflow-hidden pointer-events-none"
          style={{
            left: `${previewPosition.x}px`,
            top: `${previewPosition.y}px`,
            width: '400px',
            height: '300px',
            maxWidth: '90vw',
            maxHeight: '90vh'
          }}
        >
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {previewContent.title}
            </h4>
          </div>

          <div className="h-full overflow-hidden">
            {previewContent.type === 'pdf' ? (
              <iframe
                src={`${previewContent.url}#page=1&zoom=50&toolbar=0&navpanes=0&scrollbar=0`}
                className="w-full h-full border-0"
                title="Document Preview"
                onError={() => {
                  setPreviewContent({
                    type: 'error',
                    content: 'Preview not available'
                  });
                }}
              />
            ) : previewContent.type === 'error' ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-gray-400 mb-2">
                    <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.084 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600">{previewContent.content}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientTableOfContents;