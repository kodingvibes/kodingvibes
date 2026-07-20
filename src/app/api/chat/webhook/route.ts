import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyWebhookSignature } from '@/lib/webhook'

export const dynamic = 'force-dynamic'

interface WebhookPayload {
  event: string
  data: {
    id: number
    channel_id: number
    channel_name: string
    user_id: number
    display_name: string
    email: string
    content: string
    created_at: number
    mentioned_user_ids: number[]
    mentioned_user_emails: string[]
  }
  ts?: number
}

export async function POST(request: Request) {
  const raw = await request.text()
  const signature = request.headers.get('x-chat-signature')

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  let payload: WebhookPayload
  try {
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (payload.event !== 'message.new') {
    return NextResponse.json({ ok: true, ignored: payload.event })
  }

  const data = payload.data
  if (!data?.mentioned_user_emails?.length) {
    return NextResponse.json({ ok: true, ignored: 'no mentions' })
  }

  const supabase = await createClient()

  // Find kodingvibes users by email
  const { data: kodingvibesUsers, error: usersErr } = await supabase
    .from('users')
    .select('id, email')
    .in('email', data.mentioned_user_emails)

  if (usersErr) {
    return NextResponse.json({ error: usersErr.message }, { status: 500 })
  }

  if (!kodingvibesUsers?.length) {
    return NextResponse.json({ ok: true, ignored: 'no kodingvibes users matched' })
  }

  // Look up sender's name for the notification
  const { data: sender } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('email', data.email)
    .single()

  const senderName = sender?.name || data.display_name

  // Create a notification per mentioned user. We use 'reply' as the type
  // since the existing CHECK constraint is (upvote, comment, reply) and
  // a chat mention semantically is closer to a reply than a comment.
  const rows = kodingvibesUsers.map((u) => ({
    user_id: u.id,
    type: 'reply',
    title: `${senderName} te mencionó en ${data.channel_name}`,
    message: data.content,
    actor_id: sender?.id || null,
    actor_name: senderName,
    is_read: false,
    metadata: {
      source: 'late.sh/chat',
      channel_name: data.channel_name,
      message_id: data.id,
    },
  }))

  // We need to insert into the notifications table. The schema has
  // post_id and comment_id foreign keys, but a chat mention doesn't
  // have those. Use the metadata JSONB to store the chat context.
  const { error: insErr } = await supabase.from('notifications').insert(rows)
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, notified: rows.length })
}
