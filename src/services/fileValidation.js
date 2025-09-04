// src/services/fileValidation.js

export const FILE_CONSTRAINTS = {
  MAX_SIZE: 200 * 1024 * 1024, // 200MB - adjust this value as needed
  ALLOWED_TYPES: ['application/pdf'],
  MAX_FILES: 20
};

// Helper function to get human-readable file size limit
export const getMaxFileSizeText = () => {
  const sizeMB = FILE_CONSTRAINTS.MAX_SIZE / (1024 * 1024);
  return `${sizeMB}MB`;
};

export const validateFile = (file) => {
  const errors = [];
  
  // Check file type
  if (!FILE_CONSTRAINTS.ALLOWED_TYPES.includes(file.type)) {
    errors.push('Only PDF files are allowed');
  }
  
  // Check file size
  if (file.size > FILE_CONSTRAINTS.MAX_SIZE) {
    errors.push(`File size must be less than ${FILE_CONSTRAINTS.MAX_SIZE / (1024 * 1024)}MB`);
  }
  
  // Check if file is empty
  if (file.size === 0) {
    errors.push('File cannot be empty');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateFiles = (files) => {
  if (files.length > FILE_CONSTRAINTS.MAX_FILES) {
    return {
      isValid: false,
      errors: [`Cannot upload more than ${FILE_CONSTRAINTS.MAX_FILES} files at once`],
      validFiles: []
    };
  }
  
  const validFiles = [];
  const allErrors = [];
  
  files.forEach((file, index) => {
    const validation = validateFile(file);
    if (validation.isValid) {
      validFiles.push(file);
    } else {
      allErrors.push({
        fileName: file.name,
        errors: validation.errors
      });
    }
  });
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    validFiles
  };
};

export const sanitizeFileName = (fileName) => {
  // Remove special characters and spaces, keep only alphanumeric, dots, hyphens, and underscores
  return fileName
    .replace(/[^a-zA-Z0-9.-_]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_|_$/g, '');
};

export const generateUniqueFileName = (originalName, timestamp = Date.now()) => {
  const extension = originalName.split('.').pop();
  const nameWithoutExt = originalName.replace(`.${extension}`, '');
  const sanitizedName = sanitizeFileName(nameWithoutExt);
  
  return `${sanitizedName}_${timestamp}.${extension}`;
};