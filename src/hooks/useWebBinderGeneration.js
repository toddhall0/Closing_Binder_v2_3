// src/hooks/useWebBinderGeneration.js
import { useState, useCallback } from 'react';

const useWebBinderGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState(null);
  const [generatedData, setGeneratedData] = useState(null);

  const generateDocumentUrl = useCallback((document) => {
    // Reuse your existing generateDocumentUrl logic
    if (document.url) {
      return document.url;
    }
    if (document.file_url) {
      return document.file_url;
    }
    if (document.storage_path) {
      // Add your Supabase URL generation logic here
      return `${process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/documents/${document.storage_path}`;
    }
    if (document.file_path) {
      return `${process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/documents/${document.file_path}`;
    }
    return null;
  }, []);

  const validateRequiredData = useCallback((propertyData, transactionData, documents) => {
    const errors = [];
    
    if (!propertyData?.address) {
      errors.push('Property address is required');
    }
    
    // Make purchase price optional for now
    // if (!transactionData?.purchasePrice) {
    //   errors.push('Purchase price is required');
    // }
    
    // Make documents optional - allow empty binders
    // if (!documents || documents.length === 0) {
    //   errors.push('At least one document is required');
    // }
    
    return errors;
  }, []);

  const processDocuments = useCallback(async (documents) => {
    setCurrentStep('Processing documents...');
    
    // Validate document URLs
    const processedDocs = [];
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const documentUrl = generateDocumentUrl(doc);
      
      if (documentUrl) {
        processedDocs.push({
          ...doc,
          processedUrl: documentUrl,
          isAccessible: true
        });
      } else {
        processedDocs.push({
          ...doc,
          processedUrl: null,
          isAccessible: false
        });
      }
      
      setProgress((i + 1) / documents.length * 30); // 30% for document processing
    }
    
    return processedDocs;
  }, [generateDocumentUrl]);

  const processLogos = useCallback(async (logoFile, logoUrl) => {
    setCurrentStep('Processing logos...');
    setProgress(40);
    
    let finalLogoUrl = logoUrl;
    
    if (logoFile && logoFile instanceof File) {
      try {
        // Convert File to URL for web display
        finalLogoUrl = URL.createObjectURL(logoFile);
      } catch (err) {
        console.warn('Failed to process logo file:', err);
        finalLogoUrl = logoUrl; // Fallback to provided URL
      }
    }
    
    return finalLogoUrl;
  }, []);

  const processPropertyPhoto = useCallback(async (photoFile, photoUrl) => {
    setCurrentStep('Processing property photo...');
    setProgress(50);
    
    let finalPhotoUrl = photoUrl;
    
    if (photoFile && photoFile instanceof File) {
      try {
        // Convert File to URL for web display
        finalPhotoUrl = URL.createObjectURL(photoFile);
      } catch (err) {
        console.warn('Failed to process property photo:', err);
        finalPhotoUrl = photoUrl; // Fallback to provided URL
      }
    }
    
    return finalPhotoUrl;
  }, []);

  const generateWebBinder = useCallback(async ({
    propertyData,
    transactionData,
    documents = [],
    logoFile = null,
    logoUrl = null,
    propertyPhotoFile = null,
    propertyPhotoUrl = null,
    options = {}
  }) => {
    try {
      setIsGenerating(true);
      setProgress(0);
      setError(null);
      setGeneratedData(null);
      
      // Step 1: Validate input data
      setCurrentStep('Validating data...');
      const validationErrors = validateRequiredData(propertyData, transactionData, documents);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }
      setProgress(10);

      // Step 2: Process documents
      const processedDocuments = await processDocuments(documents);
      setProgress(30);

      // Step 3: Process logos
      const finalLogoUrl = await processLogos(logoFile, logoUrl);
      setProgress(50);

      // Step 4: Process property photo
      const finalPropertyPhotoUrl = await processPropertyPhoto(propertyPhotoFile, propertyPhotoUrl);
      setProgress(70);

      // Step 5: Prepare final data structure
      setCurrentStep('Preparing web binder data...');
      const webBinderData = {
        propertyData,
        transactionData,
        documents: processedDocuments,
        logoUrl: finalLogoUrl,
        propertyPhotoUrl: finalPropertyPhotoUrl,
        generatedDate: new Date().toISOString(),
        metadata: {
          totalDocuments: processedDocuments.length,
          accessibleDocuments: processedDocuments.filter(d => d.isAccessible).length,
          inaccessibleDocuments: processedDocuments.filter(d => !d.isAccessible).length,
          generationType: 'web',
          ...options
        }
      };

      setProgress(90);

      // Step 6: Final validation
      setCurrentStep('Finalizing...');
      if (webBinderData.metadata.inaccessibleDocuments > 0) {
        console.warn(`${webBinderData.metadata.inaccessibleDocuments} documents are not accessible`);
      }

      setProgress(100);
      setCurrentStep('Complete');
      setGeneratedData(webBinderData);
      
      return webBinderData;

    } catch (err) {
      console.error('Web binder generation failed:', err);
      setError(err.message || 'Failed to generate web binder');
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [validateRequiredData, processDocuments, processLogos, processPropertyPhoto]);

  const resetGeneration = useCallback(() => {
    setIsGenerating(false);
    setProgress(0);
    setCurrentStep('');
    setError(null);
    setGeneratedData(null);
  }, []);

  const getDocumentsBySection = useCallback((documents) => {
    const sections = {};
    documents.forEach(doc => {
      const section = doc.section || 'Other Documents';
      if (!sections[section]) {
        sections[section] = [];
      }
      sections[section].push(doc);
    });
    return sections;
  }, []);

  const exportBinderData = useCallback((data, format = 'json') => {
    if (!data) return null;
    
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'summary':
        return {
          property: data.propertyData?.address || 'Unknown Address',
          purchasePrice: data.transactionData?.purchasePrice || 0,
          documentCount: data.documents?.length || 0,
          generatedDate: data.generatedDate,
          sections: getDocumentsBySection(data.documents || [])
        };
      default:
        return data;
    }
  }, [getDocumentsBySection]);

  return {
    // State
    isGenerating,
    progress,
    currentStep,
    error,
    generatedData,
    
    // Actions
    generateWebBinder,
    resetGeneration,
    
    // Utilities
    generateDocumentUrl,
    getDocumentsBySection,
    exportBinderData,
    
    // Validation
    validateRequiredData
  };
};

export default useWebBinderGeneration;