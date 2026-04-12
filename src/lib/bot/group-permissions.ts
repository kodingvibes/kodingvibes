import { createAdminClient } from '@/lib/supabase/admin'

export async function canBotModerateGroup(apiKeyId: string, ownerUserId: string, groupId: string): Promise<boolean> {
  const supabase = createAdminClient()

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('created_by, is_active')
    .eq('id', groupId)
    .single()

  if (groupError || !group || !group.is_active) return false
  if (group.created_by !== ownerUserId) return false

  const { data: botRole, error: roleError } = await supabase
    .from('user_api_key_group_roles')
    .select('role')
    .eq('api_key_id', apiKeyId)
    .eq('group_id', groupId)
    .maybeSingle()

  if (roleError) return false
  return botRole?.role === 'moderator'
}

export async function canBotActOnPost(apiKeyId: string, ownerUserId: string, postId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { data: post, error } = await supabase
    .from('posts')
    .select('group_id, user_id')
    .eq('id', postId)
    .single()

  if (error || !post) return false

  if (post.user_id === ownerUserId) return true
  if (!post.group_id) return false

  return canBotModerateGroup(apiKeyId, ownerUserId, post.group_id)
}

export async function canBotActOnComment(apiKeyId: string, ownerUserId: string, commentId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { data: comment, error } = await supabase
    .from('comments')
    .select('id, user_id, post_id')
    .eq('id', commentId)
    .single()

  if (error || !comment) return false
  if (comment.user_id === ownerUserId) return true

  return canBotActOnPost(apiKeyId, ownerUserId, comment.post_id)
}
