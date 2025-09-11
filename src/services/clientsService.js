import { supabase } from '../lib/supabase';

export class ClientsService {
  static async getClients(searchTerm = '') {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      let query = supabase
        .from('clients')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (searchTerm && searchTerm.trim()) {
        const like = `%${searchTerm.trim()}%`;
        query = query.or(`name.ilike.${like},email.ilike.${like},slug.ilike.${like}`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  static async getByEmail(email) {
    try {
      if (!email) return { data: null, error: null };
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('email', String(email).toLowerCase())
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return { data: data || null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  static async getById(id) {
    try {
      if (!id) return { data: null, error: null };
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return { data: data || null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  static async createClient({ name, email, details }) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');
      // Avoid duplicates by returning existing client with the same name for this owner (case-insensitive)
      const { data: existing, error: existingErr } = await supabase
        .from('clients')
        .select('*')
        .eq('owner_id', user.id)
        .ilike('name', name)
        .maybeSingle();
      if (!existingErr && existing) {
        return { data: existing, error: null };
      }

      const emailHandle = email ? String(email).toLowerCase().split('@')[0] : '';
      const slugBase = (name || emailHandle || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'client';
      const slug = `${slugBase}-${Math.random().toString(16).slice(2, 8)}`;
      const { data, error } = await supabase
        .from('clients')
        .insert({ name, email: email ? String(email).toLowerCase() : null, slug, owner_id: user.id, details: details || null })
        .select('*')
        .single();
      if (error) {
        // If a unique constraint is added later and triggers a conflict, try to return the existing record
        if (error.code === '23505') {
          const { data: again } = await supabase
            .from('clients')
            .select('*')
            .eq('owner_id', user.id)
            .ilike('name', name)
            .maybeSingle();
          if (again) return { data: again, error: null };
        }
        throw error;
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  static async deleteClient(clientId) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
        .eq('owner_id', user.id);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  static async listClientUsers(clientId) {
    try {
      const { data, error } = await supabase
        .from('client_users')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  static async inviteClientUser(clientId, email, role = 'viewer') {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('client_users')
        .insert({ client_id: clientId, email: String(email).toLowerCase(), role, invited_by: user.id })
        .select('*')
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  static async removeClientUser(clientUserId) {
    try {
      const { error } = await supabase
        .from('client_users')
        .delete()
        .eq('id', clientUserId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  static async updateClient(clientId, { name, email, details }) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email ? String(email).toLowerCase() : null;
      if (details !== undefined) updates.details = details || null;

      if (Object.keys(updates).length === 0) {
        throw new Error('No fields to update');
      }

      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', clientId)
        .eq('owner_id', user.id)
        .select('*')
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}

export default ClientsService;


