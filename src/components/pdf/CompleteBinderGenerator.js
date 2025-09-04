// ===============================
// FILE: src/components/pdf/CompleteBinderGenerator.js
// Complete Binder Generator - Production Ready Implementation
// ===============================

import React, { useState, useEffect } from 'react';
import { 
  Download, 
  FileText, 
  AlertCircle, 
  Settings, 
  Play, 
  Square,
  CheckCircle,
  XCircle,
  Info,
  Loader
} from 'lucide-react';
import { useBinderGeneration } from '../../hooks/useBinderGeneration';

const CompleteBinderGenerator = ({ project }) => {
  const {
    isGenerating,
    progress,
    currentStep,
    error,
    estimatedSize,
    canCancel,
    cancelled,
    options,
    generateCompleteBinding,
    cancelGeneration,
    resetState,
    estimateBinderSize,
    setGenerationOptions
  } = useBinderGeneration(project);

  const [showOptions, setShowOptions] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);

  // Load initial size estimate when component mounts
  useEffect(() => {
    if (project?.id && !isGenerating) {
      estimateBinderSize();
    }
  }, [project?.id, options, estimateBinderSize, isGenerating]);

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleGenerateBinder = async () => {
    resetState();
    setGenerationResult(null);
    
    try {
      const result = await generateCompleteBinding();
      setGenerationResult(result);
    } catch (err) {
      console.error('Binder generation failed:', err);
      // Error is already set in the hook
    }
  };

  const handleOptionsChange = (optionKey, value) => {
    setGenerationOptions({ [optionKey]: value });
  };

  const ProgressBar = () => (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className="bg-black h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );

  const StatusIcon = () => {
    if (error) return <XCircle className="h-5 w-5 text-red-500" />;
    if (generationResult) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (isGenerating) return <Loader className="h-5 w-5 animate-spin text-blue-500" />;
    return <FileText className="h-5 w-5 text-gray-400" />;
  };

  const GenerationOptions = () => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
      <h4 className="font-medium text-gray-900 flex items-center">
        <Settings className="h-4 w-4 mr-2" />
        Generation Options
      </h4>
      
      <div className="space-y-3">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={options.includeCoverPage}
            onChange={(e) => handleOptionsChange('includeCoverPage', e.target.checked)}
            className="rounded border-gray-300 text-black focus:ring-black"
            disabled={isGenerating}
          />
          <span className="ml-2 text-sm text-gray-700">Include cover page</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={options.includeTableOfContents}
            onChange={(e) => handleOptionsChange('includeTableOfContents', e.target.checked)}
            className="rounded border-gray-300 text-black focus:ring-black"
            disabled={isGenerating}
          />
          <span className="ml-2 text-sm text-gray-700">Include table of contents</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={options.includeAllDocuments}
            onChange={(e) => handleOptionsChange('includeAllDocuments', e.target.checked)}
            className="rounded border-gray-300 text-black focus:ring-black"
            disabled={isGenerating}
          />
          <span className="ml-2 text-sm text-gray-700">Include all documents</span>
        </label>
      </div>

      {estimatedSize > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center text-sm text-blue-800">
            <Info className="h-4 w-4 mr-2" />
            <span>Estimated size: {formatFileSize(estimatedSize)}</span>
          </div>
        </div>
      )}
    </div>
  );

  const ErrorDisplay = () => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center">
        <XCircle className="h-5 w-5 text-red-500 mr-2" />
        <div>
          <h4 className="font-medium text-red-900">Generation Failed</h4>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
      <div className="mt-3">
        <button
          onClick={resetState}
          className="text-sm text-red-700 hover:text-red-900 underline"
        >
          Try again
        </button>
      </div>
    </div>
  );

  const SuccessDisplay = () => (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center">
        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
        <div>
          <h4 className="font-medium text-green-900">Binder Generated Successfully!</h4>
          <div className="text-sm text-green-700 mt-1 space-y-1">
            {generationResult?.fileName && (
              <p>File: {generationResult.fileName}</p>
            )}
            {generationResult?.pageCount && (
              <p>Pages: {generationResult.pageCount}</p>
            )}
            {generationResult?.documentsIncluded !== undefined && (
              <p>Documents included: {generationResult.documentsIncluded}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const GenerationProgress = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <StatusIcon />
          <span className="ml-2 text-sm font-medium text-gray-900">
            {currentStep || 'Preparing...'}
          </span>
        </div>
        <span className="text-sm text-gray-600">{progress.toFixed(0)}%</span>
      </div>
      
      <ProgressBar />

      {canCancel && (
        <button
          onClick={cancelGeneration}
          className="flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50 transition-colors"
        >
          <Square className="h-3 w-3 mr-1" />
          Cancel
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Complete Binder Generator</h2>
          <p className="text-sm text-gray-600 mt-1">
            Generate a complete closing binder with cover page, table of contents, and all documents
          </p>
        </div>
      </div>

      {/* Project Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-blue-500 mr-2" />
          <div className="text-left">
            <p className="text-sm font-medium text-blue-900">
              Project: {project?.title || 'Untitled Project'}
            </p>
            {project?.property_address && (
              <p className="text-sm text-blue-700">
                Address: {project.property_address}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Options Panel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Configuration</h3>
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900"
            disabled={isGenerating}
          >
            <Settings className="h-4 w-4 mr-1" />
            {showOptions ? 'Hide Options' : 'Show Options'}
          </button>
        </div>

        {showOptions && <GenerationOptions />}
      </div>

      {/* Main Generation Interface */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {/* Status Display */}
        {error && <ErrorDisplay />}
        {generationResult && !error && <SuccessDisplay />}
        
        {/* Generation Progress or Start Interface */}
        {isGenerating ? (
          <GenerationProgress />
        ) : (
          <div className="text-center">
            <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Ready to Generate Complete Binder
            </h3>
            
            <p className="text-gray-600 mb-6">
              This will create a single PDF containing all selected components in proper order.
            </p>

            {!generationResult && !error && (
              <button
                onClick={handleGenerateBinder}
                disabled={isGenerating || !project?.id}
                className="inline-flex items-center px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="h-5 w-5 mr-2" />
                Generate Complete Binder
              </button>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">What will be included:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          {options.includeCoverPage && (
            <li>• Professional cover page with property information and logos</li>
          )}
          {options.includeTableOfContents && (
            <li>• Table of contents with document structure and navigation</li>
          )}
          {options.includeAllDocuments && (
            <li>• All documents organized according to your structure</li>
          )}
          <li>• Proper page numbering and PDF bookmarks</li>
          <li>• Print-ready formatting for professional presentation</li>
        </ul>
      </div>

      {/* Technical Requirements */}
      {isGenerating && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <h4 className="font-medium text-yellow-900">Please wait</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Large binders may take several minutes to generate. Please keep this tab open during processing.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompleteBinderGenerator;