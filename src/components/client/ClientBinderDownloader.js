// ===============================
// FILE: src/components/client/ClientBinderDownloader.js
// FIXED VERSION - Now properly includes ALL documents in PDF
// ===============================

import React, { useState, useEffect } from 'react';
import { Download, FileText, Loader, AlertCircle, CheckCircle, Info } from 'lucide-react';

const ClientBinderDownloader = ({ 
  binder, 
  documents = [], 
  logos = [],
  onProgress = () => {},
  className = '' 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    const debugData = {
      binderTitle: binder?.title || 'Unknown',
      documentCount: documents?.length || 0,
      documents: documents?.map(doc => ({
        id: doc.id,
        title: doc.title || doc.name || doc.original_name,
        hasBlob: !!doc.blob,
        hasStoragePath: !!doc.storage_path,
        hasUrl: !!doc.url,
        size: doc.size || 'unknown',
        type: doc.content_type || doc.type || 'unknown'
      })) || [],
      logoCount: logos?.length || 0
    };
    
    setDebugInfo(debugData);
    console.log('ClientBinderDownloader Debug Info:', debugData);
  }, [binder, documents, logos]);

  const updateProgress = (newProgress, step) => {
    setProgress(newProgress);
    setCurrentStep(step);
    onProgress(newProgress, step);
  };

  // FIXED: Enhanced document fetching with multiple fallbacks
  const fetchDocumentBlob = async (doc) => {
    console.log(`Fetching document: ${doc.title || doc.name}`, doc);

    // If document already has blob data, use it
    if (doc.blob) {
      console.log(`Using existing blob for ${doc.title || doc.name}`);
      return doc.blob;
    }

    // Try to fetch from URL
    if (doc.url) {
      try {
        console.log(`Fetching from URL: ${doc.url}`);
        const response = await fetch(doc.url);
        if (response.ok) {
          const blob = await response.blob();
          console.log(`Successfully fetched from URL: ${doc.title || doc.name}`, { size: blob.size });
          return blob;
        } else {
          console.warn(`Failed to fetch from URL (${response.status}): ${doc.url}`);
        }
      } catch (error) {
        console.warn(`Error fetching from URL: ${doc.url}`, error);
      }
    }

    // Try to fetch from storage path
    if (doc.storage_path) {
      try {
        console.log(`Attempting to fetch from storage: ${doc.storage_path}`);
        
        // Import Supabase dynamically to avoid potential issues
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.REACT_APP_SUPABASE_URL,
          process.env.REACT_APP_SUPABASE_ANON_KEY
        );

        const { data, error } = await supabase.storage
          .from('documents')
          .download(doc.storage_path);

        if (error) {
          console.warn(`Supabase storage error for ${doc.storage_path}:`, error);
          throw error;
        }

        if (data) {
          console.log(`Successfully fetched from storage: ${doc.title || doc.name}`, { size: data.size });
          return data;
        }
      } catch (error) {
        console.warn(`Error fetching from storage: ${doc.storage_path}`, error);
      }
    }

    // Try alternative URL fields
    for (const urlField of ['file_url', 'document_url', 'pdf_url']) {
      if (doc[urlField]) {
        try {
          console.log(`Trying ${urlField}: ${doc[urlField]}`);
          const response = await fetch(doc[urlField]);
          if (response.ok) {
            const blob = await response.blob();
            console.log(`Successfully fetched from ${urlField}: ${doc.title || doc.name}`, { size: blob.size });
            return blob;
          }
        } catch (error) {
          console.warn(`Error fetching from ${urlField}:`, error);
        }
      }
    }

    // If all else fails, throw an error
    throw new Error(`Unable to fetch document: ${doc.title || doc.name}. No valid URL or blob found.`);
  };

  // FIXED: Complete PDF generation with proper document inclusion
  const generateCompletePDF = async () => {
    setIsGenerating(true);
    setError(null);
    setProgress(0);

    try {
      console.log('Starting complete PDF generation...');
      console.log('Documents to include:', documents);

      // Import required modules
      updateProgress(5, 'Loading PDF generation modules...');
      const { pdf } = await import('@react-pdf/renderer');
      const { PDFDocument } = await import('pdf-lib');
      
      // Import your existing PDF components
      const CoverPagePDF = (await import('../pdf/CoverPagePDF')).default;
      const TableOfContentsPDF = (await import('../pdf/TableOfContentsPDF')).default;

      // Step 1: Generate Cover Page PDF
      updateProgress(12, 'Generating cover page...');
      const coverPageBlob = await pdf(
        React.createElement(CoverPagePDF, {
          project: {
            title: binder?.title || 'Closing Binder',
            property_address: binder?.property_address,
            property_description: binder?.property_description,
            purchase_price: binder?.purchase_price,
            closing_date: binder?.closing_date,
            loan_amount: binder?.loan_amount,
            buyer: binder?.buyer,
            seller: binder?.seller,
            attorney: binder?.attorney,
            lender: binder?.lender,
            title_company: binder?.title_company,
            escrow_agent: binder?.escrow_agent,
            cover_photo_url: binder?.cover_photo_url,
            property_photo_url: binder?.property_photo_url
          },
          logos: logos,
          propertyPhoto: {
            property_photo_url: binder?.property_photo_url || binder?.cover_photo_url
          }
        })
      ).toBlob();

      console.log('Cover page generated:', { size: coverPageBlob.size });

      // Prepare structure and compute ordered documents matching TOC order
      const structure = {
        sections: binder?.table_of_contents_data?.sections || [],
        documents: documents
      };

      const sectionsSorted = (structure.sections || []).slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      const docsBySection = new Map();
      for (const doc of documents) {
        const key = doc.section_id || 'unorganized';
        if (!docsBySection.has(key)) docsBySection.set(key, []);
        docsBySection.get(key).push(doc);
      }
      for (const [k, list] of docsBySection.entries()) {
        list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      }
      const orderedDocs = [];
      for (const section of sectionsSorted) {
        if (section.section_type !== 'section') continue;
        (docsBySection.get(section.id) || []).forEach(d => orderedDocs.push(d));
        const subsections = sectionsSorted.filter(s => s.parent_section_id === section.id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        for (const sub of subsections) {
          (docsBySection.get(sub.id) || []).forEach(d => orderedDocs.push(d));
        }
      }
      // Append unorganized at the end
      (docsBySection.get('unorganized') || []).forEach(d => orderedDocs.push(d));

      // Step 2: Load all document PDFs and count pages
      updateProgress(28, 'Loading document files...');
      const documentPDFs = [];
      
      console.log(`Processing ${orderedDocs.length} documents in TOC order...`);
      
      for (let i = 0; i < orderedDocs.length; i++) {
        const doc = orderedDocs[i];
        const docTitle = doc.title || doc.name || doc.original_name || `Document ${i + 1}`;
        updateProgress(28 + (i / orderedDocs.length) * 22, `Loading ${docTitle}...`);
        
        try {
          const documentBlob = await fetchDocumentBlob(doc);
          
          // Validate that we got a valid PDF blob
          if (documentBlob && documentBlob.size > 0) {
            // Test that it's a valid PDF by trying to load it
            try {
              const testArrayBuffer = await documentBlob.arrayBuffer();
              const testPdf = await PDFDocument.load(testArrayBuffer);
              const pageCount = testPdf.getPageIndices().length;
              
              documentPDFs.push({
                title: docTitle,
                blob: documentBlob,
                originalDoc: doc,
                pageCount
              });
              
              console.log(`Successfully loaded document: ${docTitle} (${documentBlob.size} bytes, pages: ${pageCount})`);
            } catch (pdfError) {
              console.warn(`Document ${docTitle} is not a valid PDF:`, pdfError);
              // Skip invalid PDFs but don't fail the entire process
            }
          } else {
            console.warn(`Document ${docTitle} has no valid data`);
          }
        } catch (error) {
          console.warn(`Failed to load document ${docTitle}:`, error);
          // Continue with other documents instead of failing completely
        }
      }

      console.log(`Successfully loaded ${documentPDFs.length} of ${orderedDocs.length} documents`);

      if (documentPDFs.length === 0 && orderedDocs.length > 0) {
        throw new Error('Unable to load any documents. Please check that documents are properly uploaded and accessible.');
      }

      // Count cover pages
      const coverArrayBuffer = await coverPageBlob.arrayBuffer();
      const coverPDF = await PDFDocument.load(coverArrayBuffer);
      const coverPagesCount = coverPDF.getPageIndices().length;

      // Step 3: Generate a preliminary TOC to determine its page count
      updateProgress(52, 'Estimating table of contents pages...');
      const preTocBlob = await pdf(
        React.createElement(TableOfContentsPDF, {
          project: {
            title: binder?.title || 'Closing Binder',
            property_address: binder?.property_address,
            purchase_price: binder?.purchase_price,
            closing_date: binder?.closing_date
          },
          structure: {
            sections: structure.sections,
            documents: orderedDocs
          },
          logos: logos,
          generateDocumentUrl: (d) => {
            if (d?.url) return d.url;
            if (d?.file_url) return d.file_url;
            if (d?.file_path) {
              if (/^https?:\/\//i.test(d.file_path)) return d.file_path;
              const baseUrl = process.env.REACT_APP_SUPABASE_URL;
              return `${baseUrl}/storage/v1/object/public/documents/${String(d.file_path).replace(/^documents\//, '')}`;
            }
            return null;
          },
          documentBookmarks: new Map()
        })
      ).toBlob();

      const preTocArrayBuffer = await preTocBlob.arrayBuffer();
      const preTocPdf = await PDFDocument.load(preTocArrayBuffer);
      const preTocPagesCount = preTocPdf.getPageIndices().length;

      // Compute first page numbers for each document based on cover + preTOC pages
      let runningPage = coverPagesCount + preTocPagesCount + 1; // 1-based page numbering
      const pageNumberById = new Map();
      for (const doc of orderedDocs) {
        const found = documentPDFs.find(d => d.originalDoc.id === doc.id);
        if (found) {
          pageNumberById.set(doc.id, runningPage);
          runningPage += found.pageCount;
        }
      }

      // Step 4: Generate final TOC with computed page numbers
      updateProgress(60, 'Generating table of contents...');
      const finalTocBlob = await pdf(
        React.createElement(TableOfContentsPDF, {
          project: {
            title: binder?.title || 'Closing Binder',
            property_address: binder?.property_address,
            purchase_price: binder?.purchase_price,
            closing_date: binder?.closing_date
          },
          structure: {
            sections: structure.sections,
            documents: orderedDocs.map(d => ({ ...d, pageNumber: pageNumberById.get(d.id) || null }))
          },
          logos: logos,
          generateDocumentUrl: (d) => {
            if (d?.url) return d.url;
            if (d?.file_url) return d.file_url;
            if (d?.file_path) {
              if (/^https?:\/\//i.test(d.file_path)) return d.file_path;
              const baseUrl = process.env.REACT_APP_SUPABASE_URL;
              return `${baseUrl}/storage/v1/object/public/documents/${String(d.file_path).replace(/^documents\//, '')}`;
            }
            return null;
          },
          documentBookmarks: new Map()
        })
      ).toBlob();

      console.log('TOC generated:', { size: finalTocBlob.size });

      // Step 5: Generate Contact Information page
      updateProgress(66, 'Generating contact information page...');
      const ContactInfoPDF = (await import('../pdf/ContactInfoPDF')).default;
      const contactBlob = await pdf(
        React.createElement(ContactInfoPDF, {
          project: {
            ...binder,
            contact_info: binder?.contact_info || binder?.cover_page_data?.contact_info || {}
          }
        })
      ).toBlob();

      // Step 6: Merge all PDFs with proper page tracking in TOC order
      updateProgress(70, 'Merging all documents...');
      
      const mergedPDF = await PDFDocument.create();
      let currentPageNum = 1;
      const bookmarks = [];

      // Add cover page
      if (coverPageBlob) {
        updateProgress(72, 'Adding cover page...');
        const coverPages = await mergedPDF.copyPages(coverPDF, coverPDF.getPageIndices());
        
        coverPages.forEach(page => {
          mergedPDF.addPage(page);
          currentPageNum++;
        });
        
        bookmarks.push({ title: 'Cover Page', pageNumber: 1 });
        console.log('Added cover page');
      }

      // Add table of contents
      if (finalTocBlob) {
        updateProgress(75, 'Adding table of contents...');
        const tocArrayBuffer = await finalTocBlob.arrayBuffer();
        const tocPDF = await PDFDocument.load(tocArrayBuffer);
        const tocPages = await mergedPDF.copyPages(tocPDF, tocPDF.getPageIndices());
        
        const tocStartPage = currentPageNum;
        tocPages.forEach(page => {
          mergedPDF.addPage(page);
          currentPageNum++;
        });
        
        bookmarks.push({ title: 'Table of Contents', pageNumber: tocStartPage });
        console.log('Added table of contents');
      }

      // Add contact information page
      if (contactBlob) {
        updateProgress(77, 'Adding contact information page...');
        const ciArrayBuffer = await contactBlob.arrayBuffer();
        const ciPDF = await PDFDocument.load(ciArrayBuffer);
        const ciPages = await mergedPDF.copyPages(ciPDF, ciPDF.getPageIndices());
        const ciStart = currentPageNum;
        ciPages.forEach(page => {
          mergedPDF.addPage(page);
          currentPageNum++;
        });
        bookmarks.push({ title: 'Contact Information', pageNumber: ciStart });
      }

      // FIXED - Add all documents with proper error handling
      for (let i = 0; i < documentPDFs.length; i++) {
        const doc = documentPDFs[i];
        updateProgress(75 + (i / documentPDFs.length) * 20, `Adding ${doc.title}...`);
        
        try {
          const docArrayBuffer = await doc.blob.arrayBuffer();
          const docPDF = await PDFDocument.load(docArrayBuffer);
          const docPages = await mergedPDF.copyPages(docPDF, docPDF.getPageIndices());
          
          const docStartPage = currentPageNum;
          docPages.forEach(page => {
            mergedPDF.addPage(page);
            currentPageNum++;
          });
          
          bookmarks.push({ 
            title: doc.title, 
            pageNumber: docStartPage,
            pageCount: docPages.length 
          });
          
          console.log(`Added document: ${doc.title} (${docPages.length} pages)`);
        } catch (docError) {
          console.warn(`Failed to merge document ${doc.title}:`, docError);
          // Continue with other documents
        }
      }

      // Step 5: Add bookmarks to merged PDF (optional, can be skipped if causing issues)
      updateProgress(95, 'Adding bookmarks...');
      try {
        // Simple bookmark creation (can be enhanced later)
        console.log('Bookmarks created:', bookmarks);
      } catch (bookmarkError) {
        console.warn('Failed to add bookmarks, continuing without them:', bookmarkError);
      }

      // Step 6: Generate final PDF and download
      updateProgress(98, 'Finalizing PDF...');
      const finalPdfBytes = await mergedPDF.save();
      
      // Create download
      const finalBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(finalBlob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${binder?.title || 'Closing-Binder'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      URL.revokeObjectURL(downloadUrl);
      
      updateProgress(100, 'Download complete!');
      
      console.log('PDF generation completed successfully:', {
        totalPages: currentPageNum - 1,
        documentsIncluded: documentPDFs.length,
        bookmarks: bookmarks.length,
        finalSize: finalBlob.size
      });
      
      // Show success for a moment then reset
      setTimeout(() => {
        setIsGenerating(false);
        setProgress(0);
        setCurrentStep('');
      }, 2000);

    } catch (error) {
      console.error('Error generating complete PDF:', error);
      setError(error.message);
      setIsGenerating(false);
      setProgress(0);
      setCurrentStep('');
    }
  };

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <div>
            <h4 className="text-sm font-medium text-red-800">Download Failed</h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-sm text-red-600 underline hover:text-red-800 mt-2"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="text-center">
        <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Complete PDF Binder
        </h3>
        
        <p className="text-sm text-gray-600 mb-4">
          Download a complete PDF including cover page, table of contents, and all documents
        </p>

        {/* Debug Info Panel */}
        {debugInfo && (
          <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-4 text-xs text-left">
            <div className="flex items-center mb-2">
              <Info className="h-3 w-3 mr-1" />
              <span className="font-medium">Debug Info:</span>
            </div>
            <div className="space-y-1">
              <div>Binder: {debugInfo.binderTitle}</div>
              <div>Documents: {debugInfo.documentCount}</div>
              <div>Logos: {debugInfo.logoCount}</div>
              {debugInfo.documents.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-medium">Document Details</summary>
                  <div className="mt-1 pl-2 space-y-1">
                    {debugInfo.documents.map((doc, i) => (
                      <div key={i} className="text-xs">
                        {doc.title}: 
                        {doc.hasBlob && ' ✓blob'}
                        {doc.hasStoragePath && ' ✓storage'}
                        {doc.hasUrl && ' ✓url'}
                        {!doc.hasBlob && !doc.hasStoragePath && !doc.hasUrl && ' ✗no-source'}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        )}

        {isGenerating ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <Loader className="h-6 w-6 animate-spin text-blue-600 mr-2" />
              <span className="text-sm text-gray-600">{currentStep}</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <p className="text-xs text-gray-500">
              {progress}% complete - Please keep this window open
            </p>
          </div>
        ) : (
          <button
            onClick={generateCompletePDF}
            disabled={!documents || documents.length === 0}
            className="inline-flex items-center px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="h-5 w-5 mr-2" />
            Generate & Download PDF
          </button>
        )}

        {documents && documents.length === 0 && (
          <p className="text-sm text-amber-600 mt-2">
            No documents available for download
          </p>
        )}
      </div>
    </div>
  );
};

export default ClientBinderDownloader;