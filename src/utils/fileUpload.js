// ===============================
// FILE: src/utils/fileUpload.js
// File upload utilities and Supabase Storage operations
// ===============================

import { supabase } from '../lib/supabase';

// File validation constants
export const FILE_CONSTRAINTS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB in bytes
  ALLOWED_TYPES: ['application/pdf'],
  ALLOWED_EXTENSIONS: ['.pdf']
};

/**
 * Validates a file for upload
 * @param {File} file - The file to validate
 * @returns {Object} - Validation result with success boolean and error message
 */
export const validateFile = (file) => {
  // Check if file exists
  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  // Check file size
  if (file.size > FILE_CONSTRAINTS.MAX_SIZE) {
    const maxSizeMB = FILE_CONSTRAINTS.MAX_SIZE / (1024 * 1024);
    return { 
      success: false, 
      error: `File size exceeds ${maxSizeMB}MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB` 
    };
  }

  // Check file type
  if (!FILE_CONSTRAINTS.ALLOWED_TYPES.includes(file.type)) {
    return { 
      success: false, 
      error: `Invalid file type. Only PDF files are allowed. Received: ${file.type}` 
    };
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = FILE_CONSTRAINTS.ALLOWED_EXTENSIONS.some(ext => 
    fileName.endsWith(ext)
  );
  
  if (!hasValidExtension) {
    return { 
      success: false, 
      error: 'Invalid file extension. Only .pdf files are allowed.' 
    };
  }

  return { success: true, error: null };
};

/**
 * Sanitizes filename for safe storage
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
export const sanitizeFilename = (filename) => {
  // Remove file extension temporarily
  const extension = filename.substring(filename.lastIndexOf('.'));
  let name = filename.substring(0, filename.lastIndexOf('.'));
  
  // Replace special characters with underscores
  name = name
    .replace(/[^a-zA-Z0-9\-_\s]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  // Ensure filename isn't empty
  if (!name) {
    name = 'document';
  }
  
  // Add timestamp to prevent duplicates
  const timestamp = Date.now();
  return `${name}_${timestamp}${extension}`;
};

/**
 * Generates file path for storage
 * @param {string} userId - User ID
 * @param {string} projectId - Project ID
 * @param {string} filename - Sanitized filename
 * @returns {string} - Complete file path
 */
export const generateFilePath = (userId, projectId, filename) => {
  return `${userId}/${projectId}/${filename}`;
};

/**
 * Uploads file to Supabase Storage
 * @param {File} file - File to upload
 * @param {string} userId - User ID
 * @param {string} projectId - Project ID
 * @param {Function} onProgress - Progress callback
 * @returns {Object} - Upload result with success, data, and error
 */
export const uploadFileToStorage = async (file, userId, projectId, onProgress) => {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.success) {
      return { success: false, error: validation.error, data: null };
    }

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(file.name);
    const filePath = generateFilePath(userId, projectId, sanitizedFilename);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        onUploadProgress: (progress) => {
          if (onProgress) {
            const percentage = Math.round((progress.loaded / progress.total) * 100);
            onProgress(percentage);
          }
        }
      });

    if (error) {
      console.error('Storage upload error:', error);
      return { 
        success: false, 
        error: `Failed to upload file: ${error.message}`, 
        data: null 
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    return {
      success: true,
      error: null,
      data: {
        path: data.path,
        fullPath: data.fullPath,
        publicUrl: urlData.publicUrl,
        originalName: file.name,
        sanitizedName: sanitizedFilename,
        size: file.size,
        type: file.type
      }
    };

  } catch (error) {
    console.error('Upload error:', error);
    return { 
      success: false, 
      error: `Upload failed: ${error.message}`, 
      data: null 
    };
  }
};

/**
 * Deletes file from Supabase Storage
 * @param {string} filePath - Path to file in storage
 * @returns {Object} - Delete result
 */
export const deleteFileFromStorage = async (filePath) => {
  try {
    const { error } = await supabase.storage
      .from('documents')
      .remove([filePath]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
};