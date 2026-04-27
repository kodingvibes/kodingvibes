export function getPublicProfileIdentifier(
  username?: string | null,
  userId?: string | null
): string | null {
  const normalizedUsername = typeof username === 'string' ? username.trim() : ''
  if (normalizedUsername) return normalizedUsername

  const normalizedUserId = typeof userId === 'string' ? userId.trim() : ''
  if (normalizedUserId) return normalizedUserId

  return null
}

export function getPublicProfileHref(
  username?: string | null,
  userId?: string | null
): string {
  const identifier = getPublicProfileIdentifier(username, userId)
  if (!identifier) return '/profile'

  return `/profile/${encodeURIComponent(identifier)}`
}
