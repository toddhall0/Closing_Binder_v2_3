// Supabase Edge Function: accept-firm-invite
// Purpose: Validate a firm invite token and add the authenticated user to firm_users for the inviting owner.
// Requires Authorization header for the user claiming the invite.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) throw new Error("Missing Authorization header");

    const { token } = await req.json();
    if (!token || typeof token !== 'string') throw new Error("token is required");

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: userData, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !userData?.user) throw new Error("Not authenticated");
    const user = userData.user;

    // Lookup invite
    const now = new Date().toISOString();
    const { data: invite, error: invErr } = await serviceClient
      .from('firm_invites')
      .select('id, firm_owner_id, email, expires_at, accepted_at')
      .eq('token', token)
      .maybeSingle();
    if (invErr || !invite) throw new Error("Invalid invite token");
    if (invite.accepted_at) throw new Error("Invite already accepted");
    if (invite.expires_at && invite.expires_at < now) throw new Error("Invite expired");

    // Email must match
    if (invite.email.toLowerCase() !== (user.email || '').toLowerCase()) {
      throw new Error("This invite is for a different email");
    }

    // Add membership (idempotent)
    const { error: upsertErr } = await serviceClient
      .from('firm_users')
      .upsert({ firm_owner_id: invite.firm_owner_id, user_id: user.id, role: 'admin' }, { onConflict: 'firm_owner_id,user_id' });
    if (upsertErr) throw new Error(upsertErr.message);

    // Mark invite accepted
    const { error: updErr } = await serviceClient
      .from('firm_invites')
      .update({ accepted_at: now })
      .eq('id', invite.id);
    if (updErr) throw new Error(updErr.message);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});


