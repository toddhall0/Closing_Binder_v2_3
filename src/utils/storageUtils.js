import { supabase } from '../lib/supabaseClient';
import { validateFile, generateUniqueFilename } from './fileValidation';
import { generateDocumentPath, generateImagePath } from './filePathUtils';

/**
 * Upload file with progress tracking and error handling
 * @param {File} file - File to upload
 * @param {string} bucketType - 'documents' or 'images'
 * @param {string} projectId - Project ID
 * @param {string} imageType - For images: 'logos' or 'covers'
 * @param {function} onProgress - Progress callback (progress: number)
 * @param {function} onError - Error callback (error: string)
 * @returns {Promise} - Upload result
 */
export const uploadFile = async (
  file, 
  bucketType, 
  projectId, 
  imageType = 'covers',
  onProgress = null,
  onError = null
) => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Validate file
    const validation = validateFile(file, bucketType);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Generate unique filename and path
    const filename = generateUniqueFilename(file.name);
    let filePath;
    
    if (bucketType === 'documents') {
      filePath = generateDocumentPath(user.id, projectId, filename);
    } else {
      filePath = generateImagePath(user.id, projectId, filename, imageType);
    }

    // Create upload progress tracker
    let uploadProgress = 0;
    
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketType)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        onUploadProgress: (progress) => {
          uploadProgress = Math.round((progress.loaded / progress.total) * 100);
          if (onProgress) {
            onProgress(uploadProgress);
          }
        }
      });

    if (error) {
      throw error;
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from(bucketType)
      .getPublicUrl(filePath);

    return {
      success: true,
      data: {
        path: data.path,
        fullPath: data.fullPath,
        publicUrl: urlData.publicUrl,
        filename: filename,
        originalName: file.name,
        size: file.size,
        type: file.type
      }
    };

  } catch (error) {
    console.error('Upload error:', error);
    if (onError) {
      onError(error.message);
    }
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Upload multiple files with batch progress tracking
 * @param {FileList|Array} files - Files to upload
 * @param {string} bucketType - 'documents' or 'images'
 * @param {string} projectId - Project ID
 * @param {function} onProgress - Progress callback
 * @param {function} onError - Error callback
 * @returns {Promise} - Batch upload results
 */
export const uploadMultipleFiles = async (
  files,
  bucketType, 
  projectId,
  onProgress = null,
  onError = null
) => {
  const fileArray = Array.from(files);
  const results = [];
  let completedUploads = 0;

  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];
    
    try {
      const result = await uploadFile(
        file,
        bucketType,
        projectId,
        'covers',
        (fileProgress) => {
          // Calculate overall progress
          const overallProgress = Math.round(
            ((completedUploads + (fileProgress / 100)) / fileArray.length) * 100
          );
          if (onProgress) {
            onProgress({
              overallProgress,
              currentFile: i + 1,
              totalFiles: fileArray.length,
              currentFileName: file.name,
              currentFileProgress: fileProgress
            });
          }
        }
      );

      results.push(result);
      
      if (result.success) {
        completedUploads++;
      }

    } catch (error) {
      results.push({
        success: false,
        error: error.message,
        filename: file.name
      });
      
      if (onError) {
        onError(`Failed to upload ${file.name}: ${error.message}`);
      }
    }
  }

  return {
    results,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    total: fileArray.length
  };
};

/**
 * Delete file from storage
 * @param {string} bucketType - 'documents' or 'images'
 * @param {string} filePath - File path to delete
 * @returns {Promise} - Delete result
 */
export const deleteFile = async (bucketType, filePath) => {
  try {
    const { error } = await supabase.storage
      .from(bucketType)
      .remove([filePath]);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Delete error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

/**
 * Get signed URL for private file access
 * @param {string} bucketType - 'documents' or 'images'
 * @param {string} filePath - File path
 * @param {number} expiresIn - URL expiration in seconds (default: 3600)
 * @returns {Promise} - Signed URL result
 */
export const getSignedUrl = async (bucketType, filePath, expiresIn = 3600) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucketType)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw error;
    }

    return { 
      success: true, 
      signedUrl: data.signedUrl 
    };
  } catch (error) {
    console.error('Signed URL error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

/**
 * List files in a project folder
 * @param {string} bucketType - 'documents' or 'images'
 * @param {string} projectId - Project ID
 * @returns {Promise} - File list result
 */
export const listProjectFiles = async (bucketType, projectId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const folderPath = `${user.id}/${projectId}`;
    
    const { data, error } = await supabase.storage
      .from(bucketType)
      .list(folderPath, {
        limit: 100,
        offset: 0
      });

    if (error) {
      throw error;
    }

    return { 
      success: true, 
      files: data || [] 
    };
  } catch (error) {
    console.error('List files error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};