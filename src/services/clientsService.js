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

  static async createClient({ name, email }) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');
      const slugBase = (name || email.split('@')[0] || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'client';
      const slug = `${slugBase}-${Math.random().toString(16).slice(2, 8)}`;
      const { data, error } = await supabase
        .from('clients')
        .insert({ name, email: String(email).toLowerCase(), slug, owner_id: user.id })
        .select('*')
        .single();
      if (error) throw error;
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
}

export default ClientsService;


