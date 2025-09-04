// src/hooks/useProjects.js
import { useState, useEffect, useCallback } from 'react';
import ProjectsService from '../utils/supabaseProjects';

export const useProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = searchTerm 
        ? await ProjectsService.searchProjects(searchTerm)
        : await ProjectsService.getAllProjects();
      
      if (result.error) {
        throw result.error;
      }
      
      setProjects(result.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  const createProject = useCallback(async (projectData) => {
    setError(null);
    
    try {
      const result = await ProjectsService.createProject(projectData);
      
      if (result.error) {
        throw result.error;
      }
      
      // Add the new project to the beginning of the list
      setProjects(prev => [result.data, ...prev]);
      return { success: true, data: result.data };
    } catch (err) {
      const errorMessage = err.message || 'Failed to create project';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const updateProject = useCallback(async (projectId, updates) => {
    setError(null);
    
    try {
      const result = await ProjectsService.updateProject(projectId, updates);
      
      if (result.error) {
        throw result.error;
      }
      
      // Update the project in the list
      setProjects(prev => prev.map(project => 
        project.id === projectId ? result.data : project
      ));
      
      return { success: true, data: result.data };
    } catch (err) {
      const errorMessage = err.message || 'Failed to update project';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const deleteProject = useCallback(async (projectId) => {
    setError(null);
    
    try {
      const result = await ProjectsService.deleteProject(projectId);
      
      if (!result.success) {
        throw result.error;
      }
      
      // Remove the project from the list
      setProjects(prev => prev.filter(project => project.id !== projectId));
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Failed to delete project';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshProjects = useCallback(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    searchTerm,
    createProject,
    updateProject,
    deleteProject,
    handleSearch,
    clearError,
    refreshProjects
  };
};