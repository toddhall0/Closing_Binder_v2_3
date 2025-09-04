// ===============================
// FILE: src/utils/imageUpload.js
// Image upload utilities for logos and property photos
// ===============================

import { v4 as uuidv4 } from 'uuid';

/**
 * Validate uploaded image files
 * @param {File} file - The file to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
export const validateImageFile = (file, options = {}) => {
  const {
    allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml'],
    maxSize = 5 * 1024 * 1024, // 5MB default
    minSize = 1024 // 1KB minimum
  } = options;

  // Check if file exists
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    const allowedExtensions = allowedTypes.map(type => 
      type.split('/')[1].toUpperCase()
    ).join(', ');
    return { 
      isValid: false, 
      error: `Invalid file type. Allowed: ${allowedExtensions}` 
    };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024) * 10) / 10;
    return { 
      isValid: false, 
      error: `File too large. Maximum size: ${maxSizeMB}MB` 
    };
  }

  if (file.size < minSize) {
    return { 
      isValid: false, 
      error: 'File too small. Please select a valid image.' 
    };
  }

  return { isValid: true };
};

/**
 * Generate a unique filename for upload
 * @param {string} originalName - Original filename
 * @param {string} prefix - Filename prefix (optional)
 * @returns {string} - Unique filename
 */
export const generateUniqueFileName = (originalName, prefix = 'file') => {
  const extension = originalName.split('.').pop();
  const uniqueId = uuidv4().substring(0, 8);
  const timestamp = Date.now();
  return `${prefix}_${timestamp}_${uniqueId}.${extension}`;
};

/**
 * Upload image file to Supabase Storage
 * @param {Object} supabase - Supabase client
 * @param {File} file - File to upload
 * @param {string} bucket - Storage bucket name
 * @param {string} filePath - Path where file should be stored
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Object>} - Upload result
 */
export const uploadImageToSupabase = async (
  supabase, 
  file, 
  bucket, 
  filePath, 
  onProgress = null
) => {
  try {
    // Validate file first
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(uploadData.path);

    return {
      success: true,
      data: {
        path: uploadData.path,
        publicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete image file from Supabase Storage
 * @param {Object} supabase - Supabase client
 * @param {string} bucket - Storage bucket name
 * @param {string} filePath - Path of file to delete
 * @returns {Promise<Object>} - Delete result
 */
export const deleteImageFromSupabase = async (supabase, bucket, filePath) => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Convert file to base64 for preview
 * @param {File} file - File to convert
 * @returns {Promise<string>} - Base64 string
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

/**
 * Resize image (client-side) for optimization
 * @param {File} file - Image file to resize
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<File>} - Resized image file
 */
export const resizeImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };

    img.src = URL.createObjectURL(file);
  });
};