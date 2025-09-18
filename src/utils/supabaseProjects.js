// ===============================
// FILE: src/utils/supabaseProjects.js
// Complete Supabase Projects Service - Final Version with getAllProjects
// ===============================

import { supabase } from '../lib/supabase';

class ProjectsService {
  /**
   * Get all projects for the current user
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  static async getProjects() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Allow firm admins to see projects owned by the firm owner(s) who invited them
      const { data: memberships } = await supabase
        .from('firm_users')
        .select('firm_owner_id')
        .eq('user_id', user.id);
      const ownerIds = Array.from(new Set([user.id, ...((memberships || []).map(m => m.firm_owner_id).filter(Boolean))]));

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .in('user_id', ownerIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching projects:', error);
      return { data: [], error };
    }
  }

  /**
   * Alias for getProjects() - for backward compatibility
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  static async getAllProjects() {
    return this.getProjects();
  }

  /**
   * Search projects for current user with text query and optional closing date range
   * @param {Object} filters
   * @param {string} [filters.query]
   * @param {string} [filters.from]
   * @param {string} [filters.to]
   */
  static async searchProjects(filters = {}) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      // Allow firm admins to see projects owned by the firm owner(s) who invited them
      const { data: memberships } = await supabase
        .from('firm_users')
        .select('firm_owner_id')
        .eq('user_id', user.id);
      const ownerIds = Array.from(new Set([user.id, ...((memberships || []).map(m => m.firm_owner_id).filter(Boolean))]));

      let query = supabase
        .from('projects')
        .select('*')
        .in('user_id', ownerIds)
        .order('created_at', { ascending: false });

      if (filters.query && filters.query.trim()) {
        const like = `%${filters.query.trim()}%`;
        query = query.or(`title.ilike.${like},property_address.ilike.${like},property_description.ilike.${like},client_name.ilike.${like}`);
      }

      if (filters.clientId && String(filters.clientId).trim()) {
        query = query.eq('client_id', filters.clientId);
      }

