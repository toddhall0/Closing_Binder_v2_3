// src/components/projects/ProjectsDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useProjects } from '../../hooks/useProjects';
import { ProjectCard } from './ProjectCard';
import { CreateProjectModal } from './CreateProjectModal';
import { EditProjectModal } from './EditProjectModal';
import { ConfirmationDialog } from './ConfirmationDialog';
import { Button } from './Button';
// Removed unused Input import
import { LoadingSpinner } from './LoadingSpinner';
import { ClientsService } from '../../services/clientsService';

const ClientSelect = ({ value, onChange }) => {
  const [options, setOptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [term, setTerm] = React.useState('');

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await ClientsService.getClients(term);
        if (active) setOptions(data || []);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [term]);

  return (
    <div>
      <input
        type="text"
        value={term}
        onChange={(e)=>setTerm(e.target.value)}
        placeholder="Search clients..."
        className="block w-full px-3 py-2 border border-gray-300 mb-2"
      />
      <select
        className="block w-full px-3 py-2 border border-gray-300"
        value={value || ''}
        onChange={(e)=>onChange(e.target.value)}
      >
        <option value="">All clients</option>
        {options.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      {loading && <div className="text-xs text-gray-500 mt-1">Loading...</div>}
    </div>
  );
};



export const ProjectsDashboard = ({ onProjectSelect }) => {
  const {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    handleSearch,
    clearError,
    refreshProjects,
    clientId
  } = useProjects();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [localFrom, setLocalFrom] = useState('');
  const [localTo, setLocalTo] = useState('');
  const [localClientId, setLocalClientId] = useState('');

  useEffect(() => { setLocalClientId(clientId || ''); }, [clientId]);

  // Debounce search and date filters
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(localSearchTerm, localFrom, localTo, localClientId);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [localSearchTerm, localFrom, localTo, handleSearch]);

  const handleCreateProject = async (projectData) => {
    setActionLoading(true);
    try {
      const result = await createProject(projectData);
      if (result.success) {
        setIsCreateModalOpen(false);
        // Show success feedback
        setTimeout(() => {
          // Could add a toast notification here
        }, 100);
      }
      return result;
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditProject = (project) => {
    setSelectedProject(project);
    setIsEditModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProject) return;

    setActionLoading(true);
    try {
      const result = await deleteProject(selectedProject.id);
      if (result.success) {
        setIsDeleteDialogOpen(false);
        setSelectedProject(null);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteDialog = (project) => {
    setSelectedProject(project);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (!actionLoading) {
      setIsDeleteDialogOpen(false);
      setSelectedProject(null);
    }
  };

  const handleRefresh = () => {
    clearError();
    refreshProjects();
  };

  // Filter projects based on search (client-side filtering for immediate feedback)
  const filteredProjects = projects;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-medium text-gray-900">
                  Closing Binder Projects
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage your PDF closing binder projects
                </p>
              </div>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                disabled={loading}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Project
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Bar */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
          <div className="sm:col-span-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search projects..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Closing From</label>
            <input
              type="date"
              className="block w-full px-3 py-2 border border-gray-300"
              value={localFrom}
              onChange={(e)=>{ const v = e.target.value; setLocalFrom(v); handleSearch(localSearchTerm, v, localTo, localClientId); }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Closing To</label>
            <input
              type="date"
              className="block w-full px-3 py-2 border border-gray-300"
              value={localTo}
              onChange={(e)=>{ const v = e.target.value; setLocalTo(v); handleSearch(localSearchTerm, localFrom, v, localClientId); }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <ClientSelect value={localClientId} onChange={(v)=>{ setLocalClientId(v); handleSearch(localSearchTerm, localFrom, localTo, v); }} />
          </div>
          <div className="flex space-x-3">
            <Button variant="secondary" onClick={()=>{ setLocalSearchTerm(''); setLocalFrom(''); setLocalTo(''); setLocalClientId(''); handleSearch('', '', '', ''); }} disabled={loading} size="sm">Clear</Button>
            <Button variant="secondary" onClick={handleRefresh} disabled={loading} size="sm">Refresh</Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-800 text-sm">{error}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="text-red-600 hover:text-red-800"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Projects Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {localSearchTerm ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {localSearchTerm 
                ? `No projects match "${localSearchTerm}". Try a different search term.`
                : 'Get started by creating your first closing binder project.'
              }
            </p>
            {!localSearchTerm && (
              <div className="mt-6">
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Project
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onSelect={onProjectSelect}
                onEdit={handleEditProject}
                onDelete={openDeleteDialog}
                loading={actionLoading && selectedProject?.id === project.id}
              />
            ))}
          </div>
        )}

        {/* Results Info */}
        {!loading && filteredProjects.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-600">
            Showing {filteredProjects.length} of {projects.length} projects
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateProject={handleCreateProject}
        loading={actionLoading}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        project={selectedProject}
        onUpdateProject={async (id, updates) => {
          setActionLoading(true);
          try {
            const result = await updateProject(id, updates);
            return result;
          } finally {
            setActionLoading(false);
          }
        }}
        loading={actionLoading}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleDeleteConfirm}
        title="Delete Project"
        message={`Are you sure you want to delete "${selectedProject?.title}"? This action cannot be undone and will remove all associated documents and sections.`}
        confirmText="Delete Project"
        cancelText="Cancel"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
};