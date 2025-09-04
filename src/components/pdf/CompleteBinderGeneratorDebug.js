// ===============================
// TEMPORARY DEBUG VERSION - Use to isolate the sizeInBytes error
// Save as: CompleteBinderGeneratorDebug.js
// ===============================

import React, { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Download, FileText, AlertCircle } from 'lucide-react';

const CompleteBinderGeneratorDebug = ({ project }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState(null);

  const handleDebugGeneration = async () => {
    setIsGenerating(true);
    setError(null);
    setProgress(0);

    try {
      // Step 1: Test Cover Page Generation Only
      setCurrentStep('Testing cover page generation only...');
      setProgress(25);

      const CoverPagePDF = (await import('./CoverPagePDF')).default;
      
      // Create minimal safe project data
      const testProject = {
        title: project?.title || 'Test Binder',
        property_address: project?.property_address || '123 Test Street',
        // Explicitly exclude any image fields to avoid image errors
        property_photo_url: null,
        property_description: 'Test property description',
        purchase_price: '$500,000'
      };

      console.log('Testing with minimal project data:', testProject);

      setCurrentStep('Generating cover page PDF...');
      setProgress(50);

      // Generate cover page with no logos and no property photo
      const coverBlob = await pdf(
        <CoverPagePDF 
          project={testProject} 
          logos={[]} // Empty logos array
        />
      ).toBlob();

      console.log('Cover page generated successfully:', {
        size: coverBlob.size,
        type: coverBlob.type
      });

      setCurrentStep('Testing PDF blob validation...');
      setProgress(75);

      // Test blob validation
      if (!coverBlob || coverBlob.size === 0) {
        throw new Error('Generated PDF blob is invalid');
      }

      // Test arrayBuffer access (this is where sizeInBytes might fail)
      const testBuffer = await coverBlob.arrayBuffer();
      console.log('ArrayBuffer test passed:', {
        byteLength: testBuffer.byteLength
      });

      setCurrentStep('Testing PDF-lib loading...');
      setProgress(90);

      // Test loading with pdf-lib (this is likely where the error occurs)
      const { PDFDocument } = await import('pdf-lib');
      const testDoc = await PDFDocument.load(testBuffer, {
        ignoreEncryption: true,
        throwOnInvalidObject: false
      });

      console.log('PDF-lib loading test passed:', {
        pageCount: testDoc.getPageCount()
      });

      setCurrentStep('Debug test completed successfully!');
      setProgress(100);

      // Simple download for testing
      const url = URL.createObjectURL(coverBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'debug-cover-page.pdf';
      link.click();
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Debug generation failed:', error);
      setError(error.message);
      setCurrentStep('Debug test failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFullDebugGeneration = async () => {
    setIsGenerating(true);
    setError(null);
    setProgress(0);

    try {
      // Test the full process but with extensive logging
      setCurrentStep('Loading project data...');
      setProgress(10);

      const { supabase } = await import('../../lib/supabase');
      
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', project.id)
        .single();

      if (projectError) throw projectError;

      console.log('Loaded project data:', projectData);

      setCurrentStep('Loading logos...');
      setProgress(20);

      const { data: logos, error: logoError } = await supabase
        .from('logos')
        .select('*')
        .eq('project_id', project.id)
        .order('logo_position', { ascending: true });

      console.log('Loaded logos:', logos);

      setCurrentStep('Testing cover page with real data...');
      setProgress(40);

      const CoverPagePDF = (await import('./CoverPagePDF')).default;
      
      // Use real data but force safe values for images
      const safeProjectData = {
        ...projectData,
        property_photo_url: null // Force no property photo
      };

      const safeLogos = []; // Force no logos for now

      console.log('Generating with safe data:', safeProjectData);

      const coverBlob = await pdf(
        <CoverPagePDF 
          project={safeProjectData} 
          logos={safeLogos}
        />
      ).toBlob();

      console.log('Real data cover page generated:', {
        size: coverBlob.size,
        type: coverBlob.type
      });

      setCurrentStep('Testing PDF merger initialization...');
      setProgress(60);

      const PDFMerger = (await import('../../utils/pdfMerger')).default;
      const merger = new PDFMerger();
      await merger.initialize();

      console.log('PDF merger initialized');

      setCurrentStep('Testing PDF addition to merger...');
      setProgress(80);

      const result = await merger.addPdfFromBlob(coverBlob, 'Debug Cover Page', true);
      console.log('PDF addition result:', result);

      if (!result.success) {
        throw new Error(`PDF addition failed: ${result.error}`);
      }

      setCurrentStep('Testing PDF finalization...');
      setProgress(90);

      const finalBytes = await merger.finalize();
      console.log('PDF finalization successful:', {
        bytesLength: finalBytes.length
      });

      setCurrentStep('Debug full test completed!');
      setProgress(100);

      // Download result
      const finalBlob = new Blob([finalBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(finalBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'debug-full-binder.pdf';
      link.click();
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Full debug generation failed:', error);
      setError(error.message);
      setCurrentStep('Full debug test failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-900 mb-2">Debug Mode</h3>
        <p className="text-sm text-yellow-800">
          This debug version will test each step individually to isolate the sizeInBytes error.
          Check the browser console for detailed logs.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-900">Error Details:</h4>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <button
          onClick={handleDebugGeneration}
          disabled={isGenerating}
          className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <FileText className="h-4 w-4 mr-2" />
          Test Cover Page Only (Minimal Data)
        </button>

        <button
          onClick={handleFullDebugGeneration}
          disabled={isGenerating}
          className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          <Download className="h-4 w-4 mr-2" />
          Test Full Process (Real Data, No Images)
        </button>
      </div>

      {isGenerating && (
        <div className="space-y-2">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm text-gray-600">{currentStep}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 text-center">{progress}%</div>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Debug Instructions:</h4>
        <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
          <li>First, try "Test Cover Page Only" - this tests basic PDF generation</li>
          <li>If that works, try "Test Full Process" - this tests the merger</li>
          <li>Check the browser console for detailed error messages</li>
          <li>Report which step fails and the exact error message</li>
        </ol>
      </div>
    </div>
  );
};

export default CompleteBinderGeneratorDebug;