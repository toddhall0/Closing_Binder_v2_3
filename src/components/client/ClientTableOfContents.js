// src/components/client/ClientTableOfContents.js
import React from 'react';
import { FileText, Download, Eye, ArrowLeft } from 'lucide-react';

const ClientTableOfContents = ({ binder, documents, logos, onNavigateToCover, onOpenDocument, onDownloadDocument }) => {
  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPropertyAddress = () => {
    if (!binder) return '';
    
    let address = binder.property_address || '';
    if (binder.city) address += `, ${binder.city}`;
    if (binder.state) address += `, ${binder.state}`;
    if (binder.zip_code) address += ` ${binder.zip_code}`;
    
    return address;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    return `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;
  };

  // Create a simple numbered structure for documents
  const createNumberedDocuments = () => {
    if (!documents || !Array.isArray(documents)) return [];
    
    return documents.map((item, index) => ({
      ...item,
      number: index + 1,
      document: item.documents || item
    }));
  };

  const numberedDocuments = createNumberedDocuments();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b-2 border-black bg-white py-8">
        <div className="max-w-4xl mx-auto px-6">
          
          {/* Back Button */}
          <button
            onClick={onNavigateToCover}
            className="flex items-center text-gray-600 hover:text-black mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Cover Page
          </button>

          {/* Company Logos */}
          {logos && logos.length > 0 && (
            <div className="flex justify-center items-center space-x-8 mb-6">
              {logos.slice(0, 3).map((logo, index) => (
                <img
                  key={logo.id || index}
                  src={logo.logo_url}
                  alt={logo.logo_name || `Company Logo ${index + 1}`}
                  className="max-h-12 max-w-24 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ))}
            </div>
          )}

          {/* Title Section */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-black mb-2">
              TABLE OF CONTENTS
            </h1>
            
            {binder?.title && (
              <div className="text-lg text-gray-700 mb-2">
                {binder.title}
              </div>
            )}
            
            {binder?.property_address && (
              <div className="text-base text-gray-600">
                {formatPropertyAddress()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document List */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          
          {/* Documents Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
              <span className="text-sm text-gray-500">
                {numberedDocuments.length} {numberedDocuments.length === 1 ? 'document' : 'documents'}
              </span>
            </div>
          </div>

          {/* Document Entries */}
          {numberedDocuments.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {numberedDocuments.map((item) => {
                const doc = item.document;
                return (
                  <div key={item.document_id || doc.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      
                      {/* Document Info */}
                      <div className="flex items-center space-x-4 min-w-0 flex-1">
                        <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-gray-600" />
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                              {item.number}
                            </span>
                            <h3 className="text-base font-medium text-gray-900 truncate">
                              {doc.name || 'Document'}
                            </h3>
                          </div>
                          
                          {doc.file_size && (
                            <p className="text-sm text-gray-500 mt-1">
                              {formatFileSize(doc.file_size)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2 ml-4">
                        {item.is_viewable !== false && (
                          <button
                            onClick={() => onOpenDocument(item)}
                            className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border transition-colors"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </button>
                        )}
                        
                        {item.is_downloadable !== false && (
                          <button
                            onClick={() => onDownloadDocument(item)}
                            className="inline-flex items-center px-3 py-2 text-sm bg-black text-white rounded hover:bg-gray-800 transition-colors"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Available</h3>
              <p className="text-gray-600">
                This closing binder doesn't contain any documents yet.
              </p>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="text-center mt-8 py-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            <strong>Generated:</strong> {formatDate()}
          </p>
          {binder?.access_code && (
            <p className="text-xs text-gray-500 mt-2">
              Access Code: <span className="font-mono font-semibold">{binder.access_code}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientTableOfContents;