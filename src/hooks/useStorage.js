import { useState, useCallback } from 'react';
import { uploadFile, uploadMultipleFiles, deleteFile, listProjectFiles } from '../utils/storageUtils';

/**
 * Custom hook for storage operations
 */
export const useStorage = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const handleUpload = useCallback(async (file, bucketType, projectId, imageType = 'covers') => {
    setUploading(true);
    setError(null);
    setUploadProgress(0);

    const result = await uploadFile(
      file,
      bucketType,
      projectId,
      imageType,
      (progress) => setUploadProgress(progress),
      (error) => setError(error)
    );

    setUploading(false);
    
    if (!result.success) {
      setError(result.error);
    }

    return result;
  }, []);

  const handleBatchUpload = useCallback(async (files, bucketType, projectId) => {
    setUploading(true);
    setError(null);
    setUploadProgress(0);

    const result = await uploadMultipleFiles(
      files,
      bucketType,
      projectId,
      (progress) => setUploadProgress(progress.overallProgress),
      (error) => setError(error)
    );

    setUploading(false);
    return result;
  }, []);

  const handleDelete = useCallback(async (bucketType, filePath) => {
    const result = await deleteFile(bucketType, filePath);
    
    if (!result.success) {
      setError(result.error);
    }

    return result;
  }, []);

  const listFiles = useCallback(async (bucketType, projectId) => {
    const result = await listProjectFiles(bucketType, projectId);
    
    if (!result.success) {
      setError(result.error);
    }

    return result;
  }, []);

  return {
    uploading,
    uploadProgress,
    error,
    handleUpload,
    handleBatchUpload,
    handleDelete,
    listFiles,
    clearError: () => setError(null)
  };
};