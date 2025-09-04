// ===============================
// FILE: src/utils/documentUrlUtils.js
// SIMPLIFIED - Just basic URL generation, no custom window stuff
// ===============================

import { supabase } from '../lib/supabase';

export const documentUrlUtils = {
  /**
   * Generate a signed URL for a document stored in Supabase Storage
   * @param {Object} document - Document object with file_url property
   * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns {Promise<string|null>} - Signed URL or null if error
   */
  async generateSignedUrl(document, expiresIn = 3600) {
    try {
      if (!document?.file_url) {
        console.error('Document or file_url is missing:', document);
        return null;
      }

      // Extract the file path from the full URL
      let filePath = document.file_url;
      
      // If it's a full URL, extract just the path part
      if (filePath.includes('/storage/v1/object/public/documents/')) {
        filePath = filePath.split('/storage/v1/object/public/documents/')[1];
      } else if (filePath.includes('/storage/v1/object/sign/documents/')) {
        filePath = filePath.split('/storage/v1/object/sign/documents/')[1];
      }

      console.log('Generating signed URL for path:', filePath);

      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('Error generating signed URL:', error);
        return null;
      }

      console.log('Generated signed URL:', data.signedUrl);
      return data.signedUrl;
    } catch (error) {
      console.error('Exception in generateSignedUrl:', error);
      return null;
    }
  },

  /**
   * Open document in new window/tab
   * @param {Object} document - Document object
   * @param {string} url - Optional pre-generated URL
   */
  async openDocumentInNewTab(document, url = null) {
    try {
      let documentUrl = url;
      
      if (!documentUrl) {
        documentUrl = await this.generateSignedUrl(document, 7200); // 2 hours for viewing
      }

      if (documentUrl) {
        console.log('Opening document URL:', documentUrl);
        // Simple window.open - most reliable
        const newWindow = window.open(documentUrl, '_blank');

        if (!newWindow) {
          // Fallback for popup blocked
          console.warn('Popup blocked, using location.href');
          window.location.href = documentUrl;
        }
      } else {
        console.error('Failed to generate URL for document:', document.name);
        alert('Unable to open document. Please try again.');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      alert('Error opening document. Please try again.');
    }
  },

  /**
   * Test if a URL is accessible
   * @param {string} url - URL to test
   * @returns {Promise<boolean>} - True if accessible
   */
  async testUrl(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error('Error testing URL:', error);
      return false;
    }
  }
};

export default documentUrlUtils;