export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      comments: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          is_deleted: boolean
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
          vote_count: number
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
          vote_count?: number
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string | null
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          image_url: string | null
          is_deleted: boolean
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          vote_count: number
          group_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          vote_count?: number
          group_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          vote_count?: number
          group_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          is_admin: boolean
          name: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          is_admin?: boolean
          name?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          is_admin?: boolean
          name?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          post_id: string | null
          comment_id: string | null
          actor_id: string | null
          actor_name: string | null
          is_read: boolean
          created_at: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          post_id?: string | null
          comment_id?: string | null
          actor_id?: string | null
          actor_name?: string | null
          is_read?: boolean
          created_at?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          post_id?: string | null
          comment_id?: string | null
          actor_id?: string | null
          actor_name?: string | null
          is_read?: boolean
          created_at?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          subscription: Json
          device_info: string | null
          is_active: boolean
          created_at: string
          last_used_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription: Json
          device_info?: string | null
          is_active?: boolean
          created_at?: string
          last_used_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subscription?: Json
          device_info?: string | null
          is_active?: boolean
          created_at?: string
          last_used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notification_queue: {
        Row: {
          id: string
          user_id: string
          payload: Json
          processed: boolean
          error_message: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          payload: Json
          processed?: boolean
          error_message?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          payload?: Json
          processed?: boolean
          error_message?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_notification_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_votes: {
        Row: {
          id: string
          comment_id: string
          user_id: string
          value: number
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          user_id: string
          value: number
          created_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          user_id?: string
          value?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          is_public: boolean
          is_active: boolean
          is_default: boolean
          created_by: string
          created_at: string
          updated_at: string
          member_count: number
          post_count: number
          event_count: number
          icon_url: string | null
          color: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          is_public?: boolean
          is_active?: boolean
          is_default?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
          member_count?: number
          post_count?: number
          event_count?: number
          icon_url?: string | null
          color?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          is_public?: boolean
          is_active?: boolean
          is_default?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
          member_count?: number
          post_count?: number
          event_count?: number
          icon_url?: string | null
          color?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          role?: string
          joined_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          role?: string
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_tags: {
        Row: {
          id: string
          group_id: string
          name: string
          color: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          name: string
          color?: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          name?: string
          color?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_tags_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_creation_requests: {
        Row: {
          id: string
          requested_by: string
          name: string
          slug: string
          description: string | null
          is_public: boolean
          status: string
          reviewed_by: string | null
          reviewed_at: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          requested_by: string
          name: string
          slug: string
          description?: string | null
          is_public?: boolean
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          requested_by?: string
          name?: string
          slug?: string
          description?: string | null
          is_public?: boolean
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_creation_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_creation_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_requests: {
        Row: {
          id: string
          post_id: string
          group_id: string
          requested_by: string
          reason: string
          status: string
          reviewed_by: string | null
          reviewed_at: string | null
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          group_id: string
          requested_by: string
          reason: string
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          group_id?: string
          requested_by?: string
          reason?: string
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_requests_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bans: {
        Row: {
          id: string
          user_id: string
          banned_by: string
          reason: string
          ban_type: string
          expires_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          unbanned_at: string | null
          unbanned_by: string | null
          unban_reason: string | null
        }
        Insert: {
          id?: string
          user_id: string
          banned_by: string
          reason: string
          ban_type: string
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          unbanned_at?: string | null
          unbanned_by?: string | null
          unban_reason?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          banned_by?: string
          reason?: string
          ban_type?: string
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          unbanned_at?: string | null
          unbanned_by?: string | null
          unban_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bans_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bans_unbanned_by_fkey"
            columns: ["unbanned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          id: string
          group_id: string
          created_by: string
          title: string
          description: string | null
          event_type: string
          start_date: string
          end_date: string | null
          location: string | null
          meeting_link: string | null
          max_attendees: number | null
          is_public: boolean
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          created_by: string
          title: string
          description?: string | null
          event_type: string
          start_date: string
          end_date?: string | null
          location?: string | null
          meeting_link?: string | null
          max_attendees?: number | null
          is_public?: boolean
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          created_by?: string
          title?: string
          description?: string | null
          event_type?: string
          start_date?: string
          end_date?: string | null
          location?: string | null
          meeting_link?: string | null
          max_attendees?: number | null
          is_public?: boolean
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          id: string
          event_id: string
          user_id: string
          status: string
          registered_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          status?: string
          registered_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          status?: string
          registered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_group_request: {
        Args: {
          request_id: string
          admin_id: string
        }
        Returns: undefined
      }
      reject_group_request: {
        Args: {
          request_id: string
          admin_id: string
          reason: string
        }
        Returns: undefined
      }
      approve_moderation_request: {
        Args: {
          request_id: string
          admin_id: string
          notes?: string
        }
        Returns: undefined
      }
      reject_moderation_request: {
        Args: {
          request_id: string
          admin_id: string
          notes: string
        }
        Returns: undefined
      }
      ban_user: {
        Args: {
          target_user_id: string
          admin_id: string
          ban_reason: string
          ban_type_val: string
          expires_at_val?: string
        }
        Returns: string
      }
      unban_user: {
        Args: {
          target_user_id: string
          admin_id: string
          unban_reason_val?: string
        }
        Returns: undefined
      }
      is_user_banned: {
        Args: {
          check_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
      PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
