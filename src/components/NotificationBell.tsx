'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, ArrowUp, MessageCircle, MessageSquare, Ban, AlertTriangle, CheckCircle, XCircle, Users } from 'lucide-react';
import Link from 'next/link';
import { useNotifications, useNotificationPermission } from '@/hooks/useNotifications';
import { Notification, NotificationType } from '@/types/notifications';
import { formatDistanceToNow } from '@/lib/utils';

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  upvote: <ArrowUp className="h-4 w-4 text-indigo-500" />,
  comment: <MessageCircle className="h-4 w-4 text-blue-500" />,
  reply: <MessageSquare className="h-4 w-4 text-green-500" />,
  ban: <Ban className="h-4 w-4 text-red-500" />,
  unban: <CheckCircle className="h-4 w-4 text-green-500" />,
  moderation_request: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  moderation_approved: <CheckCircle className="h-4 w-4 text-green-500" />,
  moderation_rejected: <XCircle className="h-4 w-4 text-red-500" />,
  group_request: <Users className="h-4 w-4 text-purple-500" />,
};

const notificationColors: Record<NotificationType, string> = {
  upvote: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
  comment: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  reply: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  ban: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  unban: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  moderation_request: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
  moderation_approved: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  moderation_rejected: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  group_request: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
};

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    refreshNotifications 
  } = useNotifications();
  const { permission, requestPermission } = useNotificationPermission();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.type === 'group_request') {
      // Navigate to admin group requests page
      window.location.href = '/admin/group-requests';
    } else if (notification.post_id) {
      // Navigate to the relevant post/comment
      const url = notification.comment_id 
        ? `/post/${notification.post_id}?comment=${notification.comment_id}`
        : `/post/${notification.post_id}`;
      window.location.href = url;
    }
    
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            refreshNotifications();
          }
        }}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 sm:mt-2 mt-2 w-auto sm:w-96 bg-background border border-border rounded-xl shadow-2xl z-50 overflow-hidden max-w-md sm:max-w-none mx-auto sm:mx-0">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted">
            <h3 className="font-semibold text-sm text-foreground">Notificaciones</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 hover:bg-muted rounded-md transition-colors"
                  title="Marcar todas como leídas"
                >
                  <Check className="h-4 w-4" />
                </button>
              )}
              {permission !== 'granted' && (
                <button
                  onClick={requestPermission}
                  className="p-1.5 hover:bg-muted rounded-md transition-colors text-xs"
                  title="Habilitar notificaciones del navegador"
                >
                  🔔
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                Cargando...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tienes notificaciones</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 hover:bg-muted/50 transition-colors cursor-pointer group ${
                      !notification.is_read ? 'bg-muted/30' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`p-2 rounded-lg ${notificationColors[notification.type]}`}>
                        {notificationIcons[notification.type]}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(notification.created_at)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="p-1 hover:bg-muted rounded"
                            title="Marcar como leída"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="p-1 hover:bg-muted rounded text-destructive"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 border-t border-border bg-muted text-center">
              <Link
                href="/notifications"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Ver todas las notificaciones
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}