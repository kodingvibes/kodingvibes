// notify-email
//
// Webhook receiver triggered by Supabase Database Webhooks on
// INSERT into public.notifications. Sends a transactional email
// via Resend when the notification target user has
// email_notifications = true.
//
// Required secrets:
//   RESEND_API_KEY
//   RESEND_FROM        (default: "KodingVibes <onboarding@resend.dev>")
//   SUPABASE_URL       (auto)
//   SUPABASE_SERVICE_ROLE_KEY  (auto)
//
// Payload (Supabase webhook):
//   { type: "INSERT", table: "notifications", record: { ... }, ... }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRecord {
  id: string
  user_id: string
  type: 'upvote' | 'comment' | 'reply'
  title: string
  message: string
  post_id: string | null
  comment_id: string | null
  actor_id: string | null
  actor_name: string | null
  metadata?: Record<string, unknown>
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: NotificationRecord
}

interface Recipient {
  email: string
  email_notifications: boolean
}

const FROM = Deno.env.get('RESEND_FROM') || 'KodingVibes <onboarding@resend.dev>'

function buildEmailBody(n: NotificationRecord, postUrl: string): { subject: string; html: string; text: string } {
  const actor = n.actor_name || 'Alguien'
  const typeLabel = n.type === 'reply' ? 'respondió a tu comentario' : 'comentó en tu post'

  const subject = `${n.title} · KodingVibes`

  const text =
    `Hola!\n\n` +
    `${actor} ${typeLabel}:\n` +
    `"${n.message.replace(/^"|"$/g, '')}"\n\n` +
    `Ver: ${postUrl}\n\n` +
    `— Equipo KodingVibes`

  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 20px;">${escapeHtml(n.title)}</h2>
      <p style="margin: 0 0 12px; color: #4b5563; font-size: 15px; line-height: 1.5;">
        <strong>${escapeHtml(actor)}</strong> ${typeLabel}:
      </p>
      <blockquote style="margin: 0 0 20px; padding: 12px 16px; background: #f3f4f6; border-left: 3px solid #6366f1; color: #1f2937; font-size: 14px; line-height: 1.5;">
        ${escapeHtml(n.message)}
      </blockquote>
      <a href="${postUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">
        Ver conversación
      </a>
      <p style="margin: 24px 0 0; color: #9ca3af; font-size: 12px;">
        Recibís este email porque tenés notificaciones activadas. Podés desactivarlas en tu perfil.
      </p>
    </div>
  `.trim()

  return { subject, html, text }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function sendViaResend(apiKey: string, to: string, body: { subject: string; html: string; text: string }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject: body.subject,
      html: body.html,
      text: body.text,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Resend ${res.status}: ${errText}`)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!resendApiKey) throw new Error('Missing RESEND_API_KEY')
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase env vars')

    const payload: WebhookPayload = await req.json()

    if (payload.type !== 'INSERT' || payload.table !== 'notifications') {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const n = payload.record
    if (n.type !== 'comment' && n.type !== 'reply') {
      return new Response(JSON.stringify({ skipped: true, reason: 'type not email-worthy' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Look up the recipient's email + opt-in flag
    const lookup = await fetch(
      `${supabaseUrl}/rest/v1/users?id=eq.${n.user_id}&select=email,email_notifications`,
      { headers: { 'Authorization': `Bearer ${supabaseServiceKey}`, 'apikey': supabaseServiceKey } },
    )
    if (!lookup.ok) throw new Error(`User lookup ${lookup.status}`)
    const rows: Recipient[] = await lookup.json()
    const recipient = rows[0]
    if (!recipient?.email) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no email' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!recipient.email_notifications) {
      return new Response(JSON.stringify({ skipped: true, reason: 'opted out' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://www.kodingvibes.com'
    const postUrl = n.post_id ? `${siteUrl}/post/${n.post_id}` : siteUrl
    const body = buildEmailBody(n, postUrl)
    await sendViaResend(resendApiKey, recipient.email, body)

    return new Response(JSON.stringify({ success: true, to: recipient.email }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('notify-email error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
