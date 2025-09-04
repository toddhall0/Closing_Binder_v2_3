import { supabase } from '../lib/supabaseClient';

/**
 * Security utilities for file access control
 */

/**
 * Check if user can access a specific file
 * @param {string} filePath - File path to check
 * @returns {Promise} - Access check result
 */
export const checkFileAccess = async (filePath) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { hasAccess: false, error: 'User not authenticated' };
    }

    // Parse file path to extract user ID
    const pathParts = filePath.split('/');
    const fileUserId = pathParts[0];

    // Check if current user owns the file
    if (user.id !== fileUserId) {
      return { hasAccess: false, error: 'Access denied' };
    }

    return { hasAccess: true };
  } catch (error) {
    return { hasAccess: false, error: error.message };
  }
};

/**
 * Sanitize and validate file paths
 * @param {string} filePath - File path to validate
 * @returns {Object} - Validation result
 */
export const validateFilePath = (filePath) => {
  // Check for path traversal attempts
  if (filePath.includes('..') || filePath.includes('./')) {
    return { isValid: false, error: 'Invalid path: path traversal detected' };
  }

  // Check for absolute paths
  if (filePath.startsWith('/') || filePath.includes('\\')) {
    return { isValid: false, error: 'Invalid path: absolute paths not allowed' };
  }

  // Validate path format (userId/projectId/category/filename)
  const parts = filePath.split('/');
  if (parts.length < 4) {
    return { isValid: false, error: 'Invalid path format' };
  }

  // Check for valid UUIDs in path
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(parts[0]) || !uuidRegex.test(parts[1])) {
    return { isValid: false, error: 'Invalid UUID format in path' };
  }

  return { isValid: true };
};

/**
 * Rate limiting for file operations
 */
class FileOperationRateLimiter {
  constructor() {
    this.operations = new Map();
    this.windowMs = 60000; // 1 minute
    this.maxOperations = 100; // Max operations per window
  }

  isAllowed(userId, operation = 'general') {
    const key = `${userId}-${operation}`;
    const now = Date.now();
    
    if (!this.operations.has(key)) {
      this.operations.set(key, []);
    }

    const userOps = this.operations.get(key);
    
    // Clean old operations
    const validOps = userOps.filter(timestamp => 
      now - timestamp < this.windowMs
    );
    
    this.operations.set(key, validOps);

    // Check if user has exceeded limit
    if (validOps.length >= this.maxOperations) {
      return false;
    }

    // Add current operation
    validOps.push(now);
    return true;
  }
}

export const rateLimiter = new FileOperationRateLimiter();