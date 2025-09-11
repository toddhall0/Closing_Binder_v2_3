// ===============================
// FILE: src/components/client/ClientTableOfContents.js
// FIXED - Exactly matching HTML TOC layout
// ===============================

import React from 'react';
import { ExternalLink } from 'lucide-react';

const ClientTableOfContents = ({ 
  binder, 
  documents = [], 
  structure,
  logos = [],
  onNavigateToCover
}) => {

  // Generate numbered structure exactly like HTML TOC
  const generateNumberedStructure = () => {
    const numbered = {
      sections: {},
      unorganized: []
    };

    // Get sections from provided structure or binder data
    const sections = (structure?.sections) || (binder?.table_of_contents_data?.sections) || [];
    
    // Group sections by type and parent - exactly like HTML TOC
    const mainSections = sections.filter(s => s.section_type === 'section').sort((a, b) => 
      (a.sort_order || 0) - (b.sort_order || 0)
    );
    
    const subsections = sections.filter(s => s.section_type === 'subsection').sort((a, b) => 
      (a.sort_order || 0) - (b.sort_order || 0)
    );

    // Create section objects with documents - exactly like HTML TOC
    mainSections.forEach((section, sectionIndex) => {
      const sectionNumber = sectionIndex + 1;
      
      numbered.sections[section.id] = {
        ...section,
        number: sectionNumber,
        documents: documents.filter(doc => String(doc.section_id || '') === String(section.id)).map((doc, docIndex) => ({
          ...doc,
          number: `${sectionNumber}.${docIndex + 1}`,
          displayName: doc.display_name || doc.original_name || doc.name || doc.title || 'Unnamed Document'
        })),
        subsections: {}
      };

      // Add subsections to this section - exactly like HTML TOC
      const sectionSubsections = subsections.filter(sub => sub.parent_section_id === section.id);
      sectionSubsections.forEach((subsection, subIndex) => {
        const subsectionNumber = `${sectionNumber}.${subIndex + 1}`;
        
        numbered.sections[section.id].subsections[subsection.id] = {
          ...subsection,
          number: subsectionNumber,
          documents: documents.filter(doc => String(doc.section_id || '') === String(subsection.id)).map((doc, docIndex) => ({
            ...doc,
            number: `${subsectionNumber}.${docIndex + 1}`,
            displayName: doc.display_name || doc.original_name || doc.name || doc.title || 'Unnamed Document'
          }))
        };
      });
    });

    // Add unorganized documents - exactly like HTML TOC
    numbered.unorganized = documents.filter(doc => !doc.section_id).map((doc, index) => ({
      ...doc,
      number: `${mainSections.length + index + 1}`,
      displayName: doc.display_name || doc.original_name || doc.name || doc.title || 'Unnamed Document'
    }));

    return numbered;
  };

  const numberedStructure = generateNumberedStructure();

  // Open document exactly like HTML TOC, with additional fallbacks
  const openDocument = (doc) => {
    console.log('Opening document:', doc);
    let documentUrl = null;

    // Prefer precomputed url if present
    if (doc.url) {
      documentUrl = doc.url;
    }

    // Try storage_path (new format)
    if (!documentUrl && doc.storage_path) {
      const baseUrl = process.env.REACT_APP_SUPABASE_URL;
      documentUrl = `${baseUrl}/storage/v1/object/public/documents/${doc.storage_path}`;
    }

    // Legacy direct file_url
    if (!documentUrl && doc.file_url) {
      documentUrl = doc.file_url;
    }

    // Fallback: file_path might be a storage path or a full URL
    if (!documentUrl && doc.file_path) {
      if (/^https?:\/\//i.test(doc.file_path)) {
        documentUrl = doc.file_path;
      } else {
        const baseUrl = process.env.REACT_APP_SUPABASE_URL;
        documentUrl = `${baseUrl}/storage/v1/object/public/${doc.file_path.startsWith('documents/') ? '' : ''}documents/${doc.file_path.replace(/^documents\//, '')}`;
      }
    }

    if (!documentUrl) {
      console.warn('Document has no resolvable URL:', doc);
      alert('This document cannot be opened - no valid URL found.');
      return;
    }

    console.log('Opening URL:', documentUrl);
    window.open(documentUrl, '_blank', 'noopener,noreferrer');
  };

  // Format current date exactly like HTML TOC
  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Document Item Component - exactly like HTML TOC
  const DocumentItem = ({ doc, isSubsection = false }) => (
    <div className={`flex items-center justify-between py-2 px-4 hover:bg-gray-50 transition-colors ${
      isSubsection ? 'ml-6' : ''
    }`}>
      <div className="flex items-center space-x-3">
        <span className="text-sm font-medium text-gray-500 min-w-[60px]">
          {doc.number}
        </span>
        <span className="text-sm font-medium text-gray-900">
          {doc.display_name || doc.original_name || doc.name || doc.title || 'Unnamed Document'}
        </span>
      </div>
      <button
        onClick={() => openDocument(doc)}
        className="flex items-center px-3 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
        title="Open document in new tab"
      >
        <ExternalLink className="h-3 w-3 mr-1" />
        View
      </button>
    </div>
  );

  // Section Header Component - exactly like HTML TOC
  const SectionHeader = ({ section, level = 1 }) => (
    <div className={`py-3 px-4 bg-gray-100 border-l-4 border-black ${
      level === 2 ? 'ml-6 bg-gray-50' : ''
    }`}>
      <h3 className={`font-semibold text-gray-900 ${
        level === 1 ? 'text-lg' : 'text-base'
      }`}>
        {section.number}. {section.section_name || section.name || 'Unnamed Section'}
      </h3>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto bg-white p-6">
      {/* Table of Contents Title - exactly like HTML TOC */}
      <div className="mb-8">
        {onNavigateToCover && (
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={onNavigateToCover}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              <span className="mr-1">&lt;</span>Back to Cover Page
            </button>
            <button
              onClick={() => (typeof window !== 'undefined') && window.dispatchEvent(new CustomEvent('navigate-client-contact'))}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Contact Information<span className="ml-1">&gt;</span>
            </button>
          </div>
        )}
        <h1 className="text-3xl font-bold text-black mb-4 text-center">TABLE OF CONTENTS</h1>
        
        {/* Project Title */}
        {binder?.title && (
          <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">
            {binder.title}
          </h2>
        )}
        
        {/* Property Address */}
        {binder?.property_address && (
          <p className="text-lg text-gray-600 mb-2 text-center">
            {binder.property_address}
          </p>
        )}

        {/* Purchase Price and Closing Date - exactly like HTML TOC */}
        <div className="text-sm text-gray-900 space-y-1 font-bold text-center">
          {binder?.purchase_price && (
            <p>Purchase Price: ${binder.purchase_price.toLocaleString()}</p>
          )}
          {binder?.closing_date && (
            <p>Closing Date: {new Date(binder.closing_date).toLocaleDateString()}</p>
          )}
        </div>
      </div>

      {/* Document Structure - exactly like HTML TOC */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {!documents || documents.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              {/* File icon SVG - exactly like HTML TOC */}
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Found</h3>
            <p className="text-gray-600">
              Upload and organize your documents to generate a table of contents
            </p>
          </div>
        ) : (
          <>
            {/* Organized Sections - exactly like HTML TOC */}
            {Object.values(numberedStructure.sections).map(section => (
              <div key={section.id} className="border-b border-gray-200 last:border-b-0">
                <SectionHeader section={section} />
                
                {/* Section Documents */}
                {section.documents.map(doc => (
                  <DocumentItem key={doc.id} doc={doc} />
                ))}
                
                {/* Subsections */}
                {Object.values(section.subsections).map(subsection => (
                  <div key={subsection.id}>
                    <SectionHeader section={subsection} level={2} />
                    {subsection.documents.map(doc => (
                      <DocumentItem key={doc.id} doc={doc} isSubsection />
                    ))}
                  </div>
                ))}
              </div>
            ))}
            
            {/* Unorganized Documents - exactly like HTML TOC */}
            {numberedStructure.unorganized.length > 0 && (
              <div className="border-b border-gray-200 last:border-b-0">
                <div className="py-3 px-4 bg-yellow-50 border-l-4 border-yellow-400">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Additional Documents
                  </h3>
                </div>
                {numberedStructure.unorganized.map(doc => (
                  <DocumentItem key={doc.id} doc={doc} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer - exactly like HTML TOC */}
      <div className="border-t-2 border-black pt-6 mt-8 text-center">
        {/* Logos moved to bottom, just after black bar */}
        {logos && logos.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-center items-center space-x-8 mb-4">
              {logos.slice(0, 3).map((logo, index) => {
                const logoUrl = logo?.url || logo?.logo_url;
                return logoUrl ? (
                  <div key={logo.id || index} className="flex-shrink-0">
                    <img
                      src={logoUrl}
                      alt={`Company Logo ${index + 1}`}
                      className="w-auto object-contain"
                      style={{ height: '120px' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                ) : null;
              })}
            </div>
            <div className="border-t-2 border-black"></div>
          </div>
        )}
        <div className="text-sm text-gray-600 space-y-1 text-center">
          <p>
            <strong>Generated:</strong> {formatDate()}
          </p>
          <p>
            <strong>Total Documents:</strong> {documents.length}
          </p>
          <p>
            This table of contents provides quick access to all documents in your closing binder.
          </p>
        </div>
      </div>

    </div>
  );
};

export default ClientTableOfContents;