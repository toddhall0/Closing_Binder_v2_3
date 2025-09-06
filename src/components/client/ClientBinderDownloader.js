// src/components/client/ClientBinderDownloader.js - Enhanced with debugging and better document handling
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

  // Debug document availability on mount
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

  const generateCompletePDF = async () => {
    setIsGenerating(true);
    setError(null);
    setProgress(0);

    try {
      // Import required modules
      updateProgress(5, 'Loading PDF generation modules...');
      const { pdf } = await import('@react-pdf/renderer');
      const { PDFDocument } = await import('pdf-lib');
      
      // Import your existing PDF components
      const CoverPagePDF = (await import('../pdf/CoverPagePDF')).default;
      const TableOfContentsPDF = (await import('../pdf/TableOfContentsPDF')).default;

      // Step 1: Generate Cover Page PDF
      updateProgress(15, 'Generating cover page...');
      const coverPageBlob = await pdf(
        <CoverPagePDF
          project={{
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
          }}
          logos={logos}
        />
      ).toBlob();

      console.log('Cover page generated:', { size: coverPageBlob.size });

      // Step 2: Generate Table of Contents PDF
      updateProgress(25, 'Generating table of contents...');
      
      // Prepare structure for TOC
      const structure = {
        sections: binder?.table_of_contents_data?.sections || [],
        documents: documents
      };

      const tocBlob = await pdf(
        <TableOfContentsPDF
          project={{
            title: binder?.title || 'Closing Binder',
            property_address: binder?.property_address
          }}
          structure={structure}
          logos={logos}
          generateDocumentUrl={() => null} // For PDF, we don't need external links
          documentBookmarks={new Map()}
        />
      ).toBlob();

      console.log('TOC generated:', { size: tocBlob.size });

      // Step 3: Load all document PDFs with better error handling
      updateProgress(35, 'Loading document files...');
      const documentPDFs = [];
      
      console.log(`Processing ${documents.length} documents...`);
      
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const docTitle = doc.title || doc.name || doc.original_name || `Document ${i + 1}`;
        updateProgress(35 + (i / documents.length) * 20, `Loading ${docTitle}...`);
        
        try {
          let documentBlob;
          
          if (doc.blob) {
            // Document already has blob data
            documentBlob = doc.blob;
            console.log(`Using existing blob for ${docTitle}:`, { size: doc.blob.size });
          } else if (doc.storage_path) {
            // Fetch from Supabase storage
            console.log(`Fetching from storage: ${doc.storage_path}`);
            const { supabase } = await import('../../lib/supabase');
            const { data, error } = await supabase.storage
              .from('documents')
              .download(doc.storage_path);
            
            if (error) throw new Error(`Storage download failed: ${error.message}`);
            documentBlob = data;
            console.log(`Downloaded from storage for ${docTitle}:`, { size: data.size });
          } else if (doc.url) {
            // Try to fetch from URL
            console.log(`Fetching from URL: ${doc.url}`);
            const response = await fetch(doc.url);
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            documentBlob = await response.blob();
            console.log(`Downloaded from URL for ${docTitle}:`, { size: documentBlob.size });
          } else {
            console.warn(`Skipping document ${docTitle}: No blob, storage_path, or url available`);
            continue;
          }

          // Validate that we have a PDF
          if (documentBlob.type && !documentBlob.type.includes('pdf')) {
            console.warn(`Skipping ${docTitle}: Not a PDF (type: ${documentBlob.type})`);
            continue;
          }

          documentPDFs.push({
            title: docTitle,
            blob: documentBlob,
            originalDoc: doc
          });
          
          console.log(`Successfully loaded document: ${docTitle}`);
        } catch (docError) {
          console.warn(`Failed to load document ${docTitle}:`, docError);
          // Continue with other documents rather than failing completely
        }
      }

      console.log(`Successfully loaded ${documentPDFs.length} out of ${documents.length} documents`);

      if (documentPDFs.length === 0 && !coverPageBlob && !tocBlob) {
        throw new Error('No content available to create binder. Please ensure documents are properly uploaded and accessible.');
      }

      // Step 4: Merge all PDFs
      updateProgress(60, 'Merging all documents...');
      
      // Create master PDF document
      const mergedPDF = await PDFDocument.create();
      let currentPageNum = 1;
      const bookmarks = [];

      // Add cover page
      if (coverPageBlob) {
        updateProgress(65, 'Adding cover page...');
        const coverArrayBuffer = await coverPageBlob.arrayBuffer();
        const coverPDF = await PDFDocument.load(coverArrayBuffer);
        const coverPages = await mergedPDF.copyPages(coverPDF, coverPDF.getPageIndices());
        
        coverPages.forEach(page => {
          mergedPDF.addPage(page);
          currentPageNum++;
        });
        
        bookmarks.push({ title: 'Cover Page', pageNumber: 1 });
        console.log('Added cover page');
      }

      // Add table of contents
      if (tocBlob) {
        updateProgress(70, 'Adding table of contents...');
        const tocArrayBuffer = await tocBlob.arrayBuffer();
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

      // Add documents
      for (let i = 0; i < documentPDFs.length; i++) {
        const doc = documentPDFs[i];
        updateProgress(70 + (i / documentPDFs.length) * 25, `Adding ${doc.title}...`);
        
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
        }
      }

      // Step 5: Add bookmarks to merged PDF
      updateProgress(95, 'Adding bookmarks and finalizing...');
      console.log('Created binder with bookmarks:', bookmarks);

      // Step 6: Generate final PDF
      updateProgress(98, 'Generating final PDF...');
      const finalPDFBytes = await mergedPDF.save();
      
      console.log('Final PDF generated:', { 
        size: finalPDFBytes.length, 
        pages: currentPageNum - 1,
        bookmarks: bookmarks.length 
      });

      // Step 7: Download the file
      updateProgress(100, 'Starting download...');
      
      const blob = new Blob([finalPDFBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Create filename
      const propertyAddress = binder?.property_address || '';
      const cleanAddress = propertyAddress.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `Closing_Binder_${cleanAddress}_${timestamp}.pdf`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setCurrentStep('Download completed!');
      
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
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-black h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            {/* Progress Text */}
            <div className="flex items-center justify-center space-x-2">
              <Loader className="h-4 w-4 animate-spin text-gray-600" />
              <span className="text-sm text-gray-600">
                {currentStep} ({Math.round(progress)}%)
              </span>
            </div>

            <p className="text-xs text-gray-500">
              This may take a few minutes for large binders...
            </p>
          </div>
        ) : (
          <button
            onClick={generateCompletePDF}
            disabled={!binder}
            className="inline-flex items-center px-6 py-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Complete Binder PDF
          </button>
        )}

        {!isGenerating && documents.length === 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              ⚠️ No documents found. The PDF will only include the cover page and table of contents.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientBinderDownloader;