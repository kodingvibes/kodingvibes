// Tipos de notificaciones
export type NotificationType = 'upvote' | 'comment' | 'reply';

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
  };
}

export interface NotificationUpdate {
  is_read?: boolean;
}