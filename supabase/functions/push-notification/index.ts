import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

interface NotificationPayload {
  user_id: string
  title: string
  body: string
  url?: string
  data?: Record<string, unknown>
  timestamp: number
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Web Push implementation using Deno
async function sendPushNotification(
  subscription: PushSubscription,
  payload: NotificationPayload,
  vapidDetails: { publicKey: string; privateKey: string; subject: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const endpoint = subscription.endpoint
    const { p256dh, auth } = subscription.keys

    // Create JWT for VAPID authentication
    const jwtHeader = { typ: 'JWT', alg: 'ES256' }
    const jwtPayload = {
      aud: new URL(endpoint).origin,
      exp: Math.floor(Date.now() / 1000) + 86400,
      sub: vapidDetails.subject,
    }

    const jwt = await createJWT(jwtHeader, jwtPayload, vapidDetails.privateKey)

    // Prepare encrypted payload
    const encryptedPayload = await encryptPayload(
      JSON.stringify(payload),
      subscription.keys
    )

    // Send push notification
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt}, k=${vapidDetails.publicKey}`,
        'TTL': '86400',
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
      },
      body: encryptedPayload,
    })

    if (response.status === 201 || response.status === 200) {
      return { success: true }
    } else if (response.status === 410 || response.status === 404) {
      return { success: false, error: 'subscription_expired' }
    } else {
      return { success: false, error: `HTTP ${response.status}: ${await response.text()}` }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Simplified JWT creation (you'll need to implement proper ES256 signing)
async function createJWT(
  header: Record<string, string>,
  payload: Record<string, unknown>,
  privateKey: string
): Promise<string> {
  // Note: This is a simplified version. In production, use a proper crypto library
  const encodedHeader = btoa(JSON.stringify(header))
  const encodedPayload = btoa(JSON.stringify(payload))
  
  // In real implementation, sign with ES256
  // For now, return unsigned JWT (this won't work in production)
  return `${encodedHeader}.${encodedPayload}.signature`
}

// Simplified encryption (you'll need proper implementation)
async function encryptPayload(
  payload: string,
  keys: { p256dh: string; auth: string }
): Promise<ArrayBuffer> {
  // This is a placeholder. Real implementation requires WebCrypto
  const encoder = new TextEncoder()
  return encoder.encode(payload)
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidSubject = Deno.env.get('VAPID_SUBJECT')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      throw new Error('Missing VAPID environment variables')
    }

    const vapidDetails = {
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey,
      subject: vapidSubject,
    }

    // Get request body
    const { user_id, title, body, url, data }: NotificationPayload = await req.json()

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, title, body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch user's active push subscriptions
    const subscriptionsRes = await fetch(
      `${supabaseUrl}/rest/v1/push_subscriptions?user_id=eq.${user_id}&is_active=eq.true&select=*`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        },
      }
    )

    if (!subscriptionsRes.ok) {
      throw new Error(`Failed to fetch subscriptions: ${subscriptionsRes.status}`)
    }

    const subscriptions: { id: string; subscription: PushSubscription }[] = await subscriptionsRes.json()

    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active subscriptions found' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const payload: NotificationPayload = {
      user_id,
      title,
      body,
      url,
      data,
      timestamp: Date.now(),
    }

    // Send to all subscriptions
    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        const result = await sendPushNotification(
          sub.subscription,
          payload,
          vapidDetails
        )

        if (result.error === 'subscription_expired') {
          // Deactivate expired subscription
          await fetch(
            `${supabaseUrl}/rest/v1/push_subscriptions?id=eq.${sub.id}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ is_active: false }),
            }
          )
        }

        return { subscriptionId: sub.id, ...result }
      })
    )

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed: failed,
        results,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Push notification error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
