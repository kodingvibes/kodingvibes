// Tipos de notificaciones
export type NotificationType = 'upvote' | 'comment' | 'reply' | 'ban' | 'unban' | 'moderation_request' | 'moderation_approved' | 'moderation_rejected' | 'group_request';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  post_id?: string;
  comment_id?: string;
  actor_id?: string;
  actor_name?: string;
  is_read: boolean;
  created_at: string;
  metadata?: {
    vote_count?: number;
    post_title?: string;
    request_id?: string;
    channel_name?: string;
    channel_slug?: string;
    description?: string;
    is_public?: boolean;
  };
}

export interface NotificationInsert {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  post_id?: string;
  comment_id?: string;
  actor_id?: string;
  actor_name?: string;
  metadata?: {
    vote_count?: number;
    post_title?: string;
    request_id?: string;
    channel_name?: string;
    channel_slug?: string;
    description?: string;
    is_public?: boolean;
  };
}

export interface NotificationUpdate {
  is_read?: boolean;
}