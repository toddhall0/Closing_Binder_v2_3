// src/components/upload/DocumentUpload.js

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useFileUpload } from '../../hooks/useFileUpload';
import UploadQueue from './UploadQueue';
import FilePreview from './FilePreview';
import LoadingSpinner from '../ui/LoadingSpinner';

const DocumentUpload = ({ projectId, sectionId = null, onUploadComplete }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  
  // Create a callback that triggers parent component's onUploadComplete
  const handleIndividualUploadComplete = (document) => {
    // This gets called for each individual upload completion
    if (onUploadComplete) {
      onUploadComplete(1); // Pass 1 since this is called per document
    }
  };
  
  const {
    uploadQueue,
    isUploading,
    uploadStats,
    addToQueue,
    retryUpload,
    removeFromQueue,
    clearQueue,
    clearCompleted,
    // autoProcessQueue is managed internally via effect; not used directly here
  } = useFileUpload(projectId, sectionId, handleIndividualUploadComplete);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setValidationErrors([]);
    
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(rejected => ({
        fileName: rejected.file.name,
        errors: rejected.errors.map(error => {
          switch (error.code) {
            case 'file-too-large':
              return 'File is too large (max 100MB)';
            case 'file-invalid-type':
              return 'Only PDF files are allowed';
            default:
              return error.message;
          }
        })
      }));
      setValidationErrors(errors);
    }
    
    // Add accepted files to preview
    if (acceptedFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...acceptedFiles]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 100 * 1024 * 1024, // 100MB (increased from 50MB)
    multiple: true
  });

  const handleRemoveFile = (fileToRemove) => {
    setSelectedFiles(prev => prev.filter(file => file !== fileToRemove));
  };

  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0) return;
    
    const result = addToQueue(selectedFiles);
    
    if (result.success) {
      setSelectedFiles([]);
      setValidationErrors([]);
      
      // The queue will auto-process thanks to the useEffect in useFileUpload
      // No need to manually call processQueue here
      
      // Notify parent component if provided
      if (onUploadComplete) {
        // We'll call this after uploads complete, not immediately
        console.log(`Added ${result.addedCount} files to upload queue`);
      }
    } else {
      setValidationErrors(result.errors);
    }
  };

  const handleFileInputChange = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  return (
    <div className="w-full">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-gray-600 bg-gray-50' 
            : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
          }
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          <div className="p-3 bg-gray-100 rounded-full">
            <svg className="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <div>
            {isDragActive ? (
              <p className="text-lg font-medium text-gray-700">Drop PDF files here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium text-black">
                  Drag & drop PDF files here
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  or click to browse your computer
                </p>
              </div>
            )}
          </div>
          
          <div className="text-xs text-gray-500">
            <p>Maximum file size: 100MB</p>
            <p>Supported format: PDF only</p>
            <p>Maximum 20 files per upload</p>
          </div>
        </div>
      </div>

      {/* Alternative file input for better accessibility */}
      <div className="mt-4 text-center">
        <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          Choose Files
          <input
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFileInputChange}
            className="sr-only"
          />
        </label>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
          <h4 className="text-sm font-medium text-black mb-2">Upload Errors:</h4>
          <div className="space-y-2">
            {validationErrors.map((error, index) => (
              <div key={index} className="text-sm">
                <p className="font-medium text-gray-700">{error.fileName}</p>
                <ul className="list-disc list-inside text-gray-600 ml-2">
                  {error.errors.map((err, errIndex) => (
                    <li key={errIndex}>{err}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Preview */}
      {selectedFiles.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-black">
              Selected Files ({selectedFiles.length})
            </h3>
            <button
              onClick={handleUploadFiles}
              disabled={isUploading}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isUploading && <LoadingSpinner size="sm" className="border-white border-t-gray-300" />}
              <span>{isUploading ? 'Uploading...' : 'Upload Files'}</span>
            </button>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <FilePreview
                key={`${file.name}-${index}`}
                file={file}
                onRemove={handleRemoveFile}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upload Queue */}
      <UploadQueue
        uploadQueue={uploadQueue}
        uploadStats={uploadStats}
        isUploading={isUploading}
        onRetryUpload={retryUpload}
        onRemoveFromQueue={removeFromQueue}
        onClearCompleted={clearCompleted}
        onClearQueue={clearQueue}
      />
    </div>
  );
};

export default DocumentUpload;