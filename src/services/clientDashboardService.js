// src/services/clientDashboardService.js
import { supabase } from '../lib/supabase';

export class ClientDashboardService {
  /**
   * Publish a binder for client access
   * @param {Object} binderData - Binder publication data
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async publishBinder(binderData) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Generate unique access code
      const { data: accessCodeData, error: codeError } = await supabase
        .rpc('generate_access_code');

      if (codeError) {
        throw new Error('Failed to generate access code');
      }

      const accessCode = accessCodeData;

      // Prepare binder data
      const publishData = {
        project_id: binderData.projectId,
        user_id: user.id,
        client_name: binderData.clientName,
        client_email: binderData.clientEmail,
        access_code: accessCode,
        title: binderData.title,
        property_address: binderData.propertyAddress,
        property_description: binderData.propertyDescription,
        cover_page_data: binderData.coverPageData,
        table_of_contents_data: binderData.tableOfContentsData,
        is_published: true,
        is_active: true,
        expires_at: binderData.expiresAt || null,
        password_protected: binderData.passwordProtected || false,
        access_password: binderData.accessPassword || null,
        published_at: new Date().toISOString()
      };

      // Insert client binder
      const { data, error } = await supabase
        .from('client_binders')
        .insert(publishData)
        .select()
        .single();

      if (error) throw error;

      // If documents are provided, create document access records
      if (binderData.documents && binderData.documents.length > 0) {
        const documentRecords = binderData.documents.map(doc => ({
          client_binder_id: data.id,
          document_id: doc.id,
          is_downloadable: doc.isDownloadable !== false,
          is_viewable: doc.isViewable !== false
        }));

        const { error: docsError } = await supabase
          .from('client_binder_documents')
          .insert(documentRecords);

        if (docsError) {
          console.warn('Error creating document access records:', docsError);
        }
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error publishing binder:', error);
      return { data: null, error };
    }
  }

  /**
   * Get all published binders for the current user
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  static async getUserPublishedBinders() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('client_binders')
        .select(`
          *,
          projects(title, property_address),
          client_binder_documents(
            document_id,
            is_downloadable,
            is_viewable,
            view_count,
            download_count
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching published binders:', error);
      return { data: [], error };
    }
  }

  /**
   * Get a specific published binder by ID
   * @param {string} binderId - Client binder ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async getPublishedBinder(binderId) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('client_binders')
        .select(`
          *,
          projects(*),
          client_binder_documents(
            *,
            documents(*)
          ),
          client_binder_views(
            id,
            viewed_at,
            viewer_ip,
            view_duration
          )
        `)
        .eq('id', binderId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { data: null, error: new Error('Published binder not found') };
        }
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error fetching published binder:', error);
      return { data: null, error };
    }
  }

  /**
   * Get client binder by access code (public access) - FIXED VERSION
   * @param {string} accessCode - Access code
   * @param {string} password - Optional password for protected binders
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  // Replace your getBinderByAccessCode method in clientDashboardService.js with this FIXED version:

static async getBinderByAccessCode(accessCode, password = null) {
  try {
    let query = supabase
      .from('client_binders')
      .select(`
        *,
        projects(
          *
        ),
        client_binder_documents(
          document_id,
          is_downloadable,
          is_viewable,
          documents(
            id,
            name,
            file_url,
            file_path,
            file_size,
            sort_order
          )
        )
      `)
      .eq('access_code', accessCode)
      .eq('is_published', true)
      .eq('is_active', true);

    // Check if binder has expired
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: new Error('Invalid access code or binder not available') };
      }
      throw error;
    }

    // Check password if binder is password protected
    if (data.password_protected && data.access_password) {
      if (!password || password !== data.access_password) {
        return { data: null, error: new Error('Password required or incorrect') };
      }
    }

    // FIXED: Properly flatten and merge the project data
    const projectData = data.projects || {};
    
    const enrichedData = {
      ...data,
      // Flatten all project fields to top level
      ...projectData,
      // Override with binder-specific data if it exists
      title: data.title || projectData.title,
      property_address: data.property_address || projectData.property_address,
      property_description: data.property_description || projectData.property_description,
      
      // Ensure photo fields are properly mapped
      cover_photo_url: data.cover_photo_url || projectData.cover_photo_url || projectData.property_photo_url,
      property_photo_url: data.property_photo_url || projectData.property_photo_url || projectData.cover_photo_url,
      
      // Keep the projects object for debugging
      projects: projectData
    };

    // Also fetch logos for this project
    try {
      const { data: logosData, error: logosError } = await supabase
        .from('logos')
        .select('*')
        .eq('project_id', data.project_id)
        .order('logo_position');

      if (!logosError && logosData) {
        enrichedData.logos = logosData;
      }
    } catch (logosError) {
      console.log('Error fetching logos (non-critical):', logosError);
    }

    // Track the view
    await this.trackBinderView(data.id);

    console.log('Enriched binder data:', enrichedData);
    
    return { data: enrichedData, error: null };
  } catch (error) {
    console.error('Error fetching binder by access code:', error);
    return { data: null, error };
  }
}

  /**
   * Update published binder settings
   * @param {string} binderId - Client binder ID
   * @param {Object} updates - Update data
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async updatePublishedBinder(binderId, updates) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Filter allowed updates
      const allowedFields = [
        'client_name', 'client_email', 'title', 'property_address', 
        'property_description', 'is_active', 'expires_at', 
        'password_protected', 'access_password', 'cover_page_data',
        'table_of_contents_data'
      ];

      const filteredUpdates = {};
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key) && updates[key] !== undefined) {
          filteredUpdates[key] = updates[key];
        }
      });

      if (Object.keys(filteredUpdates).length === 0) {
        throw new Error('No valid fields to update');
      }

      const { data, error } = await supabase
        .from('client_binders')
        .update(filteredUpdates)
        .eq('id', binderId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Published binder not found or you do not have permission to update it');
        }
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error updating published binder:', error);
      return { data: null, error };
    }
  }

  /**
   * Unpublish (deactivate) a binder
   * @param {string} binderId - Client binder ID
   * @returns {Promise<{success: boolean, error: Error|null}>}
   */
  static async unpublishBinder(binderId) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('client_binders')
        .update({ 
          is_published: false, 
          is_active: false 
        })
        .eq('id', binderId)
        .eq('user_id', user.id);

