// Supabase Edge Function: send-client-invite
// Sends client dashboard invitation emails via Resend (preferred) or SendGrid
// Configure the following secrets in Supabase:
// - RESEND_API_KEY (recommended) or SENDGRID_API_KEY
// - FROM_EMAIL (e.g. no-reply@yourdomain.com)
// - APP_NAME (optional, default: "Closing Binder")

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

type InvitePayload = {
  toEmail: string;
  clientName?: string;
  clientSlug?: string | null;
  inviterName?: string;
  appOrigin?: string; // e.g. https://app.example.com
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "no-reply@example.com";
const APP_NAME = Deno.env.get("APP_NAME") || "Closing Binder Pro";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function assertString(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
}

function buildEmailHtml(payload: InvitePayload): string {
  const appUrl = (payload.appOrigin || "").replace(/\/$/, "");
  const clientUrl = payload.clientSlug ? `${appUrl}/client/${payload.clientSlug}` : `${appUrl}/client`;
  // Include redirect to client dashboard after auth
  const loginUrl = `${appUrl}/login?redirect=${encodeURIComponent(payload.clientSlug ? `/client/${payload.clientSlug}` : '/client')}`;
  const signupUrl = `${appUrl}/signup?redirect=${encodeURIComponent(payload.clientSlug ? `/client/${payload.clientSlug}` : '/client')}`;
  const inviter = payload.inviterName && payload.inviterName.trim().length > 0 ? payload.inviterName : "A firm member";
  const clientLabel = payload.clientName ? ` for <strong>${payload.clientName}</strong>` : "";

  return `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111827;">
    <h1 style="font-size:20px; margin:0 0 12px 0;">You've been invited to a Client Dashboard</h1>
    <p style="margin:0 0 12px 0;">${inviter} invited you to access a client dashboard${clientLabel} in ${APP_NAME}.</p>
    <p style="margin:0 0 12px 0;">Use your email <strong>${payload.toEmail}</strong> to sign in.</p>

    <div style="margin:20px 0;">
      <a href="${clientUrl}" style="display:inline-block; padding:10px 14px; background:#111111; color:#ffffff; text-decoration:none; border-radius:8px;">Open Client Dashboard</a>
    </div>

    <p style="margin:0 0 8px 0;">If you don't have an account yet, create one with this email and then log in:</p>
    <ul style="margin:0 0 12px 24px; padding:0;">
      <li><a href="${signupUrl}" style="color:#111111;">Create account</a></li>
      <li><a href="${loginUrl}" style="color:#111111;">Sign in</a></li>
    </ul>

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
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: toEmail,
      subject,
      html,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Resend error (${resp.status}): ${text}`);
  }
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
      personalizations: [ { to: [ { email: toEmail } ] } ],
      from: { email: FROM_EMAIL },
      subject,
      content: [ { type: "text/html", value: html } ],
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`SendGrid error (${resp.status}): ${text}`);
  }
  return { success: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const payload = (await req.json()) as InvitePayload;
    assertString(payload.toEmail, "toEmail");

    const subject = `${APP_NAME}: Client Dashboard Invitation`;
    const html = buildEmailHtml(payload);

    if (RESEND_API_KEY) {
      const result = await sendWithResend(payload.toEmail, subject, html);
      return new Response(JSON.stringify({ provider: "resend", result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    if (SENDGRID_API_KEY) {
      const result = await sendWithSendGrid(payload.toEmail, subject, html);
      return new Response(JSON.stringify({ provider: "sendgrid", result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: "No email provider configured. Set RESEND_API_KEY or SENDGRID_API_KEY." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});


