import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Load client_users for this client
    const { data: invites, error: invErr } = await serviceClient
      .from('client_users')
      .select('id, email, display_name, first_name, last_name, accepted_at, user_id')
      .eq('client_id', body.clientId);
    if (invErr) throw new Error(invErr.message);

    let updated = 0;
    const roster: Array<Record<string, unknown>> = [];
    for (const inv of invites || []) {
      try {
        const emailLower = (inv.email || '').toLowerCase();
        if (!emailLower) continue;
        // Lookup auth user via GoTrue Admin REST (supports email filter)
        const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(emailLower)}`, {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        });
        if (!resp.ok) continue;
        const users = await resp.json();
        const authUser = Array.isArray(users) && users.length > 0 ? users[0] : null;
        if (!authUser) {
          roster.push({
            id: inv.id,
            email: inv.email,
            role: inv.role,
            first_name: inv.first_name || null,
            last_name: inv.last_name || null,
            display_name: inv.display_name || null,
            accepted: false,
            accepted_at: inv.accepted_at || null,
          });
          continue;
        }

        const meta = (authUser.user_metadata || authUser.raw_user_meta_data || {}) as any;
        const first = (meta.first_name || '').toString().trim();
        const last = (meta.last_name || '').toString().trim();
        const full = (meta.full_name || [first, last].filter(Boolean).join(' ')).toString().trim();

        const updates: Record<string, unknown> = {};
        if (!inv.accepted_at) updates.accepted_at = new Date().toISOString();
        if (!inv.user_id) updates.user_id = authUser.id;
        if (full && !inv.display_name) updates.display_name = full;
        if (first && !inv.first_name) updates.first_name = first;
        if (last && !inv.last_name) updates.last_name = last;
        if (Object.keys(updates).length === 0) {
          roster.push({
            id: inv.id,
            email: inv.email,
            role: inv.role,
            first_name: first || inv.first_name || null,
            last_name: last || inv.last_name || null,
            display_name: full || inv.display_name || null,
            accepted: true,
            accepted_at: inv.accepted_at || null,
          });
          continue;
        }

        const { error: updErr } = await serviceClient
          .from('client_users')
          .update(updates)
          .eq('id', inv.id);
        if (!updErr) updated++;
        roster.push({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          first_name: first || inv.first_name || null,
          last_name: last || inv.last_name || null,
          display_name: full || inv.display_name || null,
          accepted: true,
          accepted_at: updates.accepted_at || inv.accepted_at || null,
        });
      } catch (_) {
        // Continue on per-row failure
      }
    }

    return new Response(JSON.stringify({ ok: true, updated, roster }), {
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


