// src/hooks/useProjects.js
import { useState, useEffect, useCallback } from 'react';
import ProjectsService from '../utils/supabaseProjects';
import { supabase } from '../lib/supabase';

export const useProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [clientId, setClientId] = useState('');

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = (searchTerm || dateFrom || dateTo || clientId)
        ? await ProjectsService.searchProjects({ query: searchTerm, from: dateFrom, to: dateTo, clientId })
        : await ProjectsService.getAllProjects();
      
      if (result.error) {
        throw result.error;
      }
      
      let list = result.data || [];

      // Enrich with client publish/sync status
      try {
        const projectIds = list.map(p => p.id).filter(Boolean);
        if (projectIds.length > 0) {
          // Consider all binders for these projects (owner or firm admins)
          let query = supabase
            .from('client_binders')
            .select('project_id, is_published, is_active, published_at, updated_at, id')
            .in('project_id', projectIds);
          const { data: binders } = await query;
          const byProject = new Map();
          (binders || []).forEach(b => {
            if (!b || !b.project_id) return;
            if (!byProject.has(b.project_id)) byProject.set(b.project_id, []);
            byProject.get(b.project_id).push(b);
          });
          const enriched = list.map(p => {
            const rows = byProject.get(p.id) || [];
            const publishedRows = rows.filter(r => r.is_published && r.is_active);
            const lastPublishedAt = publishedRows.reduce((acc, r) => {
              const t = r.published_at ? new Date(r.published_at).getTime() : 0;
              return Math.max(acc, isFinite(t) ? t : 0);
            }, 0);
            const hasPublished = publishedRows.length > 0;
            const projectUpdatedTs = p.updated_at ? new Date(p.updated_at).getTime() : 0;
            const hasPendingChanges = hasPublished && projectUpdatedTs > lastPublishedAt && lastPublishedAt > 0;
            return {
              ...p,
              _publishStatus: {
                hasPublished,
                lastPublishedAt: lastPublishedAt ? new Date(lastPublishedAt).toISOString() : null,
                hasPendingChanges
              }
            };
          });
          list = enriched;
        }
      } catch (_) {
        // If anything fails, proceed without status
      }

      setProjects(list);
    } catch (err) {
      setError(err.message || 'Failed to fetch projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, dateFrom, dateTo, clientId]);

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

  const handleSearch = useCallback((term, from, to, client) => {
    if (term !== undefined) setSearchTerm(term);
    if (from !== undefined) setDateFrom(from);
    if (to !== undefined) setDateTo(to);
    if (client !== undefined) setClientId(client);
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
    dateFrom,
    dateTo,
    clientId,
    createProject,
    updateProject,
    deleteProject,
    handleSearch,
    clearError,
    refreshProjects
  };
};