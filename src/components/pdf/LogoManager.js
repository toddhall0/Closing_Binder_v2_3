// ===============================
// FILE: src/components/pdf/LogoManager.js
// Professional logo upload and management component
// ===============================

import React, { useState, useRef } from 'react';
import { Trash2, Upload, GripVertical } from 'lucide-react';
import { validateImageFile, uploadImageToSupabase, deleteImageFromSupabase, generateUniqueFileName } from '../../utils/imageUpload';

const LogoManager = ({ projectId, logos = [], onLogosChange }) => {
  const [uploading, setUploading] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Check if adding files would exceed limit
    if (logos.length + files.length > 3) {
      alert('Maximum 3 logos allowed. Please remove some logos first.');
      return;
    }

    setUploading(true);
    try {
      const { supabase } = await import('../../lib/supabase');
      
      // Get current user BEFORE the loop
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const uploadedLogos = [];
      
      for (const file of files) {
        // Validate file
        const validation = validateImageFile(file, {
          allowedTypes: ['image/jpeg', 'image/png', 'image/svg+xml'],
          maxSize: 5 * 1024 * 1024 // 5MB
        });

        if (!validation.isValid) {
          throw new Error(validation.error);
        }

        // Generate unique filename and path with user ID
        const fileName = generateUniqueFileName(file.name, 'logo');
        const filePath = `${user.id}/projects/${projectId}/logos/${fileName}`;
        
        // Upload file
        const uploadResult = await uploadImageToSupabase(
          supabase, 
          file, 
          'images', 
          filePath
        );

        if (!uploadResult.success) {
          throw new Error(uploadResult.error);
        }

        // Save to database with safe position calculation
        const currentPosition = Math.max(0, logos.length + uploadedLogos.length);
        
        const { data: logoData, error: dbError } = await supabase
          .from('logos')
          .insert({
            project_id: projectId,
            logo_url: uploadResult.data.publicUrl,
            file_name: fileName,
            logo_position: Math.min(currentPosition, 2) // Ensure max position is 2 (for 0,1,2)
          })
          .select()
          .single();

        if (dbError) throw dbError;

        uploadedLogos.push(logoData);
      }

      onLogosChange([...logos, ...uploadedLogos]);
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Error uploading logo: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteLogo = async (logoId, logoUrl) => {
    if (!window.confirm('Are you sure you want to delete this logo?')) return;

    try {
      const { supabase } = await import('../../lib/supabase');
      
      // Extract file path from URL for deletion - FIXED for user-based paths
      const urlParts = logoUrl.split('/');
      const filePath = urlParts.slice(-5).join('/'); // user_id/projects/projectId/logos/filename

      // Delete from storage
      await deleteImageFromSupabase(supabase, 'images', filePath);

      // Delete from database
      const { error } = await supabase
        .from('logos')
        .delete()
        .eq('id', logoId);

      if (error) throw error;

      // Update local state and reorder positions
      const updatedLogos = logos
        .filter(logo => logo.id !== logoId)
        .map((logo, index) => ({ ...logo, logo_position: index }));

      onLogosChange(updatedLogos);

      // Update positions in database
      for (const logo of updatedLogos) {
        await supabase
          .from('logos')
          .update({ logo_position: logo.logo_position })
          .eq('id', logo.id);
      }

    } catch (error) {
      console.error('Error deleting logo:', error);
      alert('Error deleting logo: ' + error.message);
    }
  };

  const handleReorderLogos = async (newLogos) => {
    try {
      const { supabase } = await import('../../lib/supabase');
      
      // Update positions in database
      for (let i = 0; i < newLogos.length; i++) {
        await supabase
          .from('logos')
          .update({ logo_position: i })
          .eq('id', newLogos[i].id);
      }

      onLogosChange(newLogos.map((logo, index) => ({ ...logo, logo_position: index })));
    } catch (error) {
      console.error('Error reordering logos:', error);
      alert('Error reordering logos: ' + error.message);
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === dropIndex) return;

    const newLogos = [...logos];
    const draggedLogo = newLogos[draggedItem];
    
    newLogos.splice(draggedItem, 1);
    newLogos.splice(dropIndex, 0, draggedLogo);

    handleReorderLogos(newLogos);
    setDraggedItem(null);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Company Logos</h3>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || logos.length >= 3}
          className="inline-flex items-center px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading...' : 'Add Logo'}
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Maximum 3 logos. Drag to reorder. Supported formats: JPG, PNG, SVG (max 5MB each)
      </p>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/svg+xml"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Logo Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {logos.map((logo, index) => (
          <div
            key={logo.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            className="relative group border-2 border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors cursor-move"
          >
            {/* Drag Handle */}
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>

            {/* Delete Button */}
            <button
              onClick={() => handleDeleteLogo(logo.id, logo.logo_url)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            >
              <Trash2 className="h-3 w-3" />
            </button>

            {/* Logo Image */}
            <div className="aspect-video bg-gray-50 rounded border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
              <img
                src={logo.logo_url}
                alt={`Logo ${index + 1}`}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=';
                }}
              />
            </div>

            {/* Logo Info */}
            <div className="mt-2 text-center">
              <p className="text-xs text-gray-600">
                Position {index + 1}
              </p>
            </div>
          </div>
        ))}

        {/* Empty Slots */}
        {Array.from({ length: 3 - logos.length }).map((_, index) => (
          <div
            key={`empty-${index}`}
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center aspect-video bg-gray-50"
          >
            <div className="text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Logo {logos.length + index + 1}</p>
            </div>
          </div>
        ))}
      </div>

      {logos.length === 0 && (
        <div className="text-center py-8">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No logos uploaded yet</p>
          <p className="text-sm text-gray-400">Click "Add Logo" to get started</p>
        </div>
      )}
    </div>
  );
};

export default LogoManager;