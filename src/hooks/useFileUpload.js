// src/hooks/useFileUpload.js

import React, { useState, useCallback, useEffect } from 'react';
import { UploadService } from '../services/uploadService';
import { validateFiles } from '../services/fileValidation';

export const UPLOAD_STATUS = {
  PENDING: 'pending',
  UPLOADING: 'uploading',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RETRYING: 'retrying'
};

export const useFileUpload = (projectId, sectionId = null, onUploadComplete = null) => {
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState({
    total: 0,
    completed: 0,
    failed: 0
  });

  const addToQueue = useCallback((files) => {
    const validation = validateFiles(Array.from(files));
    
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors
      };
    }

    const newItems = validation.validFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      status: UPLOAD_STATUS.PENDING,
      progress: 0,
      error: null,
      retryCount: 0
    }));

    setUploadQueue(prev => [...prev, ...newItems]);
    setUploadStats(prev => ({
      ...prev,
      total: prev.total + newItems.length
    }));

    return {
      success: true,
      addedCount: newItems.length,
      queueItems: newItems
    };
  }, []);

  const updateQueueItem = useCallback((id, updates) => {
    setUploadQueue(prev =>
      prev.map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  }, []);

  const removeFromQueue = useCallback((id) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const uploadFile = useCallback(async (queueItem) => {
    updateQueueItem(queueItem.id, {
      status: UPLOAD_STATUS.UPLOADING,
      progress: 0
    });

    const onProgress = (percentage) => {
      updateQueueItem(queueItem.id, {
        progress: percentage
      });
    };

    const result = await UploadService.uploadDocument(
      queueItem.file,
      projectId,
      sectionId,
      onProgress
    );

    if (result.success) {
      updateQueueItem(queueItem.id, {
        status: UPLOAD_STATUS.COMPLETED,
        progress: 100,
        document: result.document
      });
      
      setUploadStats(prev => ({
        ...prev,
        completed: prev.completed + 1
      }));

      // Notify completion callback if provided
      if (onUploadComplete) {
        onUploadComplete(result.document);
      }
      
      return result;
    } else {
      updateQueueItem(queueItem.id, {
        status: UPLOAD_STATUS.FAILED,
        error: result.error
      });
      
      setUploadStats(prev => ({
        ...prev,
        failed: prev.failed + 1
      }));
      
      return result;
    }
  }, [projectId, sectionId, updateQueueItem]);

  const retryUpload = useCallback(async (queueItem) => {
    updateQueueItem(queueItem.id, {
      status: UPLOAD_STATUS.RETRYING,
      progress: 0,
      retryCount: queueItem.retryCount + 1
    });

    const onProgress = (percentage) => {
      updateQueueItem(queueItem.id, {
        progress: percentage
      });
    };

    const result = await UploadService.retryUpload(
      queueItem.file,
      projectId,
      sectionId,
      onProgress
    );

    if (result.success) {
      updateQueueItem(queueItem.id, {
        status: UPLOAD_STATUS.COMPLETED,
        progress: 100,
        document: result.document
      });
      
      setUploadStats(prev => ({
        ...prev,
        completed: prev.completed + 1,
        failed: prev.failed - 1
      }));
    } else {
      updateQueueItem(queueItem.id, {
        status: UPLOAD_STATUS.FAILED,
        error: result.error
      });
    }

    return result;
  }, [projectId, sectionId, updateQueueItem]);

  const processQueue = useCallback(async () => {
    const pendingItems = uploadQueue.filter(item => item.status === UPLOAD_STATUS.PENDING);
    
    if (pendingItems.length === 0 || isUploading) return;

    setIsUploading(true);

    try {
      // Process uploads sequentially to avoid overwhelming the server
      for (const item of pendingItems) {
        await uploadFile(item);
      }
    } catch (error) {
      console.error('Error processing upload queue:', error);
    } finally {
      setIsUploading(false);
    }
  }, [uploadQueue, uploadFile, isUploading]);

  // Auto-process queue when new items are added
  const autoProcessQueue = useCallback(async () => {
    const pendingItems = uploadQueue.filter(item => item.status === UPLOAD_STATUS.PENDING);
    
    if (pendingItems.length > 0 && !isUploading) {
      await processQueue();
    }
  }, [uploadQueue, isUploading, processQueue]);

  // Effect to auto-process queue when items are added
  useEffect(() => {
    const timer = setTimeout(() => {
      autoProcessQueue();
    }, 500); // Small delay to batch multiple file additions

    return () => clearTimeout(timer);
  }, [uploadQueue.length, autoProcessQueue]);

  const clearQueue = useCallback(() => {
    setUploadQueue([]);
    setUploadStats({
      total: 0,
      completed: 0,
      failed: 0
    });
  }, []);

  const clearCompleted = useCallback(() => {
    setUploadQueue(prev => 
      prev.filter(item => item.status !== UPLOAD_STATUS.COMPLETED)
    );
  }, []);

  return {
    uploadQueue,
    isUploading,
    uploadStats,
    addToQueue,
    processQueue,
    retryUpload,
    removeFromQueue,
    clearQueue,
    clearCompleted,
    autoProcessQueue
  };
};