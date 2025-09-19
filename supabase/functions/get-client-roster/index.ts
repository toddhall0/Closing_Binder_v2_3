import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, X-Client-Info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = { clientId: string };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) throw new Error("Missing Authorization header");

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: userData, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !userData?.user) throw new Error("Not authenticated");
    const requester = userData.user;

    const body = (await req.json()) as Body;
    if (!body?.clientId) throw new Error("clientId is required");

    // Authorization: requester must be owner of client OR be admin for that owner in firm_users
    const { data: clientRow, error: clientErr } = await serviceClient
      .from('clients')
      .select('id, owner_id')
      .eq('id', body.clientId)
      .maybeSingle();
    if (clientErr || !clientRow) throw new Error("Client not found");

    let isAuthorized = clientRow.owner_id === requester.id;
    if (!isAuthorized) {
      const { data: membership } = await serviceClient
        .from('firm_users')
        .select('user_id')
        .eq('user_id', requester.id)
        .eq('firm_owner_id', clientRow.owner_id)
        .limit(1)
        .maybeSingle();
      isAuthorized = !!membership;
    }
    if (!isAuthorized) throw new Error("Not authorized");

    const { data: invites, error: invErr } = await serviceClient
      .from('client_users')
      .select('id, email, role, display_name, first_name, last_name, accepted_at, user_id')
      .eq('client_id', body.clientId)
      .order('created_at', { ascending: false });
    if (invErr) throw new Error(invErr.message);

    const roster: Array<Record<string, unknown>> = [];
    for (const inv of invites || []) {
      const emailLower = (inv.email || '').toLowerCase();
      let first = inv.first_name || '';
      let last = inv.last_name || '';
      let display = inv.display_name || '';
      try {
        // Prefer Supabase Admin API (service role) for reliability
        const adminRes = await serviceClient.auth.admin.listUsersByEmail(emailLower);
        const authUser = (adminRes?.data?.users && adminRes.data.users.length > 0) ? adminRes.data.users[0] : null;
        if (authUser) {
          const meta = (authUser.user_metadata || (authUser as any).raw_user_meta_data || {}) as any;
          const fullPref = (meta.full_name || meta.name || meta.display_name || '').toString().trim();
          let f = (meta.first_name || '').toString().trim();
          let l = (meta.last_name || '').toString().trim();
          if (!f || !l) {
            const parts = fullPref.split(/\s+/).filter(Boolean);
            if (!f && parts[0]) f = parts[0];
            if (!l && parts.length > 1) l = parts.slice(1).join(' ');
          }
          if (!first && f) first = f;
          if (!last && l) last = l;
          if (!display && fullPref) display = fullPref;
        }
      } catch {}

      roster.push({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        first_name: first || null,
        last_name: last || null,
        display_name: display || null,
        accepted_at: inv.accepted_at || null,
        accepted: !!inv.accepted_at,
      });
    }

    return new Response(JSON.stringify({ ok: true, roster }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as any)?.message || err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});


