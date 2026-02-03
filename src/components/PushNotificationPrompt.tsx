'use client';

import { useState, useEffect } from 'react';
import { Bell, X, Check, Smartphone } from 'lucide-react';
import { 
  isPushNotificationSupported, 
  subscribeToPushNotifications, 
  savePushSubscription,
  checkPushSubscriptionStatus,
  unsubscribeFromPushNotifications 
} from '@/lib/push-notifications';
import { VAPID_PUBLIC_KEY } from '@/config/push-notifications';

interface PushNotificationPromptProps {
  onClose?: () => void;
}

export function PushNotificationPrompt({ onClose }: PushNotificationPromptProps) {
  const [status, setStatus] = useState<{
    supported: boolean;
    subscribed: boolean;
    permission: NotificationPermission;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    checkInitialStatus();
  }, []);

  const checkInitialStatus = async () => {
    const isSupported = isPushNotificationSupported();
    if (!isSupported) {
      setStatus({ supported: false, subscribed: false, permission: 'default' });
      return;
    }

    const currentStatus = await checkPushSubscriptionStatus(VAPID_PUBLIC_KEY);
    setStatus(currentStatus);

    // Mostrar prompt si no está suscrito y el permiso no fue denegado
    if (!currentStatus.subscribed && currentStatus.permission !== 'denied') {
      // Esperar 3 segundos antes de mostrar para no ser intrusivo
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      const subscription = await subscribeToPushNotifications(VAPID_PUBLIC_KEY);
      if (subscription) {
        await savePushSubscription(subscription);
        setStatus(prev => prev ? { ...prev, subscribed: true, permission: 'granted' } : null);
        setShowPrompt(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al suscribirse');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      await unsubscribeFromPushNotifications();
      setStatus(prev => prev ? { ...prev, subscribed: false } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar suscripción');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    onClose?.();
  };

  // No mostrar si no es soportado o si el usuario denegó el permiso
  if (!status?.supported || status.permission === 'denied') {
    return null;
  }

  // Si ya está suscrito, mostrar un botón pequeño para gestionar
  if (status.subscribed) {
    return (
      <button
        onClick={handleUnsubscribe}
        disabled={loading}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium shadow-lg hover:shadow-xl transition-all"
      >
        <Check className="h-3 w-3" />
        Notificaciones activas
        {loading && <span className="animate-spin ml-1">⏳</span>}
      </button>
    );
  }

  // Prompt para suscribirse
  if (!showPrompt) {
    return (
      <button
        onClick={() => setShowPrompt(true)}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-full text-xs font-medium shadow-lg hover:shadow-xl transition-all"
      >
        <Bell className="h-3 w-3" />
        Activar notificaciones
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:w-80 z-50 bg-card border rounded-xl shadow-2xl p-4 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Notificaciones Push</h3>
            <p className="text-xs text-muted-foreground">Recibe alertas en tu dispositivo</p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-muted rounded-md transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Recibe notificaciones instantáneas cuando alguien interactúe con tus posts, 
        incluso cuando la app esté cerrada.
      </p>

      {error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Activando...' : 'Activar'}
        </button>
        <button
          onClick={handleDismiss}
          disabled={loading}
          className="px-3 py-2 border rounded-lg text-xs font-medium hover:bg-muted transition-colors"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
