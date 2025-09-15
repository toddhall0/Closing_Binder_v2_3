// ===============================
// FILE: src/components/projects/ProjectDetail.js
// Complete fixed version with proper state management
// ===============================

import React, { useState, useEffect, useCallback } from 'react';
import PublishBinderButton from './PublishBinderButton';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectsService from '../../utils/supabaseProjects';
import LoadingSpinner from '../common/LoadingSpinner';
import DocumentUpload from '../upload/DocumentUpload';
import DocumentOrganization from '../documents/organization/DocumentOrganization';
import CoverPageEditor from '../pdf/CoverPageEditor';
import HybridBinderGenerator from '../HybridBinderGenerator';
import { documentOrganizationService } from '../../utils/documentOrganizationService';

const ProjectDetail = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('documents');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showUpload, setShowUpload] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [projectStats, setProjectStats] = useState({
    documents: 0,
    sections: 0,
    subsections: 0
  });
  const [structure, setStructure] = useState({ sections: [], documents: [] });
  const [logos, setLogos] = useState([]);

  // Memoized load functions to prevent infinite re-renders
  const loadProject = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await ProjectsService.getProject(projectId);
      
      if (result.error) {
        throw new Error(result.error.message || result.error || 'Failed to load project');
      }

      if (!result.data) {
        throw new Error('Project not found');
      }

      setProject(result.data);
      setEditForm({
        title: result.data.title,
        property_address: result.data.property_address,
        property_description: result.data.property_description || ''
      });
    } catch (err) {
      console.error('Error loading project:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadProjectStructure = useCallback(async () => {
    try {
      const data = await documentOrganizationService.getProjectStructure(projectId);
      setStructure(data);
    } catch (err) {
      console.error('Error loading project structure:', err);
    }
  }, [projectId]);

  const loadLogos = useCallback(async () => {
    try {
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase
        .from('logos')
        .select('*')
        .eq('project_id', projectId)
        .order('logo_position');
      if (!error) {
        setLogos(data || []);
      }
    } catch (err) {
      console.error('Error loading logos:', err);
    }
  }, [projectId]);

  const loadProjectDocuments = useCallback(async () => {
    try {
      setLoadingDocuments(true);
      
      // Import supabase client
      const { supabase } = await import('../../lib/supabase');
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: true });

      if (error) {
        console.error('Error loading documents:', error);
        return;
      }

      console.log('Loaded documents:', data);
      setUploadedDocuments(data || []);
      
      // Update stats immediately
      setProjectStats(prev => ({
        ...prev,
        documents: data ? data.length : 0
      }));
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoadingDocuments(false);
    }
  }, [projectId]);

  const loadProjectStats = useCallback(async () => {
    try {
      // Import supabase client
      const { supabase } = await import('../../lib/supabase');
      
      // Get document count
      const { data: documents, error: docError } = await supabase
        .from('documents')
        .select('id')
        .eq('project_id', projectId);

      // Get sections count
      const { data: sections, error: sectionsError } = await supabase
        .from('sections')
        .select('id, section_type')
        .eq('project_id', projectId);

      if (!docError && !sectionsError) {
        const sectionsCount = sections ? sections.filter(s => s.section_type === 'section').length : 0;
        const subsectionsCount = sections ? sections.filter(s => s.section_type === 'subsection').length : 0;
        
        console.log('Stats loaded:', { 
          documents: documents ? documents.length : 0, 
          sections: sectionsCount, 
          subsections: subsectionsCount 
        });
        
        setProjectStats({
          documents: documents ? documents.length : 0,
          sections: sectionsCount,
          subsections: subsectionsCount
        });
      }
    } catch (err) {
      console.error('Error loading project stats:', err);
    }
  }, [projectId]);

  // Initial load effect - runs only once when projectId changes
  useEffect(() => {
    if (projectId) {
      loadProject();
      loadProjectDocuments();
      loadProjectStats();
      loadProjectStructure();
      loadLogos();
    }
  }, [projectId, loadProject, loadProjectDocuments, loadProjectStats, loadProjectStructure, loadLogos]);

  // Handle project update
  const handleUpdateProject = async (e) => {
    e.preventDefault();
    
    try {
      setError(null);
      
      const result = await ProjectsService.updateProject(projectId, editForm);
      
      if (result.error) {
        throw new Error(result.error.message || result.error || 'Failed to update project');
      }

      setProject(result.data);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating project:', err);
      setError(err.message);
    }
  };

  // Handle document upload completion
  const handleDocumentUploadComplete = useCallback((uploadedCount) => {
    console.log('Documents uploaded successfully:', uploadedCount);
    
    // Refresh the documents list and stats to update counts
    loadProjectDocuments();
    loadProjectStats();
    
    // Show success message (you can implement a toast notification system later)
    setError(null);
  }, [loadProjectDocuments, loadProjectStats]);

  // Handle document deletion
  const handleDeleteDocument = useCallback(async (documentId, filePath) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const { UploadService } = await import('../../services/uploadService');
      const result = await UploadService.deleteDocument(documentId, filePath);
      
      if (result.success) {
        // Refresh documents list and stats to update counts everywhere
        loadProjectDocuments();
        loadProjectStats();
      } else {
        alert(`Failed to delete document: ${result.error}`);
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Failed to delete document');
    }
  }, [loadProjectDocuments, loadProjectStats]);

  // Handle organization changes - stable callback to prevent infinite loops
  const handleOrganizationChange = useCallback((newStructure) => {
    console.log('Organization changed, updating stats from provided structure');
    
    if (newStructure && newStructure.sections && newStructure.documents) {
      setStructure(newStructure);
      const sectionsCount = newStructure.sections.filter(s => s.section_type === 'section').length;
      const subsectionsCount = newStructure.sections.filter(s => s.section_type === 'subsection').length;
      
      setProjectStats({
        documents: newStructure.documents.length,
        sections: sectionsCount,
        subsections: subsectionsCount
      });
    }
  }, []); // Empty dependency array - function never changes

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle document preview/download
  const handleDocumentView = async (document) => {
    try {
      // Import supabase client
      const { supabase } = await import('../../lib/supabase');
      
      // Calculate window dimensions (75% of current window)
      const width = Math.floor(window.innerWidth * 0.75);
      const height = Math.floor(window.innerHeight * 0.75);
      
      // Center the window
      const left = Math.floor((window.innerWidth - width) / 2) + window.screenX;
      const top = Math.floor((window.innerHeight - height) / 2) + window.screenY;
      
      // Window features for the new popup
      const windowFeatures = `
        width=${width},
        height=${height},
        left=${left},
        top=${top},
        scrollbars=yes,
        resizable=yes,
        toolbar=no,
        menubar=no,
        location=no,
        status=no
      `.replace(/\s+/g, ''); // Remove whitespace
      
      // Method 1: Try signed URL first
      const { data: signedData, error: signedError } = await supabase.storage
        .from('documents')
        .createSignedUrl(document.file_path, 3600); // Valid for 1 hour
      
      if (!signedError && signedData?.signedUrl) {
        const newWindow = window.open(signedData.signedUrl, `document_${document.id}`, windowFeatures);
        if (newWindow) {
          newWindow.focus();
          // Set the document title
          newWindow.document.title = document.name;
        }
        return;
      }
      
      // Method 2: Try public URL
      const { data: publicData } = supabase.storage
        .from('documents')
        .getPublicUrl(document.file_path);
      
      if (publicData?.publicUrl) {
        const newWindow = window.open(publicData.publicUrl, `document_${document.id}`, windowFeatures);
        if (newWindow) {
          newWindow.focus();
          newWindow.document.title = document.name;
        }
        return;
      }
      
      // Method 3: Download and create blob URL
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(document.file_path);
      
      if (!downloadError && fileData) {
        const url = URL.createObjectURL(fileData);
        const newWindow = window.open(url, `document_${document.id}`, windowFeatures);
        if (newWindow) {
          newWindow.focus();
          newWindow.document.title = document.name;
          
          // Clean up the URL when the window is closed
          newWindow.addEventListener('beforeunload', () => {
            URL.revokeObjectURL(url);
          });
          
          // Also clean up after 5 minutes as a fallback
          setTimeout(() => URL.revokeObjectURL(url), 300000);
        }
        return;
      }
      
      throw new Error('All viewing methods failed');
      
    } catch (err) {
      console.error('Error opening document:', err);
      alert('Unable to open document. Please check your internet connection and try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-red-600 mb-4">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Project
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={loadProject}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Project Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The requested project could not be found or you don't have permission to view it.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {project.title}
            </h1>
            <p className="text-gray-600">{project.property_address}</p>
          </div>
        </div>
        
        <button
          onClick={() => setIsEditing(true)}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Edit Project
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8">
          
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'documents'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Upload Documents ({projectStats.documents})
          </button>
          <button
            onClick={() => setActiveTab('organization')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'organization'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Organize Documents
          </button>
          <button
            onClick={() => setActiveTab('binder')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'binder'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Project Details
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'preview'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Preview Binder
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Property Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Title
                </label>
                <p className="text-gray-900">{project.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Address
                </label>
                <p className="text-gray-900">{project.property_address}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <p className="text-gray-900">
                  {project.property_description || 'No description provided'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Created
                </label>
                <p className="text-gray-900">
                  {new Date(project.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Updated
                </label>
                <p className="text-gray-900">
                  {new Date(project.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-gray-100 rounded-lg mr-3">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">{projectStats.documents}</p>
                    <p className="text-sm text-gray-600">Documents</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    loadProjectDocuments();
                    loadProjectStats();
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Refresh counts"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg mr-3">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">{projectStats.sections}</p>
                  <p className="text-sm text-gray-600">Sections</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg mr-3">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">{projectStats.subsections}</p>
                  <p className="text-sm text-gray-600">Subsections</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-8">
          {/* Document Upload Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Upload Documents</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Add PDF documents to your closing binder
                </p>
              </div>
              <button
                onClick={() => setShowUpload(!showUpload)}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>{showUpload ? 'Hide Upload' : 'Upload Documents'}</span>
              </button>
            </div>

            {showUpload && (
              <DocumentUpload
                projectId={projectId}
                sectionId={null}
                onUploadComplete={handleDocumentUploadComplete}
              />
            )}
          </div>

          {/* Uploaded Documents Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Uploaded Documents ({projectStats.documents})
              </h3>
              {uploadedDocuments.length > 0 && (
                <button
                  onClick={loadProjectDocuments}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh</span>
                </button>
              )}
            </div>

            {loadingDocuments ? (
              <div className="text-center py-8">
                <LoadingSpinner size="md" />
                <p className="text-gray-600 mt-2">Loading documents...</p>
              </div>
            ) : uploadedDocuments.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg
                    className="w-16 h-16 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  No documents uploaded yet
                </h4>
                <p className="text-gray-600 mb-4">
                  Upload PDF documents to get started with your closing binder.
                </p>
                <button
                  onClick={() => setShowUpload(true)}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Upload Your First Document
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {uploadedDocuments.map((document) => (
                  <div key={document.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {document.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatFileSize(document.file_size)} • 
                            Uploaded {new Date(document.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleDocumentView(document)}
                          className="px-3 py-1 text-xs bg-black text-white rounded border border-black hover:bg-gray-800 transition-colors"
                          title="View document"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(document.id, document.file_path)}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded border border-red-600 hover:bg-red-700 transition-colors"
                          title="Delete document"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'organization' && (
  <div className="space-y-6">
    <DocumentOrganization 
      projectId={projectId} 
      onStructureChange={handleOrganizationChange}
    />
  </div>
)}

      {activeTab === 'binder' && (
  <div className="space-y-6">
    <CoverPageEditor 
      project={project}
      onProjectUpdate={(updatedProject) => {
        setProject(updatedProject);
      }}
    />
  </div>
)}

      {activeTab === 'preview' && (
  <div className="space-y-6">
    <HybridBinderGenerator 
      project={project}
      onProjectUpdate={(updatedProject) => {
        try { setProject(updatedProject); } catch {}
      }}
    />
  </div>
)}

      {/* Edit Project Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Edit Project
            </h2>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            
            <form onSubmit={handleUpdateProject} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="property_address" className="block text-sm font-medium text-gray-700 mb-1">
                  Property Address *
                </label>
                <input
                  type="text"
                  id="property_address"
                  value={editForm.property_address}
                  onChange={(e) => setEditForm({ ...editForm, property_address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="property_description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="property_description"
                  value={editForm.property_description}
                  onChange={(e) => setEditForm({ ...editForm, property_description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
              
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setError(null);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;