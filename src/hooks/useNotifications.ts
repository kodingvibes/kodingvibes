'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Notification } from '@/types/notifications';

interface UseNotificationsOptions {
  limit?: number;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { limit = 50 } = options;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const userIdRef = useRef<string | null>(null);

  const fetchNotifications = useCallback(async (offset = 0, append = false) => {
    try {
      if (!append) {
        setLoading(true);
      }
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setNotifications([]);
        setLoading(false);
        return { notifications: [], hasMore: false };
      }

      userIdRef.current = user.id;

      const { data, error: fetchError, count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
        .returns<Notification[]>();

      if (fetchError) {
        throw fetchError;
      }

      const newNotifications = data || [];
      const totalCount = count || 0;
      const newHasMore = offset + newNotifications.length < totalCount;

      if (append) {
        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const uniqueNew = newNotifications.filter(n => !existingIds.has(n.id));
          return [...prev, ...uniqueNew];
        });
      } else {
        setNotifications(newNotifications);
      }
      
      setHasMore(newHasMore);
      
      return { notifications: newNotifications, hasMore: newHasMore };
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Error al cargar notificaciones');
      return { notifications: [], hasMore: false };
    } finally {
      setLoading(false);
    }
  }, [supabase, limit]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      let userId = userIdRef.current;
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        userId = user.id;
        userIdRef.current = userId;
      }

      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, [supabase]);

  const markAllAsRead = useCallback(async () => {
    try {
      let userId = userIdRef.current;
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        userId = user.id;
        userIdRef.current = userId;
      }

      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (updateError) {
        throw updateError;
      }

      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, [supabase]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      let userId = userIdRef.current;
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        userId = user.id;
        userIdRef.current = userId;
      }

      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (deleteError) {
        throw deleteError;
      }

      setNotifications(prev => 
        prev.filter(n => n.id !== notificationId)
      );
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, [supabase]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchNotifications(notifications.length, true);
  }, [fetchNotifications, hasMore, loading, notifications.length]);

  const setupRealtimeSubscription = useCallback(() => {
    const userId = userIdRef.current;
    if (!userId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => {
            if (prev.some(n => n.id === newNotification.id)) {
              return prev;
            }
            return [newNotification, ...prev];
          });
          
          if ('Notification' in window && window.Notification.permission === 'granted') {
            new window.Notification(newNotification.title, {
              body: newNotification.message,
              icon: '/icon-192x192.png',
              tag: newNotification.id,
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;
    let channelCleanup: (() => void) | null = null;

    const init = async () => {
      const result = await fetchNotifications(0, false);
      if (!isMounted) return;
      
      setupRealtimeSubscription();

      if (channelRef.current) {
        channelCleanup = () => {
          supabase.removeChannel(channelRef.current!);
        };
      }
    };

    init();
    
    return () => {
      isMounted = false;
      if (channelCleanup) {
        channelCleanup();
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [supabase, fetchNotifications, setupRealtimeSubscription]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    hasMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications: async () => { await fetchNotifications(0, false); },
    loadMore,
  };
}

// Hook para solicitar permisos de notificación del navegador
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(window.Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return false;
    }

    const result = await window.Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  }, []);

  return { permission, requestPermission };
}