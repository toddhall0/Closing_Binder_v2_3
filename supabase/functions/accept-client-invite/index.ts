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

    // Identify current user
    const { data: userData, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !userData?.user) throw new Error("Not authenticated");
    const user = userData.user;

    const emailLower = (user.email || "").toLowerCase();
    if (!emailLower) throw new Error("User email missing");

    const meta = (user.user_metadata || {}) as any;
    let firstName = (meta.first_name || "").toString().trim();
    let lastName = (meta.last_name || "").toString().trim();
    const displayPref = (meta.full_name || meta.name || meta.display_name || "").toString().trim();
    if ((!firstName || !lastName) && displayPref) {
      const parts = displayPref.split(/\s+/).filter(Boolean);
      if (!firstName && parts[0]) firstName = parts[0];
      if (!lastName && parts.length > 1) lastName = parts.slice(1).join(" ");
    }
    const fullName = displayPref || [firstName, lastName].filter(Boolean).join(" ").trim();

    const updates: Record<string, unknown> = {
      accepted_at: new Date().toISOString(),
      user_id: user.id,
    };
    if (fullName) updates.display_name = fullName;
    if (firstName) updates.first_name = firstName;
    if (lastName) updates.last_name = lastName;

    // Update all client invite rows for this email
    const { error: updErr } = await serviceClient
      .from('client_users')
      .update(updates)
      .eq('email', emailLower);
    if (updErr) throw new Error(updErr.message);

    return new Response(JSON.stringify({ ok: true }), {
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


