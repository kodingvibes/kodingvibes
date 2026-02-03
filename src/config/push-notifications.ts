// VAPID Configuration for Push Notifications
// This is the PUBLIC key - safe to expose in client-side code
export const VAPID_PUBLIC_KEY = 'BDZ34ZBsjmXXHeepfII91XOvh99mt2dwjlJup73EvRX74jA2A2XrBadmp5eea1fUh1u5YwckXtmWZBK1meZ-WxA';

// Validate the key format
if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.length < 20) {
  console.warn('[Push Notifications] VAPID_PUBLIC_KEY is not properly configured');
}
