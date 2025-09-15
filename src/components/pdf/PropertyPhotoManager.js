// ===============================
// FILE: src/components/pdf/PropertyPhotoManager.js
// Clean version with correct paths, no debug code
// ===============================

import React, { useState, useRef, useCallback } from 'react';
import { Camera, Trash2, RotateCw } from 'lucide-react';
import { validateImageFile, uploadImageToSupabase, deleteImageFromSupabase, generateUniqueFileName, resizeImage } from '../../utils/imageUpload';

const PropertyPhotoManager = ({ projectId, photo, onPhotoChange }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    
    const file = files[0]; // Only allow one photo
    setUploading(true);

    try {
      const { supabase } = await import('../../lib/supabase');
      
      // Check current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Validate file
      const validation = validateImageFile(file, {
        allowedTypes: ['image/jpeg', 'image/png'],
        maxSize: 10 * 1024 * 1024 // 10MB for property photos
      });

      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Resize image for optimization
      const resizedFile = await resizeImage(file, 1200, 1200, 0.85);
      
      // Generate unique filename and path with user ID
      const fileName = generateUniqueFileName(file.name, 'property');
      const filePath = `${user.id}/projects/${projectId}/photos/${fileName}`;

      // Delete existing photo if it exists
      if (photo?.property_photo_url) {
        try {
          const existingUrlParts = photo.property_photo_url.split('/');
          const existingPath = existingUrlParts.slice(-5).join('/'); // user_id/projects/project_id/photos/filename
          await deleteImageFromSupabase(supabase, 'images', existingPath);
        } catch (deleteError) {
          console.warn('Could not delete existing photo:', deleteError);
        }
      }

      // Upload new file
      const uploadResult = await uploadImageToSupabase(
        supabase,
        resizedFile,
        'images',
        filePath
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      // Update database
      const { error: dbError } = await supabase
        .from('projects')
        .update({
          property_photo_url: uploadResult.data.publicUrl,
          property_photo_name: fileName,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (dbError) throw dbError;

      // Update parent component
      onPhotoChange({
        property_photo_url: uploadResult.data.publicUrl,
        property_photo_name: fileName
      });

    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Error uploading photo: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [projectId, photo, onPhotoChange]);

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFileSelect(files);
  };

  const handleDeletePhoto = async () => {
    if (!photo?.property_photo_url) return;
    if (!window.confirm('Are you sure you want to delete the property photo?')) return;

    try {
      const { supabase } = await import('../../lib/supabase');

      // Extract file path from URL - using correct path structure
      const urlParts = photo.property_photo_url.split('/');
      const filePath = urlParts.slice(-5).join('/'); // user_id/projects/project_id/photos/filename

      // Delete from storage
      await deleteImageFromSupabase(supabase, 'images', filePath);

      // Update database
      const { error: dbError } = await supabase
        .from('projects')
        .update({
          property_photo_url: null,
          property_photo_name: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (dbError) throw dbError;

      // Update parent component
      onPhotoChange({
        property_photo_url: null,
        property_photo_name: null
      });

    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Error deleting photo: ' + error.message);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Property Photo</h3>
        {photo?.property_photo_url && (
          <button
            onClick={handleDeletePhoto}
            className="inline-flex items-center px-3 py-1 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </button>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Upload a high-quality property photo. Supported formats: JPG, PNG (max 10MB)
      </p>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Photo Upload Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg transition-colors ${
          dragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        style={{ aspectRatio: '4/3' }}
      >
        {uploading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
            <div className="text-center">
              <RotateCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">Uploading and optimizing...</p>
            </div>
          </div>
        )}

        {photo?.property_photo_url ? (
          // Show existing photo
          <div className="relative h-full group">
            <img
              src={photo.property_photo_url}
              alt="Property"
              className="w-full h-full object-cover rounded-lg"
              onError={(e) => {
                console.error('Error loading property photo');
                e.target.style.display = 'none';
              }}
            />
            
            {/* Overlay with replace option */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 disabled:opacity-50"
              >
                <Camera className="h-4 w-4 mr-2 inline" />
                Replace Photo
              </button>
            </div>
          </div>
        ) : (
          // Show upload area
          <div 
            className="h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-600 mb-2">
              {dragOver ? 'Drop photo here' : 'Upload Property Photo'}
            </p>
            <p className="text-sm text-gray-500 text-center">
              Click to browse or drag and drop<br />
              JPG, PNG up to 10MB
            </p>
          </div>
        )}
      </div>

      {/* Photo Info */}
      {photo?.property_photo_url && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Camera className="h-4 w-4 text-gray-500 mr-2" />
              <span className="text-sm text-gray-600">
                {photo.property_photo_name || 'Property Photo'}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              Ready for PDF generation
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyPhotoManager;