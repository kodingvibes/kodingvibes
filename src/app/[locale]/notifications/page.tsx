'use client';

import { Bell, Check, Trash2, ArrowUp, MessageCircle, MessageSquare, Ban, AlertTriangle, CheckCircle, XCircle, Users, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';
import { Notification, NotificationType } from '@/types/notifications';
import { formatDistanceToNow } from '@/lib/utils';

export const dynamic = 'force-dynamic'

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  upvote: <ArrowUp className="h-5 w-5 text-indigo-500" />,
  comment: <MessageCircle className="h-5 w-5 text-blue-500" />,
  reply: <MessageSquare className="h-5 w-5 text-green-500" />,
  ban: <Ban className="h-5 w-5 text-red-500" />,
  unban: <CheckCircle className="h-5 w-5 text-green-500" />,
  moderation_request: <AlertTriangle className="h-5 w-5 text-orange-500" />,
  moderation_approved: <CheckCircle className="h-5 w-5 text-green-500" />,
  moderation_rejected: <XCircle className="h-5 w-5 text-red-500" />,
  group_request: <Users className="h-5 w-5 text-purple-500" />,
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

const notificationTypeLabels: Record<NotificationType, string> = {
  upvote: 'Upvote',
  comment: 'Comentario',
  reply: 'Respuesta',
  ban: 'Suspendido',
  unban: 'Suspensión removida',
  moderation_request: 'Solicitud de moderación',
  moderation_approved: 'Moderación aprobada',
  moderation_rejected: 'Moderación rechazada',
  group_request: 'Solicitud de canal',
};

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    hasMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore
  } = useNotifications({ limit: 20 });

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    if (notification.type === 'group_request') {
      router.push('/admin/group-requests');
    } else if (notification.post_id) {
      const url = notification.comment_id
        ? `/post/${notification.post_id}?comment=${notification.comment_id}`
        : `/post/${notification.post_id}`;
      router.push(url);
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Link
              href="/"
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Notificaciones</h1>
                <p className="text-sm text-muted-foreground">Cargando...</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Notificaciones</h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {unreadCount} sin leer
                  </p>
                )}
              </div>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Check className="h-4 w-4" />
              Marcar todas como leídas
            </button>
          )}
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No tienes notificaciones
            </h2>
            <p className="text-muted-foreground">
              Cuando recibas notificaciones, aparecerán aquí.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-muted/30 transition-colors cursor-pointer ${
                      !notification.is_read ? 'bg-muted/20' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${notificationColors[notification.type]}`}>
                        {notificationIcons[notification.type]}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {notificationTypeLabels[notification.type]}
                          </span>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-primary rounded-full" />
                          )}
                        </div>
                        <p className="font-medium text-foreground line-clamp-1">
                          {notification.title}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(notification.created_at)}
                          </p>
                          <div className="flex items-center gap-1">
                            {!notification.is_read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="p-1.5 hover:bg-muted rounded-md transition-colors"
                                title="Marcar como leída"
                              >
                                <Check className="h-4 w-4 text-muted-foreground" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="p-1.5 hover:bg-muted rounded-md transition-colors text-destructive"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-muted hover:bg-muted/80 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    'Cargar más'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
