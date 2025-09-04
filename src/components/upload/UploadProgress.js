// src/components/upload/UploadProgress.js

import React from 'react';
import { UPLOAD_STATUS } from '../../hooks/useFileUpload';

const UploadProgress = ({ progress, status, fileName, error, onRetry, onRemove }) => {
  const getStatusColor = () => {
    switch (status) {
      case UPLOAD_STATUS.COMPLETED:
        return 'bg-black';
      case UPLOAD_STATUS.FAILED:
        return 'bg-gray-400';
      case UPLOAD_STATUS.UPLOADING:
      case UPLOAD_STATUS.RETRYING:
        return 'bg-gray-600';
      default:
        return 'bg-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case UPLOAD_STATUS.COMPLETED:
        return (
          <svg className="h-4 w-4 text-black" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case UPLOAD_STATUS.FAILED:
        return (
          <svg className="h-4 w-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case UPLOAD_STATUS.UPLOADING:
      case UPLOAD_STATUS.RETRYING:
        return (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-200 border-t-gray-600"></div>
        );
      default:
        return (
          <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getStatusText = () => {
    switch (status) {
      case UPLOAD_STATUS.COMPLETED:
        return 'Upload completed';
      case UPLOAD_STATUS.FAILED:
        return `Upload failed: ${error}`;
      case UPLOAD_STATUS.UPLOADING:
        return `Uploading... ${Math.round(progress)}%`;
      case UPLOAD_STATUS.RETRYING:
        return `Retrying... ${Math.round(progress)}%`;
      default:
        return 'Pending upload';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            {getStatusIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-black truncate">
              {fileName}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {getStatusText()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          {status === UPLOAD_STATUS.FAILED && (
            <button
              onClick={onRetry}
              className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-200 transition-colors"
            >
              Retry
            </button>
          )}
          
          {(status === UPLOAD_STATUS.PENDING || status === UPLOAD_STATUS.FAILED) && (
            <button
              onClick={onRemove}
              className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 transition-colors"
              title="Remove from queue"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {(status === UPLOAD_STATUS.UPLOADING || status === UPLOAD_STATUS.RETRYING) && (
        <div className="mt-3">
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ease-out ${getStatusColor()}`}
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadProgress;