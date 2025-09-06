// src/components/client/ClientTableOfContents.js - Updated with 25% larger logos
import React, { useMemo } from 'react';
import { FileText, Download, Eye, ArrowLeft, ExternalLink } from 'lucide-react';

const ClientTableOfContents = ({ binder, documents, logos, onNavigateToCover, onOpenDocument, onDownloadDocument }) => {
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

  // Create proper numbered structure matching your existing TOC logic
  const numberedStructure = useMemo(() => {
    console.log('Creating numbered structure for client view with:', {
      documents: documents?.length || 0,
      binder_sections: binder?.table_of_contents_data?.sections?.length || 0
    });

    const result = {
      sections: {},
      unorganized: []
    };

    // Get sections from table_of_contents_data if available, otherwise create from documents
    const sections = binder?.table_of_contents_data?.sections || [];
    
    if (sections.length > 0) {
      // Use the organized structure from table_of_contents_data
      sections.forEach((section, index) => {
        const sectionNumber = index + 1;
        result.sections[section.id] = {
          ...section,
          number: sectionNumber,
          documents: section.documents || [],
          subsections: {}
        };

        // Process subsections
        if (section.subsections && section.subsections.length > 0) {
          section.subsections.forEach((subsection, subIndex) => {
            const subsectionNumber = `${sectionNumber}.${subIndex + 1}`;
            result.sections[section.id].subsections[subsection.id] = {
              ...subsection,
              number: subsectionNumber,
              documents: subsection.documents || []
            };
          });
        }
      });
    } else {
      // Fallback: create a simple "Documents" section if no organized structure
      if (documents && documents.length > 0) {
        const defaultSectionId = 'documents';
        result.sections[defaultSectionId] = {
          id: defaultSectionId,
          name: 'Documents',
          number: 1,
          documents: documents.map((doc, index) => ({
            ...doc,
            number: `1.${index + 1}`
          })),
          subsections: {}
        };
      }
    }

    console.log('Numbered structure created:', result);
    return result;
  }, [documents, binder?.table_of_contents_data]);

  const DocumentItem = ({ doc, number, onAccess, onDownload, isSubsection = false }) => {
    const documentData = doc.documents || doc;
    
    const handleView = () => {
      onAccess(doc, 'view');
    };
    
    const handleDownload = () => {
      onDownload(doc, 'download');
    };

    const formatFileSize = (bytes) => {
      if (!bytes) return '';
      return `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;
    };

    return (
      <div className={`flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors ${isSubsection ? 'ml-6 bg-gray-50' : ''}`}>
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          {/* Document Number */}
          <div className="text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded min-w-max">
            {number}
          </div>
          
          {/* Document Icon */}
          <div className="flex-shrink-0">
            <FileText className="w-5 h-5 text-red-500" />
          </div>
          
          {/* Document Info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {documentData.name || 'Untitled Document'}
            </h4>
            {documentData.file_size && (
              <p className="text-xs text-gray-500 mt-0.5">
                {formatFileSize(documentData.file_size)}
              </p>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-2 ml-4">
          {doc.is_viewable !== false && (
            <button
              onClick={handleView}
              className="inline-flex items-center px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border transition-colors"
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              View
            </button>
          )}
          
          {doc.is_downloadable !== false && (
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-3 py-1.5 text-xs bg-black text-white rounded hover:bg-gray-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Download
            </button>
          )}
        </div>
      </div>
    );
  };

  const SectionHeader = ({ section, level = 1 }) => (
    <div className={`py-3 px-4 ${level === 1 ? 'bg-gray-50 border-b border-gray-200' : 'ml-6 bg-gray-50'}`}>
      <h3 className={`font-semibold text-gray-900 ${level === 1 ? 'text-lg' : 'text-base'}`}>
        {section.number}. {section.name}
      </h3>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto bg-white">
      {/* Header */}
      <div className="text-center border-b-2 border-black pb-6 mb-8">
        
        {/* Back Button */}
        <div className="flex justify-start mb-6">
          <button
            onClick={onNavigateToCover}
            className="flex items-center text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Cover Page
          </button>
        </div>

        {/* Company Logos - MADE 25% LARGER */}
        {logos && logos.length > 0 && (
          <div className="flex justify-center items-center space-x-8 mb-6">
            {logos.slice(0, 3).map((logo, index) => (
              <img
                key={logo.id || index}
                src={logo.logo_url}
                alt={logo.logo_name || `Company Logo ${index + 1}`}
                className="max-h-30 max-w-60 object-contain"
                style={{ maxHeight: '120px', maxWidth: '180px' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ))}
          </div>
        )}

        <h1 className="text-3xl font-bold text-black mb-2">
          TABLE OF CONTENTS
        </h1>
        
        <div className="text-lg text-gray-700 mb-2">
          {binder?.title || 'Closing Binder'}
        </div>
        
        <div className="text-base text-gray-600">
          {formatPropertyDetails()}
        </div>
      </div>

      {/* Document Structure */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {Object.values(numberedStructure.sections).length === 0 && numberedStructure.unorganized.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <FileText className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Found</h3>
            <p className="text-gray-600">
              Upload and organize your documents to generate a table of contents
            </p>
          </div>
        ) : (
          <>
            {/* Organized Sections */}
            {Object.values(numberedStructure.sections).map(section => (
              <div key={section.id} className="border-b border-gray-200 last:border-b-0">
                <SectionHeader section={section} />
                
                {/* Section Documents */}
                {section.documents && section.documents.map((doc, docIndex) => (
                  <DocumentItem 
                    key={doc.id || docIndex}
                    doc={doc}
                    number={doc.number || `${section.number}.${docIndex + 1}`}
                    onAccess={onOpenDocument}
                    onDownload={onDownloadDocument}
                  />
                ))}
                
                {/* Subsections */}
                {Object.values(section.subsections || {}).map(subsection => (
                  <div key={subsection.id}>
                    <SectionHeader section={subsection} level={2} />
                    {subsection.documents && subsection.documents.map((doc, docIndex) => (
                      <DocumentItem 
                        key={doc.id || docIndex}
                        doc={doc}
                        number={doc.number || `${subsection.number}.${docIndex + 1}`}
                        onAccess={onOpenDocument}
                        onDownload={onDownloadDocument}
                        isSubsection={true}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ))}
            
            {/* Unorganized Documents */}
            {numberedStructure.unorganized.length > 0 && (
              <div className="border-b border-gray-200 last:border-b-0">
                <div className="py-3 px-4 bg-yellow-50 border-l-4 border-yellow-400">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Additional Documents
                  </h3>
                </div>
                {numberedStructure.unorganized.map((doc, index) => (
                  <DocumentItem 
                    key={doc.id || index}
                    doc={doc}
                    number={doc.number || index + 1}
                    onAccess={onOpenDocument}
                    onDownload={onDownloadDocument}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t-2 border-black pt-6 mt-8 text-center">
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <strong>Generated:</strong> {formatDate()}
          </p>
          <p>
            <strong>Total Documents:</strong> {documents?.length || 0}
          </p>
          <p className="mt-4 text-xs">
            This table of contents provides quick access to all documents in your closing binder.
            Click on any document name to view or download.
          </p>
        </div>
      </div>

    </div>
  );
};

export default ClientTableOfContents;