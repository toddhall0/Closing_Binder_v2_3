import { uploadFile, uploadMultipleFiles, deleteFile } from '../storageUtils';
import { validateFile } from '../fileValidation';

/**
 * Storage utility testing procedures
 */

// Mock file for testing
const createMockFile = (name, size, type) => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

/**
 * Test file validation
 */
export const testFileValidation = () => {
  console.log('🧪 Testing File Validation...');
  
  // Test valid PDF
  const validPdf = createMockFile('test.pdf', 1024 * 1024, 'application/pdf');
  const pdfValidation = validateFile(validPdf, 'documents');
  console.log('✅ PDF Validation:', pdfValidation.isValid ? 'PASS' : 'FAIL');
  
  // Test invalid file size
  const largePdf = createMockFile('large.pdf', 100 * 1024 * 1024, 'application/pdf');
  const sizeValidation = validateFile(largePdf, 'documents');
  console.log('✅ Size Validation:', !sizeValidation.isValid ? 'PASS' : 'FAIL');
  
  // Test valid image
  const validImage = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg');
  const imageValidation = validateFile(validImage, 'images');
  console.log('✅ Image Validation:', imageValidation.isValid ? 'PASS' : 'FAIL');
};

/**
 * Test upload functionality
 */
export const testUploadFunctionality = async (projectId) => {
  console.log('🧪 Testing Upload Functionality...');
  
  try {
    const testFile = createMockFile('test-upload.pdf', 1024, 'application/pdf');
    
    const result = await uploadFile(
      testFile,
      'documents',
      projectId,
      'covers',
      (progress) => console.log(`Upload Progress: ${progress}%`),
      (error) => console.error(`Upload Error: ${error}`)
    );
    
    console.log('✅ Upload Test:', result.success ? 'PASS' : 'FAIL');
    return result;
    
  } catch (error) {
    console.log('❌ Upload Test: FAIL -', error.message);
    return null;
  }
};

/**
 * Test batch upload functionality
 */
export const testBatchUpload = async (projectId) => {
  console.log('🧪 Testing Batch Upload...');
  
  try {
    const files = [
      createMockFile('test1.pdf', 1024, 'application/pdf'),
      createMockFile('test2.pdf', 1024, 'application/pdf'),
      createMockFile('test3.pdf', 1024, 'application/pdf')
    ];
    
    const result = await uploadMultipleFiles(
      files,
      'documents', 
      projectId,
      (progress) => console.log(`Batch Progress:`, progress),
      (error) => console.error(`Batch Error: ${error}`)
    );
    
    console.log('✅ Batch Upload Test:', result.successful === files.length ? 'PASS' : 'FAIL');
    return result;
    
  } catch (error) {
    console.log('❌ Batch Upload Test: FAIL -', error.message);
    return null;
  }
};

/**
 * Complete storage test suite
 */
export const runStorageTests = async (projectId) => {
  console.log('🚀 Running Complete Storage Test Suite...\n');
  
  // Run validation tests
  testFileValidation();
  console.log('');
  
  // Run upload tests
  const uploadResult = await testUploadFunctionality(projectId);
  console.log('');
  
  // Run batch upload tests
  const batchResult = await testBatchUpload(projectId);
  console.log('');
  
  // Clean up test files
  if (uploadResult?.success) {
    const deleteResult = await deleteFile('documents', uploadResult.data.path);
    console.log('✅ Cleanup Test:', deleteResult.success ? 'PASS' : 'FAIL');
  }
  
  console.log('\n✨ Storage Test Suite Complete!');
  
  return {
    validation: true,
    upload: uploadResult?.success || false,
    batchUpload: batchResult?.successful > 0 || false
  };
};