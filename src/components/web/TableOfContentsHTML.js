// Fixed TableOfContentsHTML Component
// File: src/components/web/TableOfContentsHTML.js

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ExternalLink } from 'lucide-react';

const TableOfContentsHTML = ({ project, documents, structure }) => {
  const [logos, setLogos] = useState([]);

  // Load logos when component mounts
  const loadLogos = useCallback(async () => {
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
  }, [project?.id]);

  useEffect(() => {
    loadLogos();
  }, [project?.id, loadLogos]);

  // Create numbered structure directly without calling organizeDocuments
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
    const sections = structure.sections.filter(s => s.section_type === 'section').sort((a, b) => 
      (a.sort_order || 0) - (b.sort_order || 0)
    );
    
    const subsections = structure.sections.filter(s => s.section_type === 'subsection').sort((a, b) => 
      (a.sort_order || 0) - (b.sort_order || 0)
    );

    // Create section objects with documents
    sections.forEach((section, sectionIndex) => {
      const sectionNumber = sectionIndex + 1;
      
      result.sections[section.id] = {
        ...section,
        number: sectionNumber,
        documents: documents.filter(doc => doc.section_id === section.id).map((doc, docIndex) => ({
          ...doc,
          number: `${sectionNumber}.${docIndex + 1}`
        })),
        subsections: {}
      };

      // Add subsections to this section
      const sectionSubsections = subsections.filter(sub => sub.parent_section_id === section.id);
      sectionSubsections.forEach((subsection, subIndex) => {
        const subsectionNumber = `${sectionNumber}.${subIndex + 1}`;
        
        result.sections[section.id].subsections[subsection.id] = {
          ...subsection,
          number: subsectionNumber,
          documents: documents.filter(doc => doc.section_id === subsection.id).map((doc, docIndex) => ({
            ...doc,
            number: `${subsectionNumber}.${docIndex + 1}`
          }))
        };
      });
    });

    // Add unorganized documents
    result.unorganized = documents.filter(doc => !doc.section_id).map((doc, index) => ({
      ...doc,
      number: `${sections.length + index + 1}`
    }));

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

  // Open document in new tab
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
          {doc.original_name || doc.name || doc.display_name || 'Unnamed Document'}
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
        {section.number}. {section.section_name || section.name || 'Unnamed Section'}
      </h3>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto bg-white p-6">
      {/* Table of Contents Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-black mb-4">TABLE OF CONTENTS</h1>
        
        {/* Project Title */}
        {project?.title && (
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {project.title}
          </h2>
        )}
        
        {/* Property Address */}
        {project?.property_address && (
          <p className="text-lg text-gray-600 mb-2">
            {project.property_address}
          </p>
        )}

        {/* Purchase Price and Closing Date */}
        <div className="text-sm text-gray-600 space-y-1">
          {project?.purchase_price && (
            <p>Purchase Price: ${project.purchase_price.toLocaleString()}</p>
          )}
          {project?.closing_date && (
            <p>Closing Date: {new Date(project.closing_date).toLocaleDateString()}</p>
          )}
        </div>
      </div>

      {/* Document Structure */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {documents.length === 0 ? (
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
    </div>
  );
};

export default TableOfContentsHTML;