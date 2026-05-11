const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/

const isValidYouTubeId = (value: string): boolean => YOUTUBE_ID_REGEX.test(value)

export const extractYouTubeVideoId = (value: string): string | null => {
  const input = value.trim()
  if (!input) return null

  if (isValidYouTubeId(input)) {
    return input
  }

  try {
    const url = new URL(input.startsWith('http') ? input : `https://${input}`)
    const host = url.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0] || ''
      return isValidYouTubeId(id) ? id : null
    }

    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const queryId = url.searchParams.get('v') || ''
      if (isValidYouTubeId(queryId)) {
        return queryId
      }

      const segments = url.pathname.split('/').filter(Boolean)
      const markerIndex = segments.findIndex((segment) =>
        ['embed', 'shorts', 'live', 'v'].includes(segment)
      )

      if (markerIndex >= 0) {
        const id = segments[markerIndex + 1] || ''
        return isValidYouTubeId(id) ? id : null
      }

      if (segments[0] && isValidYouTubeId(segments[0])) {
        return segments[0]
      }
    }
  } catch {
    // Fallback below
  }

  const fallbackMatch = input.match(/(?:v=|\/)([A-Za-z0-9_-]{11})(?:[?&/]|$)/)
  return fallbackMatch ? fallbackMatch[1] : null
}

export const normalizeYouTubeUrl = (value: string): string | null => {
  const id = extractYouTubeVideoId(value)
  return id ? `https://www.youtube.com/watch?v=${id}` : null
}

export const getYouTubeThumbnailUrl = (value: string): string | null => {
  const id = extractYouTubeVideoId(value)
  return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null
}

export const getYouTubeEmbedUrl = (value: string): string | null => {
  const id = extractYouTubeVideoId(value)
  return id ? `https://www.youtube.com/embed/${id}` : null
}

export const getYouTubeEmbedUrlFromThumbnail = (value: string): string | null => {
  const input = value.trim()
  if (!input) return null

  const match = input.match(/(?:img\.youtube\.com|i\.ytimg\.com)\/vi(?:_webp)?\/([A-Za-z0-9_-]{11})\//)
  if (!match) return null

  return `https://www.youtube.com/embed/${match[1]}`
}
