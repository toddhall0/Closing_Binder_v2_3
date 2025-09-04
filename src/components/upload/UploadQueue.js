// src/components/upload/UploadQueue.js

import React from 'react';
import UploadProgress from './UploadProgress';
import { UPLOAD_STATUS } from '../../hooks/useFileUpload';

const UploadQueue = ({ 
  uploadQueue, 
  uploadStats, 
  isUploading, 
  onRetryUpload, 
  onRemoveFromQueue, 
  onClearCompleted,
  onClearQueue 
}) => {
  if (uploadQueue.length === 0) return null;

  const hasCompleted = uploadQueue.some(item => item.status === UPLOAD_STATUS.COMPLETED);
  const hasFailed = uploadQueue.some(item => item.status === UPLOAD_STATUS.FAILED);
  
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-black">Upload Queue</h3>
          <p className="text-sm text-gray-600 mt-1">
            {uploadStats.total} files • {uploadStats.completed} completed • {uploadStats.failed} failed
          </p>
        </div>
        
        <div className="flex space-x-2">
          {hasCompleted && (
            <button
              onClick={onClearCompleted}
              className="text-xs px-3 py-1 bg-white hover:bg-gray-100 text-gray-700 rounded border border-gray-200 transition-colors"
            >
              Clear Completed
            </button>
          )}
          
          <button
            onClick={onClearQueue}
            className="text-xs px-3 py-1 bg-white hover:bg-gray-100 text-gray-700 rounded border border-gray-200 transition-colors"
            disabled={isUploading}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Overall Progress */}
      {uploadStats.total > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <span>Overall Progress</span>
            <span>{Math.round((uploadStats.completed / uploadStats.total) * 100)}%</span>
          </div>
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-300 ease-out"
              style={{ width: `${(uploadStats.completed / uploadStats.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Queue Items */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {uploadQueue.map((item) => (
          <UploadProgress
            key={item.id}
            progress={item.progress}
            status={item.status}
            fileName={item.file.name}
            error={item.error}
            onRetry={() => onRetryUpload(item)}
            onRemove={() => onRemoveFromQueue(item.id)}
          />
        ))}
      </div>

      {/* Status Messages */}
      {isUploading && (
        <div className="mt-4 p-3 bg-white border border-gray-200 rounded">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-200 border-t-gray-600"></div>
            <span className="text-sm text-gray-700">Uploading files...</span>
          </div>
        </div>
      )}

      {hasFailed && !isUploading && (
        <div className="mt-4 p-3 bg-white border border-gray-200 rounded">
          <p className="text-sm text-gray-700">
            Some uploads failed. You can retry individual files or check the error messages above.
          </p>
        </div>
      )}
    </div>
  );
};

export default UploadQueue;