// ===============================
// FILE: src/components/web/TableOfContentsHTML.js
// Interactive HTML Table of Contents - FIXED VERSION
// ===============================

import React, { useMemo, useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

const TableOfContentsHTML = ({ project, documents, structure }) => {
  const [logos, setLogos] = useState([]);

  // Load logos when component mounts
  useEffect(() => {
    loadLogos();
  }, [project?.id]);

  const loadLogos = async () => {
    if (!project?.id) return;
    
    try {
      const { supabase } = await import('../../lib/supabase');
      
      const { data, error } = await supabase
        .from('logos')
        .select('*')
        .eq('project_id', project.id)
        .order('logo_position');

      if (error) {
        console.error('Error loading logos for TOC:', error);
        return;
      }

      console.log('Loaded logos for TOC:', data);
      setLogos(data || []);
    } catch (error) {
      console.error('Error loading logos for TOC:', error);
    }
  };

  // Create numbered structure for display
  const numberedStructure = useMemo(() => {
    console.log('Creating numbered structure with:', {
      documents: documents.length,
      sections: structure.sections.length
    });

    const result = {
      sections: {},
      unorganized: []
    };

    // Group sections by type and parent
    const sections = structure.sections.filter(s => s.section_type === 'section').sort((a, b) => a.sort_order - b.sort_order);
    const subsections = structure.sections.filter(s => s.section_type === 'subsection').sort((a, b) => a.sort_order - b.sort_order);

    // Create numbered sections
    sections.forEach((section, index) => {
      const sectionNumber = index + 1;
      result.sections[section.id] = {
        ...section,
        number: sectionNumber,
        documents: [],
        subsections: {}
      };

      // Add subsections to their parent sections
      const sectionSubsections = subsections.filter(sub => sub.parent_section_id === section.id);
      sectionSubsections.forEach((subsection, subIndex) => {
        const subsectionNumber = `${sectionNumber}.${subIndex + 1}`;
        result.sections[section.id].subsections[subsection.id] = {
          ...subsection,
          number: subsectionNumber,
          documents: []
        };
      });
    });

    // Assign documents to their sections/subsections with numbering
    documents.forEach(doc => {
      if (!doc.section_id) {
        // Unorganized document
        result.unorganized.push({
          ...doc,
          number: result.unorganized.length + 1
        });
      } else {
        // Find which section/subsection this document belongs to
        const section = result.sections[doc.section_id];
        if (section) {
          // Document belongs to a main section
          const docNumber = `${section.number}.${section.documents.length + 1}`;
          section.documents.push({
            ...doc,
            number: docNumber
          });
        } else {
          // Check if it belongs to a subsection
          for (const sectionId of Object.keys(result.sections)) {
            const subsection = result.sections[sectionId].subsections[doc.section_id];
            if (subsection) {
              const docNumber = `${subsection.number}.${subsection.documents.length + 1}`;
              subsection.documents.push({
                ...doc,
                number: docNumber
              });
              break;
            }
          }
        }
      }
    });

    console.log('Numbered structure created:', result);
    return result;
  }, [documents, structure]);

  // Get current date for generation timestamp
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Open document in new tab - FIXED VERSION
  const openDocument = (doc) => {
    console.log('Opening document:', doc);
    
    // Try storage_path first (new format), then fall back to file_url (legacy format)
    let documentUrl = null;
    
    if (doc.storage_path) {
      // New format: construct URL from storage path
      const baseUrl = process.env.REACT_APP_SUPABASE_URL;
      documentUrl = `${baseUrl}/storage/v1/object/public/documents/${doc.storage_path}`;
    } else if (doc.file_url) {
      // Legacy format: use existing file_url
      documentUrl = doc.file_url;
    } else {
      console.warn('Document has no storage path or file URL:', doc);
      alert('This document cannot be opened - no valid URL found.');
      return;
    }
    
    console.log('Opening URL:', documentUrl);
    window.open(documentUrl, '_blank', 'noopener,noreferrer');
  };

  const DocumentItem = ({ doc, isSubsection = false }) => (
    <div className={`flex items-center justify-between py-2 px-4 hover:bg-gray-50 transition-colors ${
      isSubsection ? 'ml-6' : ''
    }`}>
      <div className="flex items-center space-x-3">
        <span className="text-sm font-medium text-gray-500 min-w-[60px]">
          {doc.number}
        </span>
        <span className="text-sm font-medium text-gray-900">
          {doc.original_name || doc.name}
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

  const SectionHeader = ({ section, level = 1 }) => (
    <div className={`py-3 px-4 bg-gray-100 border-l-4 border-black ${
      level === 2 ? 'ml-6 bg-gray-50' : ''
    }`}>
      <h3 className={`font-semibold text-gray-900 ${
        level === 1 ? 'text-lg' : 'text-base'
      }`}>
        {section.number}. {section.name}
      </h3>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto bg-white toc-container">
      {/* Header */}
      <div className="text-center border-b-2 border-black pb-6 mb-8">
        {/* Company Logos - FIXED VERSION WITH PROPER NULL CHECKS */}
        {logos && logos.length > 0 && (
          <div className="flex justify-center items-center space-x-8 mb-6">
            {logos.slice(0, 3).map((logo) => (
              <img
                key={logo.id}
                src={logo.logo_url}
                alt={logo.logo_name || `Company Logo`}
                className="max-h-12 max-w-24 object-contain"
              />
            ))}
          </div>
        )}

        <h1 className="text-3xl font-bold text-black mb-2">
          TABLE OF CONTENTS
        </h1>
        
        <div className="text-lg text-gray-700 mb-2">
          {project?.title || 'Closing Binder'}
        </div>
        
        {project?.property_address && (
          <div className="text-base text-gray-600">
            {project.property_address}
            {project.city && `, ${project.city}`}
            {project.state && `, ${project.state}`}
            {project.zip_code && ` ${project.zip_code}`}
          </div>
        )}
      </div>

      {/* Document Structure */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {Object.values(numberedStructure.sections).length === 0 && numberedStructure.unorganized.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              {/* File icon SVG */}
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
            {/* Organized Sections */}
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
            
            {/* Unorganized Documents */}
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

      {/* Footer */}
      <div className="border-t-2 border-black pt-6 mt-8 text-center">
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <strong>Generated:</strong> {currentDate}
          </p>
          <p>
            <strong>Total Documents:</strong> {documents.length}
          </p>
          <p>
            This table of contents provides quick access to all documents in your closing binder.
          </p>
        </div>
      </div>

      {/* Print Styles - FIXED VERSION */}
      <style>{`
        @media print {
          @page {
            margin: 0.75in;
            size: letter;
          }
          
          .toc-container {
            max-width: none !important;
          }
          
          .toc-container button {
            display: none !important;
          }
          
          .toc-container .hover\\:bg-gray-50:hover {
            background-color: transparent !important;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default TableOfContentsHTML;