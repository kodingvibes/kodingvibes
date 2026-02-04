// Client-side Push Notification utilities

import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

type Json = Database['public']['Tables']['push_subscriptions']['Row']['subscription'];

// Convierte una base64 string a Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Verificar si las notificaciones push están soportadas
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

// Obtener la suscripción actual del service worker
export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) return null;

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

// Suscribirse a notificaciones push
export async function subscribeToPushNotifications(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications not supported');
  }

  const registration = await navigator.serviceWorker.ready;

  // Verificar permisos
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }

  // Convertir VAPID key
  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

  // Suscribirse
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey as unknown as ArrayBuffer,
  });

  return subscription;
}

// Guardar suscripción en Supabase
export async function savePushSubscription(subscription: PushSubscription): Promise<void> {
  const supabase = createClient();

  const subscriptionData = subscription.toJSON();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to save push subscription');
  }
  
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: user.id,
      subscription: subscriptionData as Json,
      is_active: true,
      device_info: navigator.userAgent,
    });

  if (error) {
    console.error('Error saving push subscription:', error);
    throw error;
  }
}

// Cancelar suscripción
export async function unsubscribeFromPushNotifications(): Promise<void> {
  const supabase = createClient();
  const subscription = await getCurrentPushSubscription();

  if (subscription) {
    await subscription.unsubscribe();

    // Marcar como inactiva en la BD
    const subscriptionData = subscription.toJSON();
    await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('is_active', true)
      .filter('subscription->>endpoint', 'eq', subscriptionData.endpoint || '');
  }
}

// Verificar estado de suscripción
export async function checkPushSubscriptionStatus(vapidPublicKey: string): Promise<{
  supported: boolean;
  subscribed: boolean;
  permission: NotificationPermission;
}> {
  const supported = isPushNotificationSupported();
  
  if (!supported) {
    return { supported: false, subscribed: false, permission: 'default' };
  }

  const permission = Notification.permission;
  const subscription = await getCurrentPushSubscription();
  const subscribed = subscription !== null;

  return { supported, subscribed, permission };
}

// Inicializar push notifications (llamar al cargar la app)
export async function initializePushNotifications(vapidPublicKey: string): Promise<void> {
  if (!isPushNotificationSupported()) return;

  try {
    const status = await checkPushSubscriptionStatus(vapidPublicKey);

    if (status.supported && status.permission === 'granted' && !status.subscribed) {
      // Re-suscribir si el permiso está concedido pero no hay suscripción
      const subscription = await subscribeToPushNotifications(vapidPublicKey);
      if (subscription) {
        await savePushSubscription(subscription);
      }
    }
  } catch (error) {
    console.error('Error initializing push notifications:', error);
  }
}