      if (error) throw error;

      return { success: true, error: null };
    } catch (error) {
      console.error('Error unpublishing binder:', error);
      return { success: false, error };
    }
  }

  /**
   * Delete a published binder
   * @param {string} binderId - Client binder ID
   * @returns {Promise<{success: boolean, error: Error|null}>}
   */
  static async deletePublishedBinder(binderId) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('client_binders')
        .delete()
        .eq('id', binderId)
        .eq('user_id', user.id);

      if (error) throw error;

      return { success: true, error: null };
    } catch (error) {
      console.error('Error deleting published binder:', error);
      return { success: false, error };
    }
  }

  /**
   * Track binder view for analytics
   * @param {string} binderId - Client binder ID
   * @param {Object} viewData - View tracking data
   * @returns {Promise<void>}
   */
  static async trackBinderView(binderId, viewData = {}) {
    try {
      // Increment view count
      await supabase.rpc('increment_binder_view_count', { 
        binder_id: binderId 
      });

      // Record detailed view
      const { error } = await supabase
        .from('client_binder_views')
        .insert({
          client_binder_id: binderId,
          viewer_ip: viewData.ip || null,
          viewer_user_agent: viewData.userAgent || navigator.userAgent,
          view_duration: viewData.duration || null,
          pages_viewed: viewData.pagesViewed || []
        });

      if (error) {
        console.warn('Error tracking binder view:', error);
      }
    } catch (error) {
      console.warn('Error in trackBinderView:', error);
    }
  }

  /**
   * Track document access
   * @param {string} binderId - Client binder ID
   * @param {string} documentId - Document ID
   * @param {string} action - 'view' or 'download'
   * @returns {Promise<void>}
   */
  static async trackDocumentAccess(binderId, documentId, action = 'view') {
    try {
      const updateField = action === 'download' ? 'download_count' : 'view_count';
      
      // Update document access count
      await supabase
        .from('client_binder_documents')
        .update({ 
          [updateField]: supabase.raw(`${updateField} + 1`),
          last_accessed_at: new Date().toISOString()
        })
        .eq('client_binder_id', binderId)
        .eq('document_id', documentId);

      // Record detailed access log
      const { error } = await supabase
        .from('client_document_access_logs')
        .insert({
          client_binder_id: binderId,
          document_id: documentId,
          access_type: action,
          accessed_at: new Date().toISOString()
        });

      if (error) {
        console.warn('Error logging document access:', error);
      }
    } catch (error) {
      console.warn('Error in trackDocumentAccess:', error);
    }
  }

  /**
   * Get binder analytics
   * @param {string} binderId - Client binder ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async getBinderAnalytics(binderId) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Get binder with views and document access
      const { data, error } = await supabase
        .from('client_binders')
        .select(`
          *,
          client_binder_views(
            id,
            viewed_at,
            viewer_ip,
            view_duration
          ),
          client_binder_documents(
            document_id,
            view_count,
            download_count,
            last_accessed_at,
            documents(name)
          )
        `)
        .eq('id', binderId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Binder not found or access denied');
        }
        throw error;
      }

      // Process analytics data
      const analytics = {
        totalViews: data.client_binder_views?.length || 0,
        viewsByDay: this.groupViewsByDay(data.client_binder_views || []),
        documentStats: data.client_binder_documents?.map(doc => ({
          documentId: doc.document_id,
          documentName: doc.documents?.name,
          views: doc.view_count || 0,
          downloads: doc.download_count || 0,
          lastAccessed: doc.last_accessed_at
        })) || [],
        firstViewed: data.client_binder_views?.length > 0 
          ? new Date(Math.min(...data.client_binder_views.map(v => new Date(v.viewed_at))))
          : null,
        lastViewed: data.client_binder_views?.length > 0 
          ? new Date(Math.max(...data.client_binder_views.map(v => new Date(v.viewed_at))))
          : null
      };

      return { data: { binder: data, analytics }, error: null };
    } catch (error) {
      console.error('Error fetching binder analytics:', error);
      return { data: null, error };
    }
  }

  /**
   * Helper method to group views by day
   * @param {Array} views - View records
   * @returns {Object} - Views grouped by day
   */
  static groupViewsByDay(views) {
    const grouped = {};
    views.forEach(view => {
      const day = new Date(view.viewed_at).toISOString().split('T')[0];
      grouped[day] = (grouped[day] || 0) + 1;
    });
    return grouped;
  }

  /**
   * Generate secure document URL for client access
   * @param {string} binderAccessCode - Binder access code
   * @param {string} documentId - Document ID
   * @returns {string} - Secure document URL
   */
  static generateSecureDocumentUrl(binderAccessCode, documentId) {
    const baseUrl = window.location.origin;
    return `${baseUrl}/client-binder/${binderAccessCode}/document/${documentId}`;
  }

  /**
   * Generate binder sharing URL
   * @param {string} accessCode - Binder access code
   * @returns {string} - Sharing URL
   */
  static generateSharingUrl(accessCode) {
    const baseUrl = window.location.origin;
    return `${baseUrl}/client-binder/${accessCode}`;
  }
}

export default ClientDashboardService;