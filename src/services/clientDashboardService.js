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

      // Resolve client_id preference order: explicit clientId > lookup by email
      let clientId = binderData.clientId || null;
      if (!clientId && binderData.clientEmail) {
        const emailLower = binderData.clientEmail.toLowerCase();
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('email', emailLower)
          .eq('owner_id', user.id)
          .maybeSingle();
        if (existingClient?.id) {
          clientId = existingClient.id;
        } else {
          // Create a client row (best-effort)
          const name = binderData.clientName?.trim() || emailLower.split('@')[0];
          const slugBase = name.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-+|-+$/g, '') || emailLower.split('@')[0];
          const slug = `${slugBase}-${Math.random().toString(16).slice(2, 8)}`;
          const { data: newClient, error: clientErr } = await supabase
            .from('clients')
            .insert({ name, email: emailLower, slug, owner_id: user.id })
            .select('id')
            .single();
          if (!clientErr && newClient?.id) {
            clientId = newClient.id;
          }
        }
      }

      // Prepare binder data
      const publishData = {
        project_id: binderData.projectId,
        user_id: user.id,
        client_name: binderData.clientName,
        client_email: binderData.clientEmail || null,
        client_id: clientId || null,
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

      // Upsert: if a binder already exists for this project + client, update it instead of inserting
      let existing = null;
      try {
        let existingQuery = supabase
          .from('client_binders')
          .select('id')
          .eq('project_id', publishData.project_id)
          .limit(1);
        if (publishData.client_id) {
          existingQuery = existingQuery.eq('client_id', publishData.client_id);
        } else if (publishData.client_email) {
          existingQuery = existingQuery.eq('client_email', publishData.client_email);
        }
        const { data: existingRow } = await existingQuery.maybeSingle();
        existing = existingRow || null;
      } catch {}

      let data, error;
      if (existing?.id) {
        ({ data, error } = await supabase
          .from('client_binders')
          .update({
            ...publishData,
            access_code: publishData.access_code // keep a fresh code if needed
          })
          .eq('id', existing.id)
          .select()
          .single());
      } else {
        ({ data, error } = await supabase
          .from('client_binders')
          .insert(publishData)
          .select()
          .single());
      }

      if (error) throw error;

      // If documents are provided, create document access records
      if (binderData.documents && binderData.documents.length > 0) {
        const documentRecords = binderData.documents.map(doc => ({
          client_binder_id: data.id,
          document_id: doc.id,
          is_downloadable: doc.isDownloadable !== false,
          is_viewable: doc.isViewable !== false
        }));
        // Replace existing document links for this binder
        await supabase
          .from('client_binder_documents')
          .delete()
          .eq('client_binder_id', data.id);
        const { error: docsError } = await supabase
          .from('client_binder_documents')
          .insert(documentRecords);

        if (docsError) {
          console.warn('Error creating document access records:', docsError);
        }
      }

      // Fetch client to get slug for convenience
      let client = null;
      if (data?.client_id) {
        const { data: c } = await supabase.from('clients').select('slug').eq('id', data.client_id).maybeSingle();
        client = c || null;
      }

      return { data: { ...data, client_slug: client?.slug || null }, error: null };
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
   * Get client-facing binders assigned to the currently authenticated client user
   * Supports filtering by date range, state, parties and keyword search.
   * Note: This assumes Supabase RLS policies expose only binders where the
   * authenticated user's email matches client_email (or an invites table RLS).
   * @param {Object} filters
   * @param {string} [filters.query] - keyword across title/address/description
   * @param {string} [filters.state] - state filter if stored on project/binder
   * @param {string[]} [filters.parties] - array of party roles to filter when present in cover_page_data/contact_info
   * @param {string} [filters.from] - ISO date string (created_at/published_at >= from)
   * @param {string} [filters.to] - ISO date string (created_at/published_at <= to)
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  static async getClientBinders(filters = {}) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const emailLower = (user.email || '').toLowerCase();
      // Find client memberships for this email (invited users)
      let memberClientIds = [];
      try {
        const { data: memberships } = await supabase
          .from('client_users')
          .select('client_id')
          .eq('email', emailLower);
        memberClientIds = (memberships || []).map(r => r.client_id).filter(Boolean);
      } catch {}

      const toISO = (s) => {
        if (!s) return null;
        const t = String(s).trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
        const m = t.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
        if (m) {
          let y = Number(m[3]); if (y < 100) y = 2000 + y;
          const mo = String(m[1]).padStart(2, '0');
          const d = String(m[2]).padStart(2, '0');
          return `${y}-${mo}-${d}`;
        }
        return t;
      };

      let query = supabase
        .from('client_binders')
        .select(`
          *,
          projects(
            title,
            property_address,
            buyer,
            seller,
            closing_date,
            purchase_price,
            cover_photo_url,
            property_photo_url,
            cover_page_data
          )
        `)
        .eq('is_published', true)
        .eq('is_active', true);

      // Access control: show binders where this email is the client_email OR invited via client_users
      const orFilters = [];
      if (emailLower) orFilters.push(`client_email.eq.${emailLower}`);
      if (memberClientIds.length > 0) orFilters.push(`client_id.in.(${memberClientIds.join(',')})`);
      // Do NOT include publisher fallback here; client route must only see their assigned binders
      if (orFilters.length > 0) {
        query = query.or(orFilters.join(','));
      }

      // Not expired
      query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      // Date range: server-side on normalized date column (ensure ISO format)
      const fromISO = toISO(filters.from);
      const toISOVal = toISO(filters.to);
      if (fromISO || toISOVal) query = query.not('closing_date_date', 'is', null);
      // Per request: treat "from" as selected day + 1 to avoid timezone edge cases
      const plusOne = (iso) => {
        if (!iso) return null;
        const d = new Date(iso + 'T00:00:00Z');
        d.setUTCDate(d.getUTCDate() + 1);
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
      };
      const fromPlusOne = plusOne(fromISO);
      if (fromPlusOne) query = query.gte('closing_date_date', fromPlusOne);
      if (toISOVal) query = query.lte('closing_date_date', toISOVal);

      // State filter fallback: search within address fields if schema lacks state column
      if (filters.state) {
        const like = `%${filters.state}%`;
        query = query.or(`property_address.ilike.${like}`);
      }

      // Keyword search
      if (filters.query && filters.query.trim().length > 0) {
        const like = `%${filters.query.trim()}%`;
        query = query.or(`title.ilike.${like},property_address.ilike.${like},property_description.ilike.${like}`);
      }

      const { data, error } = await query.order('published_at', { ascending: false });
      if (error) throw error;

      // Optional: client-side filter for parties when stored in JSON
      let result = data || [];
      if (filters.parties && Array.isArray(filters.parties) && filters.parties.length > 0) {
        const partyKeys = new Set(filters.parties.map(p => String(p).toLowerCase()));
        result = result.filter(b => {
          const info = b?.cover_page_data?.contact_info || b?.contact_info || {};
          return Array.from(partyKeys).every(key => info[key]);
        });
      }

      return { data: result, error: null };
    } catch (error) {
      console.error('Error fetching client binders:', error);
      return { data: [], error };
    }
  }

  /**
   * Get a client by slug
   * @param {string} slug
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async getClientBySlug(slug) {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Get binders for a given client slug (auth required)
   * @param {string} slug
   * @param {Object} filters
   */
  static async getClientBindersBySlug(slug, filters = {}) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      const { data: client, error: clientErr } = await this.getClientBySlug(slug);
      if (clientErr || !client) throw new Error('Client not found');

      const toISO = (s) => {
        if (!s) return null;
        const t = String(s).trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
        const m = t.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
        if (m) {
          let y = Number(m[3]); if (y < 100) y = 2000 + y;
          const mo = String(m[1]).padStart(2, '0');
          const d = String(m[2]).padStart(2, '0');
          return `${y}-${mo}-${d}`;
        }
        return t;
      };

      let query = supabase
        .from('client_binders')
        .select(`
          *,
          projects(
            title,
            property_address,
            buyer,
            seller,
            closing_date,
            purchase_price,
            cover_photo_url,
            property_photo_url,
            cover_page_data
          )
        `)
        // Include binders linked by client_id OR legacy/email-based association
        .or(`client_id.eq.${client.id},client_email.eq.${(client.email || '').toLowerCase()}`)
        .eq('is_published', true)
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      const fromISO = toISO(filters.from);
      const toISOVal = toISO(filters.to);
      if (fromISO || toISOVal) query = query.not('closing_date_date', 'is', null);
      const plusOne = (iso) => {
        if (!iso) return null;
        const d = new Date(iso + 'T00:00:00Z');
        d.setUTCDate(d.getUTCDate() + 1);
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
      };
      const fromPlusOne = plusOne(fromISO);
      if (fromPlusOne) query = query.gte('closing_date_date', fromPlusOne);
      if (toISOVal) query = query.lte('closing_date_date', toISOVal);
      if (filters.state) {
        const like = `%${filters.state}%`;
        query = query.or(`property_address.ilike.${like}`);
      }
      if (filters.query && filters.query.trim()) {
        const like = `%${filters.query.trim()}%`;
        query = query.or(`title.ilike.${like},property_address.ilike.${like},property_description.ilike.${like}`);
      }

      const { data, error } = await query.order('published_at', { ascending: false });
      if (error) throw error;

      let result = data || [];
      if (filters.parties && Array.isArray(filters.parties) && filters.parties.length > 0) {
        const partyKeys = new Set(filters.parties.map(p => String(p).toLowerCase()));
        result = result.filter(b => {
          const info = b?.cover_page_data?.contact_info || b?.contact_info || {};
          return Array.from(partyKeys).every(key => info[key]);
        });
      }

      return { data: { client, binders: result }, error: null };
    } catch (error) {
      console.error('Error fetching client binders by slug:', error);
      return { data: { client: null, binders: [] }, error };
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
    // Preferred path: secure RPC that bypasses RLS for nested reads
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_client_binder', {
        p_access_code: accessCode,
        p_password: password || null
      });
      if (!rpcError && rpcData) {
        const binderRow = rpcData.binder || {};
        const projectRow = rpcData.project || {};
        const sections = rpcData.sections || [];
        const docs = rpcData.documents || [];
        const logos = rpcData.logos || [];

        // Merge cover page data and contact info from both binder and project
        const coverMerged = {
          ...(binderRow.cover_page_data || {}),
          ...(projectRow.cover_page_data || {})
        };
        if (!coverMerged.contact_info) {
          coverMerged.contact_info = projectRow.contact_info || (projectRow.cover_page_data && projectRow.cover_page_data.contact_info) || null;
        }

        // Build enriched object compatible with existing viewer
        const enrichedData = {
          ...binderRow,
          projects: projectRow,
          logos,
          table_of_contents_data: {
            ...(binderRow.table_of_contents_data || {}),
            sections
          },
          cover_page_data: coverMerged || binderRow.cover_page_data || null,
          // Provide flat documents array for viewer convenience
          documents: docs.map(d => {
            const storage_path = d.storage_path || d.file_path || null;
            let url = null;
            if (storage_path) {
              url = `${process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${String(storage_path).replace(/^documents\//, '')}`;
            } else if (d.file_url) {
              url = d.file_url;
            }
            return {
              ...d,
              display_name: d.display_name || d.original_name || d.name || 'Unnamed Document',
              url
            };
          })
        };

        // Derive top-level transaction fields from cover if missing
        const cv = coverMerged || {};
        enrichedData.contact_info = enrichedData.contact_info || cv.contact_info || projectRow.contact_info || null;
        enrichedData.purchase_price = enrichedData.purchase_price || cv.purchasePrice || projectRow.purchase_price || null;
        enrichedData.closing_date = enrichedData.closing_date || cv.closingDate || projectRow.closing_date || null;
        enrichedData.buyer = enrichedData.buyer || cv.buyer || projectRow.buyer || null;
        enrichedData.seller = enrichedData.seller || cv.seller || projectRow.seller || null;
        enrichedData.attorney = enrichedData.attorney || cv.attorney || projectRow.attorney || null;
        enrichedData.lender = enrichedData.lender || cv.lender || projectRow.lender || null;
        enrichedData.escrow_agent = enrichedData.escrow_agent || cv.escrowAgent || projectRow.escrow_agent || null;
        enrichedData.title_company = enrichedData.title_company || cv.titleCompany || projectRow.title_company || null;
        enrichedData.property_photo_url = enrichedData.property_photo_url || cv.propertyPhotoUrl || projectRow.property_photo_url || null;

        // Track the view (best-effort)
        await this.trackBinderView(enrichedData.id);
        console.log('Enriched binder data:', enrichedData);
        return { data: enrichedData, error: null };
      }
    } catch (rpcCatch) {
      console.log('RPC get_client_binder failed, falling back to joins:', rpcCatch);
    }

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
          documents(*)
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

    // FIXED: Properly flatten and merge the project data without overriding binder id
    const projectData = data.projects || {};
    const { id: projectId, ...projectRest } = projectData;
    
    const enrichedData = {
      ...data,
      // Flatten selected project fields but preserve binder identifiers
      ...projectRest,
      // Explicitly keep binder id and project_id
      id: data.id,
      project_id: data.project_id,
      // Override with binder-specific data if present
      title: data.title || projectData.title,
      property_address: data.property_address || projectData.property_address,
      property_description: data.property_description || projectData.property_description,
      // Photo fields
      cover_photo_url: data.cover_photo_url || projectData.cover_photo_url || projectData.property_photo_url,
      property_photo_url: data.property_photo_url || projectData.property_photo_url || projectData.cover_photo_url,
      // Keep full project for reference
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