/**
 * File path organization utilities for project-based folder structure
 */

/**
 * Generates file path for document storage
 * @param {string} userId - User ID  
 * @param {string} projectId - Project ID
 * @param {string} filename - Filename
 * @returns {string} - Complete file path
 */
export const generateDocumentPath = (userId, projectId, filename) => {
  return `${userId}/${projectId}/documents/${filename}`;
};

/**
 * Generates file path for image storage (logos, cover photos)
 * @param {string} userId - User ID
 * @param {string} projectId - Project ID  
 * @param {string} filename - Filename
 * @param {string} imageType - 'logos' or 'covers'
 * @returns {string} - Complete file path
 */
export const generateImagePath = (userId, projectId, filename, imageType = 'covers') => {
  return `${userId}/${projectId}/${imageType}/${filename}`;
};

/**
 * Parses file path to extract components
 * @param {string} filePath - Complete file path
 * @returns {Object} - { userId, projectId, category, filename }
 */
export const parseFilePath = (filePath) => {
  const parts = filePath.split('/');
  
  if (parts.length < 4) {
    throw new Error('Invalid file path format');
  }
  
  return {
    userId: parts[0],
    projectId: parts[1], 
    category: parts[2], // 'documents', 'logos', 'covers'
    filename: parts[3]
  };
};

/**
 * Creates folder structure preview
 * @param {string} userId - User ID
 * @param {string} projectId - Project ID
 * @returns {Object} - Folder structure paths
 */
export const createFolderStructure = (userId, projectId) => {
  return {
    documents: `${userId}/${projectId}/documents/`,
    logos: `${userId}/${projectId}/logos/`,
    covers: `${userId}/${projectId}/covers/`
  };
};