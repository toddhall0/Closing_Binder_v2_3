import { supabase } from '../lib/supabase';

/**
 * Invoke Supabase Edge Function to send a client invite email.
 * Requires an Edge Function named `send-client-invite` to be deployed.
 */
export const EmailService = {
  async sendClientInvite({ toEmail, clientName, clientSlug, inviterName, appOrigin }) {
    try {
      const payload = {
        toEmail,
        clientName,
        clientSlug,
        inviterName,
        appOrigin: appOrigin || (typeof window !== 'undefined' ? window.location.origin : ''),
      };
      const { data, error } = await supabase.functions.invoke('send-client-invite', {
        body: payload,
      });
      if (error) throw error;
      return { data: data || null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

export default EmailService;


