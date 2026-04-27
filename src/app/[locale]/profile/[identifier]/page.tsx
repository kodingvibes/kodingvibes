import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Calendar, FileText, MessageSquare, User as UserIcon } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PublicProfilePageProps {
  params: Promise<{
    identifier: string
  }>
}

type PublicProfile = {
  id: string
  username: string | null
  name: string | null
  avatar_url: string | null
  banner_url: string | null
  created_at: string
}

type RecentPost = {
  id: string
  title: string
  created_at: string
  vote_count: number
  groups: { name: string; slug: string } | null
}

type RecentComment = {
  id: string
  post_id: string
  content: string
  created_at: string
  posts: { id: string; title: string } | null
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const formatRelativeDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)

  if (days > 0) return `hace ${days} dia${days > 1 ? 's' : ''}`
  if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`
  return 'hace unos minutos'
}

const formatMemberSince = (dateString: string) => {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString))
}

const getDisplayName = (profile: PublicProfile) => {
  if (profile.username) return `@${profile.username}`
  if (profile.name) return profile.name
  return 'usuario'
}

const getInitial = (profile: PublicProfile) => {
  return (profile.username || profile.name || 'U').charAt(0).toUpperCase()
}

const stripMarkdown = (value: string) =>
  value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[>#*_~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const truncate = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength).trim()}...`
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { identifier } = await params
  const cleanedIdentifier = (identifier || '').trim()
  const normalizedIdentifier = cleanedIdentifier.toLowerCase()

  if (!cleanedIdentifier) {
    notFound()
  }

  const supabase = await createClient()

  let profile: PublicProfile | null = null

  const { data: byUsername } = await supabase
    .from('users')
    .select('id, username, name, avatar_url, banner_url, created_at')
    .eq('username', normalizedIdentifier)
    .maybeSingle()

  if (byUsername) {
    profile = byUsername as PublicProfile
  } else if (UUID_REGEX.test(cleanedIdentifier)) {
    const { data: byId } = await supabase
      .from('users')
      .select('id, username, name, avatar_url, banner_url, created_at')
      .eq('id', cleanedIdentifier)
      .maybeSingle()

    profile = (byId as PublicProfile | null) || null
  }

  if (!profile) {
    notFound()
  }

  const [
    { count: postCount },
    { count: commentCount },
    { data: recentPostsData },
    { data: recentCommentsData },
    { data: authData },
  ] = await Promise.all([
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('is_deleted', false)
      .eq('status', 'published'),
    supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('is_deleted', false),
    supabase
      .from('posts')
      .select('id, title, created_at, vote_count, groups:group_id (name, slug)')
      .eq('user_id', profile.id)
      .eq('is_deleted', false)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('comments')
      .select('id, post_id, content, created_at, posts:post_id (id, title)')
      .eq('user_id', profile.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.auth.getUser(),
  ])

  const recentPosts = (recentPostsData || []) as RecentPost[]
  const recentComments = (recentCommentsData || []) as RecentComment[]
  const isOwnProfile = authData.user?.id === profile.id

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver al inicio</span>
          </Link>

          {isOwnProfile && (
            <Link
              href="/profile"
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Editar mi perfil
            </Link>
          )}
        </div>

        <section className="bg-card border border-border rounded-2xl overflow-hidden mb-6 isolate">
          <div className="relative h-40 sm:h-48 z-0">
            {profile.banner_url ? (
              <Image
                src={profile.banner_url}
                alt="Banner del perfil"
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>

          <div className="relative z-10 px-5 sm:px-6 pb-6">
            <div className="-mt-12 flex flex-col sm:flex-row sm:items-end gap-4 mb-5">
              <div className="w-24 h-24 rounded-full ring-4 ring-card bg-muted overflow-hidden flex items-center justify-center">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt="Avatar"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-2xl font-semibold">
                    {getInitial(profile)}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-foreground truncate">{getDisplayName(profile)}</h1>
                {profile.name && profile.username && (
                  <p className="text-sm text-muted-foreground truncate">{profile.name}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Miembro desde {formatMemberSince(profile.created_at)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground mb-1 inline-flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  Posts publicados
                </p>
                <p className="text-xl font-semibold text-foreground">{postCount || 0}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground mb-1 inline-flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Comentarios
                </p>
                <p className="text-xl font-semibold text-foreground">{commentCount || 0}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4">Posts recientes</h2>
            {recentPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aun no hay posts publicados.</p>
            ) : (
              <div className="space-y-3">
                {recentPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/post/${post.id}`}
                    className="block rounded-lg border border-border px-3 py-2 hover:bg-muted transition-colors"
                  >
                    <p className="font-medium text-sm text-foreground line-clamp-2">{post.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatRelativeDate(post.created_at)}
                      {post.groups?.slug ? ` • /${post.groups.slug}` : ''}
                      {typeof post.vote_count === 'number' ? ` • ${post.vote_count} votos` : ''}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4">Comentarios recientes</h2>
            {recentComments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aun no hay comentarios.</p>
            ) : (
              <div className="space-y-3">
                {recentComments.map((comment) => (
                  <Link
                    key={comment.id}
                    href={`/post/${comment.post_id}?comment=${comment.id}`}
                    className="block rounded-lg border border-border px-3 py-2 hover:bg-muted transition-colors"
                  >
                    <p className="text-sm text-foreground line-clamp-2">
                      {truncate(stripMarkdown(comment.content || ''), 120) || 'Sin contenido'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatRelativeDate(comment.created_at)}
                      {comment.posts?.title ? ` • ${truncate(comment.posts.title, 70)}` : ''}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="mt-6 text-xs text-muted-foreground inline-flex items-center gap-1">
          <UserIcon className="h-3.5 w-3.5" />
          Esta pagina es solo de lectura.
        </div>
      </div>
    </main>
  )
}