      // Apply server-side date range using projects.closing_date (stored as ISO-like string)
      const mkYMD = (s) => {
        const m1 = String(s).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (m1) return `${m1[1]}-${String(m1[2]).padStart(2,'0')}-${String(m1[3]).padStart(2,'0')}`;
        const m2 = String(s).trim().match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
        if (m2) {
          let y = Number(m2[3]); if (y < 100) y = 2000 + y;
          const mo = String(m2[1]).padStart(2,'0');
          const d = String(m2[2]).padStart(2,'0');
          return `${y}-${mo}-${d}`;
        }
        const dt = new Date(s);
        if (!isNaN(dt.getTime())) {
          return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}`;
        }
        return null;
      };

      const fromY = filters.from ? mkYMD(filters.from) : null;
      const toY = filters.to ? mkYMD(filters.to) : null;
      if (fromY) query = query.gte('closing_date', fromY);
      if (toY) query = query.lte('closing_date', toY);

      const { data, error } = await query;
      if (error) throw error;

      // Hybrid client-side closing date filter with fallback
      let list = data || [];
      if (filters.from || filters.to) {
        const parseMDY = (s) => {
          let m = String(s).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
          if (m) { return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) }; }
          m = String(s).trim().match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
          if (m) { let y = Number(m[3]); if (y < 100) y = 2000 + y; return { y, mo: Number(m[1]), d: Number(m[2]) }; }
          const dt = new Date(s);
          if (isNaN(dt.getTime())) return null;
          return { y: dt.getFullYear(), mo: dt.getMonth() + 1, d: dt.getDate() };
        };
        const noonMSTUtcTs = ({ y, mo, d }) => Date.UTC(y, mo - 1, d, 19, 0, 0, 0);
        const startOfDayMSTUtcTs = ({ y, mo, d }) => Date.UTC(y, mo - 1, d, 7, 0, 0, 0);
        const endOfDayMSTUtcTs = ({ y, mo, d }) => {
          const t = Date.UTC(y, mo - 1, d, 7, 0, 0, 0);
          const dt = new Date(t);
          dt.setUTCDate(dt.getUTCDate() + 1);
          dt.setUTCHours(6, 59, 59, 999);
          return dt.getTime();
        };
        const toYMD = ({ y, mo, d }) => {
          const mm = String(mo).padStart(2, '0');
          const dd = String(d).padStart(2, '0');
          return `${y}-${mm}-${dd}`;
        };
        const closingYMD = (project) => {
          // Mirror ProjectCard precedence: cover_page_data -> project.closing_date -> closing_date_date
          let cpd = project?.cover_page_data;
          if (typeof cpd === 'string') {
            try { cpd = JSON.parse(cpd); } catch (_) { /* ignore */ }
          }
          if (cpd && typeof cpd === 'object') {
            const dateStr = cpd.closingDate || cpd.closing_date || cpd.ClosingDate || null;
            if (dateStr) {
              const parts = parseMDY(String(dateStr).trim());
              if (parts) return toYMD(parts);
            }
          }
          if (project?.closing_date) {
            const parts = parseMDY(String(project.closing_date).trim());
            if (parts) return toYMD(parts);
          }
          if (project?.closing_date_date) {
            const parts = parseMDY(String(project.closing_date_date).trim());
            if (parts) return toYMD(parts);
          }
          return null;
        };
        // Treat From as inclusive start of selected day (MST) and To as inclusive end of day
        const parsedFrom = filters.from ? parseMDY(String(filters.from).trim()) : null;
        const parsedTo = filters.to ? parseMDY(String(filters.to).trim()) : null;
        const fromYMD = parsedFrom ? toYMD(parsedFrom) : null;
        const toYMDStr = parsedTo ? toYMD(parsedTo) : null;
        const debugItems = [];
        list = list.filter((p) => {
          const ymd = closingYMD(p);
          debugItems.push({ id: p.id, ymd });
          if (!ymd) return false;
          if (fromYMD && ymd < fromYMD) return false;
          if (toYMDStr && ymd > toYMDStr) return false;
          return true;
        });
        try { if (typeof window !== 'undefined') { window.__projectsDateFilter = { fromYMD, toYMD: toYMDStr, items: debugItems }; } } catch(_) {}
      }

      return { data: list, error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  /**
   * Get a single project by ID
   * @param {string} projectId - Project ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async getProject(projectId) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Include owner(s) of firm this user administers
      const { data: memberships } = await supabase
        .from('firm_users')
        .select('firm_owner_id')
        .eq('user_id', user.id);
      const ownerIds = Array.from(new Set([user.id, ...((memberships || []).map(m => m.firm_owner_id).filter(Boolean))]));

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .in('user_id', ownerIds)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return { data: null, error: new Error('Project not found') };
        }
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error fetching project:', error);
      return { data: null, error };
    }
  }

  /**
   * Create a new project
   * @param {Object} projectData - Project data
   * @param {string} projectData.title - Project title
   * @param {string} projectData.property_address - Property address
   * @param {string} projectData.property_description - Property description
   * @param {string} [projectData.cover_photo_url] - Cover photo URL
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async createProject(projectData) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Validate required fields
      if (!projectData.title || !projectData.property_address) {
        throw new Error('Title and property address are required');
      }

      const projectToInsert = {
        user_id: user.id,
        title: projectData.title.trim(),
        property_address: projectData.property_address.trim(),
        property_description: projectData.property_description?.trim() || '',
        // Try to persist property_state if the column exists; ignore failure otherwise
        property_state: projectData.property_state || null,
        // Seed cover_page_data with propertyState so other views can read it immediately
        cover_page_data: { propertyState: projectData.property_state || null },
        cover_photo_url: projectData.cover_photo_url || null
      };

      let { data, error } = await supabase
        .from('projects')
        .insert(projectToInsert)
        .select()
        .single();

      // If insert failed due to missing column, retry without property_state
      if (error) {
        const msg = String(error.message || '').toLowerCase();
        if (error.code === '42703' || msg.includes('property_state') || msg.includes('schema cache')) {
          const fallback = { ...projectToInsert };
          delete fallback.property_state;
          // Still keep cover_page_data seed
          ({ data, error } = await supabase
            .from('projects')
            .insert(fallback)
            .select()
            .single());
        }
      }

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error creating project:', error);
      return { data: null, error };
    }
  }

  /**
   * Update an existing project
   * @param {string} projectId - Project ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async updateProject(projectId, updates) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Filter out undefined values and trim strings
      const filteredUpdates = {};
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          filteredUpdates[key] = typeof updates[key] === 'string' 
            ? updates[key].trim() 
            : updates[key];
        }
      });

      // Don't allow updating user_id or id
      delete filteredUpdates.id;
      delete filteredUpdates.user_id;

      if (Object.keys(filteredUpdates).length === 0) {
        throw new Error('No valid fields to update');
      }

      // Determine permissible owner ids for this admin
      const { data: memberships } = await supabase
        .from('firm_users')
        .select('firm_owner_id')
        .eq('user_id', user.id);
      const ownerIds = Array.from(new Set([user.id, ...((memberships || []).map(m => m.firm_owner_id).filter(Boolean))]));

      const attempt = async (payload) => {
        return supabase
          .from('projects')
          .update(payload)
          .eq('id', projectId)
          .in('user_id', ownerIds)
          .select()
          .single();
      };

      let { data, error } = await attempt(filteredUpdates);

      // If the update failed due to missing property_state column, retry without it
      if (error) {
        const msg = String(error.message || '').toLowerCase();
        if (error.code === '42703' || msg.includes('property_state') || msg.includes('schema cache')) {
          const fallback = { ...filteredUpdates };
          delete fallback.property_state;
          ({ data, error } = await attempt(fallback));
        }
      }

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Project not found or you do not have permission to update it');
        }
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error updating project:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete a project and all its related data (CORRECTED VERSION)
   * @param {string} projectId - Project ID to delete
   * @returns {Promise<{success: boolean, error: Error|null}>}
   */
  static async deleteProject(projectId) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Step 1: Get all sections for this project first
      const { data: sections, error: sectionsError } = await supabase
        .from('sections')
        .select('id')
        .eq('project_id', projectId);

      // Step 2: Delete documents if sections exist
      if (!sectionsError && sections && sections.length > 0) {
        const sectionIds = sections.map(section => section.id);
        
        const { error: documentsError } = await supabase
          .from('documents')
          .delete()
          .in('section_id', sectionIds);

        if (documentsError && documentsError.code !== 'PGRST116') {
          console.warn('Error deleting documents:', documentsError);
          // Continue with deletion process
        }
      }

      // Step 3: Delete any orphaned documents directly linked to project
      const { error: orphanedDocumentsError } = await supabase
        .from('documents')
        .delete()
        .eq('project_id', projectId);

      if (orphanedDocumentsError && orphanedDocumentsError.code !== 'PGRST116') {
        console.warn('Error deleting orphaned documents:', orphanedDocumentsError);
        // Continue with deletion process
      }

      // Step 4: Delete sections
      const { error: deleteSectionsError } = await supabase
        .from('sections')
        .delete()
        .eq('project_id', projectId);

      if (deleteSectionsError && deleteSectionsError.code !== 'PGRST116') {
        console.warn('Error deleting sections:', deleteSectionsError);
        // Continue with deletion process
      }

      // Step 5: Delete logos
      const { error: logosError } = await supabase
        .from('logos')
        .delete()
        .eq('project_id', projectId);

      if (logosError && logosError.code !== 'PGRST116') {
        console.warn('Error deleting logos:', logosError);
        // Continue with deletion process
      }

      // Step 6: Clean up storage files (optional but recommended)
      try {
        // Delete documents from storage
        const { data: files, error: listError } = await supabase.storage
          .from('documents')
          .list(`${user.id}/${projectId}`);

        if (!listError && files && files.length > 0) {
          const filePaths = files.map(file => `${user.id}/${projectId}/${file.name}`);
          
          const { error: storageError } = await supabase.storage
            .from('documents')
            .remove(filePaths);

          if (storageError) {
            console.warn('Error deleting document files:', storageError);
          }
        }

        // Delete images from storage
        const { data: imageFiles, error: imageListError } = await supabase.storage
          .from('images')
          .list(`${user.id}/${projectId}`);

        if (!imageListError && imageFiles && imageFiles.length > 0) {
          const imagePaths = imageFiles.map(file => `${user.id}/${projectId}/${file.name}`);
          
          const { error: imageStorageError } = await supabase.storage
            .from('images')
            .remove(imagePaths);

          if (imageStorageError) {
            console.warn('Error deleting image files:', imageStorageError);
          }
        }
      } catch (storageError) {
        console.warn('Storage cleanup failed, continuing with project deletion:', storageError);
      }

      // Step 7: Finally delete the project itself
      // Allow delete if project belongs to owner(s) this admin represents
      const { data: memberships } = await supabase
        .from('firm_users')
        .select('firm_owner_id')
        .eq('user_id', user.id);
      const ownerIds = Array.from(new Set([user.id, ...((memberships || []).map(m => m.firm_owner_id).filter(Boolean))]));

      const { error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .in('user_id', ownerIds);

      if (projectError) {
        if (projectError.code === 'PGRST116') {
          throw new Error('Project not found or already deleted');
        }
        throw projectError;
      }
      
      return { success: true, error: null };
      
    } catch (error) {
      console.error('Error deleting project:', error);
      return { 
        success: false, 
        error: {
          message: error.message || 'Failed to delete project',
          details: error
        }
      };
    }
  }

  /**
   * Search projects by title or address
   * @param {string} searchTerm - Search term
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  // [removed duplicate searchProjects method]

  /**
   * Get project statistics
   * @returns {Promise<{data: Object, error: Error|null}>}
   */
  static async getProjectStats() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, created_at')
        .eq('user_id', user.id);

      if (projectsError) throw projectsError;

      const projectIds = projects.map(p => p.id);

      let documentsCount = 0;
      if (projectIds.length > 0) {
        const { count, error: documentsError } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .in('project_id', projectIds);

        if (documentsError && documentsError.code !== 'PGRST116') {
          console.warn('Error getting documents count:', documentsError);
        } else {
          documentsCount = count || 0;
        }
      }

      const stats = {
        totalProjects: projects.length,
        totalDocuments: documentsCount,
        recentProjects: projects.filter(p => {
          const projectDate = new Date(p.created_at);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return projectDate > thirtyDaysAgo;
        }).length
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Error fetching project stats:', error);
      return { 
        data: { totalProjects: 0, totalDocuments: 0, recentProjects: 0 }, 
        error 
      };
    }
  }

  /**
   * Duplicate/Clone a project
   * @param {string} projectId - Project ID to duplicate
   * @param {string} newTitle - New title for the duplicated project
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async duplicateProject(projectId, newTitle) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Get the original project
      const { data: originalProject, error: fetchError } = await this.getProject(projectId);
      
      if (fetchError || !originalProject) {
        throw new Error('Original project not found');
      }

      // Create new project with copied data
      const newProjectData = {
        title: newTitle || `${originalProject.title} (Copy)`,
        property_address: originalProject.property_address,
        property_description: originalProject.property_description,
        cover_photo_url: originalProject.cover_photo_url
      };

      const { data: newProject, error: createError } = await this.createProject(newProjectData);
      
      if (createError) throw createError;

      return { data: newProject, error: null };
    } catch (error) {
      console.error('Error duplicating project:', error);
      return { data: null, error };
    }
  }

  /**
   * Check if user has access to a project
   * @param {string} projectId - Project ID
   * @returns {Promise<boolean>}
   */
  static async hasProjectAccess(projectId) {
    try {
      const { data, error } = await this.getProject(projectId);
      return !error && data !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get projects with document counts
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  static async getProjectsWithCounts() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          documents(count),
          sections(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Format the data to include counts
      const formattedData = (data || []).map(project => ({
        ...project,
        document_count: project.documents?.[0]?.count || 0,
        section_count: project.sections?.[0]?.count || 0
      }));

      return { data: formattedData, error: null };
    } catch (error) {
      console.error('Error fetching projects with counts:', error);
      return { data: [], error };
    }
  }

  /**
   * Get a project with related data (documents, sections, etc.)
   * @param {string} projectId - Project ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async getProjectWithDetails(projectId) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data: memberships } = await supabase
        .from('firm_users')
        .select('firm_owner_id')
        .eq('user_id', user.id);
      const ownerIds = Array.from(new Set([user.id, ...((memberships || []).map(m => m.firm_owner_id).filter(Boolean))]));

      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          documents(*),
          sections(*),
          logos(*)
        `)
        .eq('id', projectId)
        .in('user_id', ownerIds)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { data: null, error: new Error('Project not found') };
        }
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error fetching project with details:', error);
      return { data: null, error };
    }
  }

  /**
   * Batch delete projects
   * @param {Array<string>} projectIds - Array of project IDs to delete
   * @returns {Promise<{success: boolean, results: Array, error: Error|null}>}
   */
  static async batchDeleteProjects(projectIds) {
    try {
      if (!projectIds || projectIds.length === 0) {
        throw new Error('No projects specified for deletion');
      }

      const results = [];
      
      for (const projectId of projectIds) {
        const result = await this.deleteProject(projectId);
        results.push({
          projectId,
          success: result.success,
          error: result.error
        });
      }

      const successCount = results.filter(r => r.success).length;
      const hasFailures = results.some(r => !r.success);

      return { 
        success: !hasFailures, 
        results,
        summary: {
          total: projectIds.length,
          successful: successCount,
          failed: projectIds.length - successCount
        },
        error: null 
      };
    } catch (error) {
      console.error('Error batch deleting projects:', error);
      return { 
        success: false, 
        results: [],
        error: {
          message: error.message || 'Failed to batch delete projects',
          details: error
        }
      };
    }
  }
}

export default ProjectsService;