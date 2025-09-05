// src/services/uploadService.js

import { supabase } from '../lib/supabase';
import { generateUniqueFileName } from './fileValidation';
import { v4 as uuidv4 } from 'uuid';

export class UploadService {
  static async uploadDocument(file, projectId, sectionId = null, onProgress = null) {
    try {
      // Generate unique filename
      const uniqueFileName = generateUniqueFileName(file.name);
      const filePath = `projects/${projectId}/documents/${uniqueFileName}`;
      
      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            if (onProgress) {
              const percentage = (progress.loaded / progress.total) * 100;
              onProgress(percentage);
            }
          }
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Save document record to database
      const documentData = {
        id: uuidv4(),
        section_id: sectionId,
        project_id: projectId,
        name: file.name,
        file_url: urlData.publicUrl,
        file_path: filePath,
        file_size: file.size,
        sort_order: await this.getNextSortOrder(sectionId, projectId),
        uploaded_at: new Date().toISOString()
      };

      const { data: dbData, error: dbError } = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single();

      if (dbError) {
        // If database insert fails, clean up the uploaded file
        await supabase.storage
          .from('documents')
          .remove([filePath]);
        throw new Error(`Database error: ${dbError.message}`);
      }

      return {
        success: true,
        document: dbData,
        fileUrl: urlData.publicUrl
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async getNextSortOrder(sectionId, projectId) {
    const query = supabase
      .from('documents')
      .select('sort_order');
    
    if (sectionId) {
      query.eq('section_id', sectionId);
    } else {
      query.eq('project_id', projectId).is('section_id', null);
    }
    
    const { data, error } = await query.order('sort_order', { ascending: false }).limit(1);
    
    if (error || !data || data.length === 0) {
      return 1;
    }
    
    return data[0].sort_order + 1;
  }

  static async deleteDocument(documentId, filePath) {
    try {
      // Delete from database first
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        throw new Error(`Database deletion failed: ${dbError.message}`);
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

      if (storageError) {
        console.warn('Storage deletion failed:', storageError.message);
        // Don't throw error for storage deletion failure as the database record is already gone
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async retryUpload(file, projectId, sectionId = null, onProgress = null) {
    // Same as uploadDocument but with retry logic
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.uploadDocument(file, projectId, sectionId, onProgress);
      
      if (result.success) {
        return result;
      }
      
      lastError = result.error;
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    return {
      success: false,
      error: `Upload failed after ${maxRetries} attempts: ${lastError}`
    };
  }
}