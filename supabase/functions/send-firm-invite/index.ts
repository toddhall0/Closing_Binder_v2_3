// Supabase Edge Function: send-firm-invite
// Purpose: Allow firm owners to invite firm admins by email.
// Security: Requires Authorization bearer token from a logged-in user AND uses SERVICE_ROLE for DB writes.
// Configure secrets in Supabase:
// - SUPABASE_URL
// - SUPABASE_ANON_KEY
// - SUPABASE_SERVICE_ROLE_KEY
// - RESEND_API_KEY (or SENDGRID_API_KEY)
// - FROM_EMAIL (e.g. no-reply@yourdomain.com)
// - APP_NAME (optional)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type InvitePayload = {
  toEmail: string;
  inviterName?: string;
  appOrigin?: string; // e.g. https://app.example.com
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "no-reply@example.com";
const APP_NAME = Deno.env.get("APP_NAME") || "Closing Binder Pro";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function assertString(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
}

function buildEmailHtml(inviteUrl: string, codeUrl: string, inviteCode: string, toEmail: string, inviterName?: string): string {
  const inviter = inviterName && inviterName.trim().length > 0 ? inviterName : "A firm member";
  return `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111827;">
    <h1 style="font-size:20px; margin:0 0 12px 0;">You've been invited as a Firm Admin</h1>
    <p style="margin:0 0 12px 0;">${inviter} invited you to join ${APP_NAME} as a firm admin.</p>
    <p style="margin:0 0 12px 0;">Use your email <strong>${toEmail}</strong> to sign in.</p>
    <h2 style="font-size:16px; margin:16px 0 8px 0;">Quick instructions</h2>
    <ol style="margin:0 0 12px 20px; padding:0;">
      <li style="margin:4px 0;">Click the button below to open the app.</li>
      <li style="margin:4px 0;">Create your profile (name, password, etc.).</li>
      <li style="margin:4px 0;">When asked for an invite code, paste the code shown below.</li>
    </ol>
    <div style="margin:20px 0;">
      <a href="${inviteUrl}" style="display:inline-block; padding:10px 14px; background:#111111; color:#ffffff; text-decoration:none; border-radius:8px;">Accept Invitation</a>
    </div>
    <div style="margin:16px 0 0 0;">
      <p style="margin:0 0 8px 0;">Your invite code:</p>
      <a href="${codeUrl}" style="text-decoration:none; color:#111827;">
        <span style="display:inline-block; padding:10px 12px; border:1px solid #e5e7eb; border-radius:6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace; background:#f9fafb;">${inviteCode}</span>
      </a>
      <p style="margin:8px 0 0 0; font-size:12px; color:#6b7280;">Tip: Click the code to automatically copy it and open the app with the code pre-filled.</p>
    </div>
    <p style="margin:24px 0 0 0; font-size:12px; color:#6b7280;">If you did not expect this invitation, you can ignore this email.</p>
  </div>`;
}

async function sendWithResend(toEmail: string, subject: string, html: string) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: toEmail, subject, html }),
  });
  if (!resp.ok) throw new Error(`Resend error (${resp.status}): ${await resp.text()}`);
  return await resp.json();
}

async function sendWithSendGrid(toEmail: string, subject: string, html: string) {
  const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: toEmail }] }],
      from: { email: FROM_EMAIL },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });
  if (!resp.ok) throw new Error(`SendGrid error (${resp.status}): ${await resp.text()}`);
  return { success: true };
}

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b)=>b.toString(16).padStart(2, "0")).join("");
}

serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) throw new Error("Missing Authorization header");

    // Be tolerant of missing/invalid JSON and alternate keys
    let payload: any = {};
    try {
      payload = await req.json();
    } catch (_) {
      payload = {};
    }
    const toEmail: string = (typeof payload.toEmail === 'string' && payload.toEmail.trim())
      || (typeof payload.email === 'string' && payload.email.trim())
      || (typeof payload.to === 'string' && payload.to.trim())
      || '';
    assertString(toEmail, "toEmail");

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    // Verify requester identity
    const { data: userData, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !userData?.user) throw new Error("Not authenticated");
    const requester = userData.user;
    // Ensure requester is a firm owner (has any clients with owner_id == requester.id)
    const { data: owned } = await serviceClient.from('clients').select('id').eq('owner_id', requester.id).limit(1).maybeSingle();
    if (!owned) throw new Error("Only firm owners can send admin invites");
    // Create invite
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: insErr } = await serviceClient.from('firm_invites').insert({
      firm_owner_id: requester.id,
      email: toEmail.toLowerCase(),
      token,
      expires_at: expiresAt
    });
    if (insErr) throw new Error(insErr.message);
    const appUrl = (typeof payload.appOrigin === 'string' ? payload.appOrigin : '').replace(/\/$/, '') || 'https://app.example.com';
    const inviteUrl = `${appUrl}/accept-invite?type=firm&token=${encodeURIComponent(token)}&email=${encodeURIComponent(toEmail)}`;
    const codeUrl = `${appUrl}/accept-invite?copy=${encodeURIComponent(token)}&email=${encodeURIComponent(toEmail)}`;
    const subject = `${APP_NAME}: Firm Admin Invitation`;
    const html = buildEmailHtml(inviteUrl, codeUrl, token, toEmail, typeof payload.inviterName === 'string' ? payload.inviterName : undefined);
    let result;
    if (RESEND_API_KEY) {
      result = await sendWithResend(toEmail, subject, html);
    } else if (SENDGRID_API_KEY) {
      result = await sendWithSendGrid(toEmail, subject, html);
    } else {
      throw new Error("No email provider configured");
    }
    return new Response(JSON.stringify({
      ok: true,
      result
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: String(err?.message || err)
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 400
    });
  }
});
