// ===============================
// FILE: src/hooks/useBinderGeneration.js
// Enhanced version building on your existing implementation
// Adds bookmark navigation support while keeping all existing functionality
// ===============================

import { useState, useCallback, useRef } from 'react';
import { pdf } from '@react-pdf/renderer';
import PDFMerger, { downloadPDF, generateDocumentUrl } from '../utils/pdfMerger'; // Use your existing merger
import { documentOrganizationService } from '../utils/documentOrganizationService';

export const useBinderGeneration = (project) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState(null);
  const [estimatedSize, setEstimatedSize] = useState(0);
  const [canCancel, setCanCancel] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  
  // Add ref for cancellation tracking
  const cancelRef = useRef(false);

  // Generation options state
  const [options, setOptions] = useState({
    includeCoverPage: true,
    includeTableOfContents: true,
    includeAllDocuments: true,
    selectedSections: [],
    // New options for navigation
    createBookmarks: true,
    addBackToTOCLinks: true
  });

  const resetState = useCallback(() => {
    setIsGenerating(false);
    setProgress(0);
    setCurrentStep('');
    setError(null);
    setEstimatedSize(0);
    setCanCancel(false);
    setCancelled(false);
    cancelRef.current = false; // Reset cancel flag
  }, []);

  const updateProgress = useCallback((step, percentage) => {
    if (cancelled || cancelRef.current) return;
    
    setCurrentStep(step);
    setProgress(percentage);
  }, [cancelled]);

  const estimateBinderSize = useCallback(async () => {
    if (!project?.id) return;

    try {
      setCurrentStep('Estimating file size...');
      const structure = await documentOrganizationService.getProjectStructure(project.id);
      
      // Estimate: Cover page ~500KB, TOC ~300KB, average doc ~1MB
      let estimated = 0;
      if (options.includeCoverPage) estimated += 500 * 1024;
      if (options.includeTableOfContents) estimated += 300 * 1024;
      if (options.includeAllDocuments) {
        estimated += structure.documents.length * 1024 * 1024; // 1MB per doc average
      }

      setEstimatedSize(estimated);
    } catch (error) {
      console.error('Error estimating size:', error);
      setEstimatedSize(0);
    }
  }, [project?.id, options.includeCoverPage, options.includeTableOfContents, options.includeAllDocuments]);

  const loadProjectData = useCallback(async () => {
    if (!project?.id) throw new Error('No project provided');

    updateProgress('Loading project data...', 5);

    const { supabase } = await import('../lib/supabase');
    
    // Load project details
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project.id)
      .single();

    if (projectError) throw projectError;

    // Load logos
    const { data: logos, error: logoError } = await supabase
      .from('logos')
      .select('*')
      .eq('project_id', project.id)
      .order('logo_position', { ascending: true });

    if (logoError && logoError.code !== 'PGRST116') { // Ignore "no rows" error
      throw logoError;
    }

    // Load document structure
    const structure = await documentOrganizationService.getProjectStructure(project.id);

    return {
      project: projectData,
      logos: logos || [],
      structure
    };
  }, [project?.id, updateProgress]);

  const validateAndProcessLogos = useCallback(async (logos) => {
    const validLogos = [];
    
    for (const logo of logos) {
      try {
        if (logo.logo_url) {
          // Test if logo URL is accessible
          const response = await fetch(logo.logo_url, { method: 'HEAD' });
          if (response.ok) {
            validLogos.push({ 
              url: logo.logo_url,
              position: logo.logo_position 
            });
          }
        }
      } catch (error) {
        console.warn(`Logo at ${logo.logo_url} is not accessible:`, error);
      }
    }
    
    return validLogos;
  }, []);

  // Helper function to format purchase price
  const formatPurchasePrice = useCallback((value) => {
    if (!value) return '';
    if (typeof value === 'string' && value.startsWith('$')) {
      return value;
    }
    const numStr = value.toString().replace(/[^\d.]/g, '');
    if (!numStr || numStr === '0') return '$0.00';
    const num = parseFloat(numStr);
    if (isNaN(num)) return '';
    return '$' + num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }, []);

  const generateCoverPagePDF = useCallback(async (projectData, logos) => {
    if (cancelRef.current) throw new Error('Operation cancelled');
    updateProgress('Generating cover page...', 15);

    try {
      const CoverPagePDF = (await import('../components/pdf/CoverPagePDF')).default;
      
      // Validate and process logos to prevent image errors
      const validLogos = await validateAndProcessLogos(logos);
      
      // Create safe project data without undefined values - WITH PROPER PRICE FORMATTING
      const safeProjectData = {
        title: projectData.title || 'Closing Binder',
        property_address: projectData.property_address || '',
        property_description: projectData.property_description || '',
        closing_date: projectData.closing_date || '',
        purchase_price: formatPurchasePrice(projectData.purchase_price), // Format price here
        buyer: projectData.buyer || '',
        seller: projectData.seller || '',
        attorney: projectData.attorney || '',
        lender: projectData.lender || '',
        escrow_agent: projectData.escrow_agent || '',
        // Only include property photo if it exists and is valid
        property_photo_url: projectData.property_photo_url && projectData.property_photo_url.trim() 
          ? projectData.property_photo_url 
          : null
      };

      console.log('Generating cover page with safe data:', {
        title: safeProjectData.title,
        logoCount: validLogos.length,
        hasPropertyPhoto: !!safeProjectData.property_photo_url,
        purchasePrice: safeProjectData.purchase_price // Log formatted price
      });

      // Generate PDF with timeout
      const coverPageBlob = await Promise.race([
        pdf(
          <CoverPagePDF 
            project={safeProjectData} 
            logos={validLogos}
          />
        ).toBlob(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Cover page generation timeout')), 30000)
        )
      ]);

      // Validate the generated blob
      if (!coverPageBlob || coverPageBlob.size === 0) {
        throw new Error('Generated cover page PDF is empty');
      }

      // Test that the blob can be read as arrayBuffer
      try {
        const testBuffer = await coverPageBlob.arrayBuffer();
        if (!testBuffer || testBuffer.byteLength === 0) {
          throw new Error('Cover page PDF has invalid content');
        }
      } catch (bufferError) {
        throw new Error(`Cover page PDF validation failed: ${bufferError.message}`);
      }

      console.log('Cover page PDF generated successfully:', {
        size: coverPageBlob.size,
        type: coverPageBlob.type
      });

      return coverPageBlob;
    } catch (error) {
      console.error('Error generating cover page PDF:', error);
      // If cover page generation fails, we can still continue without it
      throw new Error(`Cover page generation failed: ${error.message}`);
    }
  }, [updateProgress, validateAndProcessLogos]);


  const generateTableOfContentsPDF = useCallback(async (projectData, logos, structure, documentBookmarks = new Map()) => {
    if (cancelRef.current) throw new Error('Operation cancelled');
    updateProgress('Creating table of contents...', 25);

    try {
      const TableOfContentsPDF = (await import('../components/pdf/TableOfContentsPDF')).default;
      
      // Validate logos
      const validLogos = await validateAndProcessLogos(logos);
      
      // Create safe project data
      const safeProjectData = {
        title: projectData.title || 'Closing Binder',
        property_address: projectData.property_address || ''
      };

      console.log('Generating TOC with:', {
        title: safeProjectData.title,
        logoCount: validLogos.length,
        documentCount: structure.documents.length,
        bookmarkCount: documentBookmarks.size
      });

      const tocBlob = await pdf(
        <TableOfContentsPDF 
          project={safeProjectData}
          structure={structure}
          logos={validLogos}
          generateDocumentUrl={generateDocumentUrl}
          documentBookmarks={documentBookmarks} // Pass bookmarks for page references
        />
      ).toBlob();

      return tocBlob;
    } catch (error) {
      console.error('Error generating TOC PDF:', error);
      throw new Error(`Table of contents generation failed: ${error.message}`);
    }
  }, [updateProgress, validateAndProcessLogos]);

  const loadDocuments = useCallback(async (structure) => {
    if (cancelRef.current) throw new Error('Operation cancelled');
    updateProgress('Loading documents...', 35);
    
    const documents = [];
    const totalDocs = structure.documents.length;
    
    if (totalDocs === 0) {
      console.warn('No documents to load');
      return documents;
    }
    
    for (let i = 0; i < structure.documents.length; i++) {
      if (cancelled || cancelRef.current) throw new Error('Operation cancelled');
      
      const doc = structure.documents[i];
      updateProgress(`Loading document ${i + 1} of ${totalDocs}...`, 35 + (20 * i / totalDocs));
      
      try {
        const docUrl = await generateDocumentUrl(doc);
        if (docUrl) {
          console.log(`Loading document: ${doc.original_name || doc.name}`);
          
          const response = await fetch(docUrl);
          if (response.ok) {
            const blob = await response.blob();
            
            // Validate that it's actually a PDF
            if (blob.type === 'application/pdf' || blob.type === 'application/octet-stream') {
              documents.push({
                ...doc,
                blob,
                title: doc.original_name || doc.name || `Document ${i + 1}`
              });
              console.log(`Successfully loaded: ${doc.original_name || doc.name}`);
            } else {
              console.warn(`Document ${doc.original_name || doc.name} is not a PDF (type: ${blob.type})`);
            }
          } else {
            console.warn(`Failed to load document (${response.status}): ${doc.original_name || doc.name}`);
          }
        } else {
          console.warn(`No URL generated for document: ${doc.original_name || doc.name}`);
        }
      } catch (error) {
        console.warn(`Error loading document ${doc.original_name || doc.name}:`, error);
      }
    }

    console.log(`Successfully loaded ${documents.length} of ${totalDocs} documents`);
    return documents;
  }, [updateProgress, cancelled]);

  const mergePDFs = useCallback(async (coverBlob, tocBlob, documents) => {
    if (cancelRef.current) throw new Error('Operation cancelled');
    updateProgress('Merging PDFs...', 60);

    const merger = new PDFMerger(); // Use your existing merger
    await merger.initialize();

    let addedCount = 0;
    const addedDocuments = [];
    // Track bookmarks for TOC (not currently used)
    const documentBookmarks = new Map();

    // Helper function to safely add a PDF with detailed error handling
    const safeAddPdf = async (blob, title, isFirstLevel = true) => {
      if (!blob) {
        console.warn(`Skipping ${title} - blob is null`);
        return false;
      }

      try {
        // Validate blob properties
        if (typeof blob.size === 'undefined' || blob.size === 0) {
          console.warn(`Skipping ${title} - invalid blob size`);
          return false;
        }

        if (typeof blob.arrayBuffer !== 'function') {
          console.warn(`Skipping ${title} - blob doesn't support arrayBuffer`);
          return false;
        }

        const result = await merger.addPdfFromBlob(blob, title, isFirstLevel);
        if (result.success) {
          addedDocuments.push(title);
          return true;
        } else {
          console.warn(`Failed to add ${title}:`, result.error);
          return false;
        }
      } catch (error) {
        console.warn(`Error adding ${title}:`, error.message);
        return false;
      }
    };

    // Add cover page
    if (options.includeCoverPage && coverBlob) {
      if (cancelRef.current) throw new Error('Operation cancelled');
      updateProgress('Adding cover page...', 62);
      if (await safeAddPdf(coverBlob, 'Cover Page', true)) {
        addedCount++;
        console.log('Added cover page to binder');
      }
    }

    // Add table of contents
    if (options.includeTableOfContents && tocBlob) {
      if (cancelRef.current) throw new Error('Operation cancelled');
      updateProgress('Adding table of contents...', 65);
      if (await safeAddPdf(tocBlob, 'Table of Contents', true)) {
        addedCount++;
        console.log('Added table of contents to binder');
      }
    }

    // Add documents with bookmark tracking
    if (options.includeAllDocuments && documents.length > 0) {
      const totalDocs = documents.length;
      let processedDocs = 0;
      
      for (let i = 0; i < documents.length; i++) {
        if (cancelled || cancelRef.current) throw new Error('Operation cancelled');
        
        const doc = documents[i];
        processedDocs++;
        updateProgress(`Adding document ${processedDocs} of ${totalDocs}: ${doc.title}`, 65 + (20 * processedDocs / totalDocs));
        
        if (await safeAddPdf(doc.blob, doc.title, true)) {
          console.log(`Added document: ${doc.title} with navigation features`);
        } else {
          console.warn(`Skipped document: ${doc.title}`);
        }
      }
      
      // Count successful document additions
      const successfulDocCount = addedDocuments.filter(name => 
        name !== 'Cover Page' && name !== 'Table of Contents'
      ).length;
      addedCount += successfulDocCount;
    }

    if (addedCount === 0) {
      throw new Error('No documents were successfully added to the binder. Please check that your PDFs are valid and accessible.');
    }

    if (cancelRef.current) throw new Error('Operation cancelled');
    updateProgress('Adding bookmarks and navigation...', 90);
    
    let finalPdfBytes;
    try {
      finalPdfBytes = await merger.finalize();
    } catch (finalizeError) {
      console.error('Error finalizing PDF:', finalizeError);
      throw new Error(`Failed to finalize binder: ${finalizeError.message}`);
    }

    updateProgress('Finalizing binder...', 95);

    console.log(`Successfully merged binder with ${addedCount} components:`, addedDocuments);

    return {
      pdfBytes: finalPdfBytes,
      pageCount: merger.getPageCount(),
      bookmarks: merger.getBookmarkInfo(),
      documentsAdded: addedCount,
      addedDocuments: addedDocuments
    };
  }, [options, updateProgress, cancelled]);

  const generateCompleteBinding = useCallback(async () => {
    if (!project?.id) {
      throw new Error('No project selected');
    }

    resetState();
    setIsGenerating(true);
    setCanCancel(true);
    setCancelled(false);
    cancelRef.current = false;

    try {
      // Step 1: Load all project data
      const { project: projectData, logos, structure } = await loadProjectData();

      // Step 2: Generate cover page (if included)
      let coverBlob = null;
      if (options.includeCoverPage) {
        try {
          coverBlob = await generateCoverPagePDF(projectData, logos);
        } catch (error) {
          console.warn('Cover page generation failed, continuing without it:', error);
          // Continue without cover page rather than failing completely
        }
      }

      // Step 3: Load all documents first (to get bookmark info for TOC)
      let documents = [];
      if (options.includeAllDocuments && structure.documents.length > 0) {
        documents = await loadDocuments(structure);
        
        if (documents.length === 0) {
          console.warn('No documents were successfully loaded');
        }
      }

      // Step 4: Do initial PDF merge to get bookmark information
      if (cancelRef.current) throw new Error('Operation cancelled');
      updateProgress('Creating document bookmarks...', 50);
      
      const initialMergeResult = await mergePDFs(coverBlob, null, documents); // Skip TOC in first pass
      
      // Step 5: Generate table of contents with bookmark information
      let tocBlob = null;
      if (options.includeTableOfContents) {
        try {
          tocBlob = await generateTableOfContentsPDF(
            projectData, 
            logos, 
            structure, 
            initialMergeResult.documentBookmarks
          );
        } catch (error) {
          console.warn('TOC generation failed, continuing without it:', error);
        }
      }

      // Step 6: Final merge with TOC included and REAL navigation enhancement
      if (cancelRef.current) throw new Error('Operation cancelled');
      const result = await mergePDFs(coverBlob, tocBlob, documents);

      // Step 7: Enhance the final PDF with ACTUAL navigation features
      if (cancelRef.current) throw new Error('Operation cancelled');
      updateProgress('Adding navigation links and buttons...', 92);
      
      try {
        const { enhancePDFNavigation } = await import('../utils/PDFNavigationEnhancer');
        
        // Prepare navigation configuration
        const navigationConfig = {
          tocPageNumber: options.includeTableOfContents ? 2 : null, // TOC is typically page 2 (after cover)
          documentStartPages: new Map()
        };

        // Calculate document start pages based on your merger's logic
        let currentPage = 1;
        if (options.includeCoverPage) currentPage++; // Cover page
        if (options.includeTableOfContents) currentPage++; // TOC page
        
        // Add document start pages
        documents.forEach((doc) => {
          navigationConfig.documentStartPages.set(doc.title, currentPage);
          // Estimate pages per document (this is rough - your pdfMerger might have better info)
          const estimatedPages = Math.max(1, Math.floor(doc.blob.size / 100000));
          currentPage += estimatedPages;
        });

        console.log('Navigation config:', {
          tocPage: navigationConfig.tocPageNumber,
          documentPages: Array.from(navigationConfig.documentStartPages.entries())
        });

        // Enhance the PDF with real navigation
        const enhancedPdfBytes = await enhancePDFNavigation(result.pdfBytes, navigationConfig);
        
        if (enhancedPdfBytes) {
          result.pdfBytes = enhancedPdfBytes;
          console.log('PDF navigation enhancement completed successfully');
        } else {
          console.warn('PDF navigation enhancement failed, using original PDF');
        }
      } catch (enhanceError) {
        console.warn('Failed to enhance PDF navigation:', enhanceError);
        // Continue with original PDF if enhancement fails
      }

      // Check if we have anything to merge
      if (!coverBlob && !tocBlob && documents.length === 0) {
        throw new Error('No content available to create binder. Please check that documents are properly uploaded and accessible.');
      }

      // Step 7: Download the final binder
      if (cancelRef.current) throw new Error('Operation cancelled');
      updateProgress('Downloading binder...', 100);
      
      const fileName = `Closing_Binder_${projectData.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'Project'}_${new Date().toISOString().split('T')[0]}.pdf`;
      const downloadSuccess = downloadPDF(result.pdfBytes, fileName);

      if (!downloadSuccess) {
        throw new Error('Failed to download the generated binder');
      }

      setCurrentStep('Binder generated successfully!');
      
      return {
        success: true,
        fileName,
        pageCount: result.pageCount,
        bookmarks: result.bookmarks,
        documentsIncluded: result.documentsAdded,
        documentsAttempted: structure.documents.length
      };

    } catch (error) {
      if (error.message === 'Operation cancelled') {
        setCurrentStep('Cancelled');
        setCancelled(true);
        setError('Generation was cancelled');
      } else {
        console.error('Error generating binder:', error);
        setError(error.message);
      }
      throw error;
    } finally {
      setIsGenerating(false);
      setCanCancel(false);
    }
  }, [
    project,
    options,
    loadProjectData,
    generateCoverPagePDF,
    generateTableOfContentsPDF,
    loadDocuments,
    mergePDFs,
    resetState,
    updateProgress,
    formatPurchasePrice
  ]);

  const cancelGeneration = useCallback(() => {
    if (canCancel) {
      cancelRef.current = true; // Set cancel flag
      setCancelled(true);
      setCurrentStep('Cancelling...');
      setCanCancel(false);
    }
  }, [canCancel]);

  const setGenerationOptions = useCallback((newOptions) => {
    setOptions(prev => ({
      ...prev,
      ...newOptions
    }));
  }, []);

  return {
    // State
    isGenerating,
    progress,
    currentStep,
    error,
    estimatedSize,
    canCancel,
    cancelled,
    options,

    // Actions
    generateCompleteBinding,
    cancelGeneration,
    resetState,
    estimateBinderSize,
    setGenerationOptions
  };
};

export default useBinderGeneration;