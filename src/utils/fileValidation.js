// File validation constants and functions
export const FILE_CONSTRAINTS = {
  documents: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['application/pdf'],
    allowedExtensions: ['.pdf']
  },
  images: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp'
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp']
  }
};

/**
 * Validates a file against constraints for a specific bucket
 * @param {File} file - The file to validate
 * @param {string} bucketType - 'documents' or 'images'
 * @returns {Object} - { isValid: boolean, error: string }
 */
export const validateFile = (file, bucketType) => {
  const constraints = FILE_CONSTRAINTS[bucketType];
  
  if (!constraints) {
    return { isValid: false, error: 'Invalid bucket type' };
  }

  // Check file size
  if (file.size > constraints.maxSize) {
    const maxSizeMB = constraints.maxSize / (1024 * 1024);
    return { 
      isValid: false, 
      error: `File size exceeds ${maxSizeMB}MB limit` 
    };
  }

  // Check MIME type
  if (!constraints.allowedTypes.includes(file.type)) {
    return { 
      isValid: false, 
      error: `File type ${file.type} not allowed. Allowed types: ${constraints.allowedTypes.join(', ')}` 
    };
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = constraints.allowedExtensions.some(ext => 
    fileName.endsWith(ext.toLowerCase())
  );
  
  if (!hasValidExtension) {
    return { 
      isValid: false, 
      error: `File extension not allowed. Allowed extensions: ${constraints.allowedExtensions.join(', ')}` 
    };
  }

  return { isValid: true, error: null };
};

/**
 * Sanitizes filename for safe storage
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
export const sanitizeFilename = (filename) => {
  // Remove special characters and spaces, preserve extension
  const parts = filename.split('.');
  const extension = parts.pop();
  const name = parts.join('.');
  
  const sanitizedName = name
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
    
  return `${sanitizedName}.${extension}`;
};

/**
 * Generates a unique filename with timestamp
 * @param {string} originalFilename - Original filename
 * @returns {string} - Unique filename
 */
export const generateUniqueFilename = (originalFilename) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const sanitized = sanitizeFilename(originalFilename);
  const parts = sanitized.split('.');
  const extension = parts.pop();
  const name = parts.join('.');
  
  return `${name}_${timestamp}_${randomString}.${extension}`;
};