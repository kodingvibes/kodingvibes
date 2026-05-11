import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import VoteButtons from '@/components/VoteButtons'
import CommentSection from '@/components/CommentSection'
import MarkdownContent from '@/components/MarkdownContent'
import PostActionsClient from '@/components/PostActionsClient'
import { ArrowLeft, Clock, Edit3, Bot } from 'lucide-react'
import type { Metadata } from 'next'
import { getPublicProfileHref } from '@/lib/profile'

interface PostPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { id } = await params
  
  try {
    // Fetch post data for metadata
    const supabase = await createClient()
    const { data: post } = await supabase
      .from('posts')
      .select('title, content, image_url, created_at, edited_at, tags, users:user_id (name, username, avatar_url)')
      .eq('id', id)
      .eq('is_deleted', false)
      .single()
    
    if (!post) {
      return {
        title: 'Post no encontrado | KodingVibes',
        description: 'El post que buscas no existe o ha sido eliminado.',
      }
    }
    
    // Extract description from content (first 160 chars)
    const description = post.content 
      ? post.content.replace(/[#*_`\[\]()]/g, '').substring(0, 160) + '...'
      : 'Lee este post en KodingVibes, la comunidad de desarrolladores en español.'
    
    // Build keywords from tags if available
    const keywords = post.tags 
      ? ['desarrollo', 'programación', 'comunidad', ...post.tags]
      : ['desarrollo', 'programación', 'comunidad', 'IA', 'código']
    
    // Get author name
    const authorName = post.users?.name || post.users?.username || 'KodingVibes'
    
    // Construct OG image URL with version parameter for cache busting
    // v=3 = versión con imagen del post como background + overlay ajustado
    const ogImageUrl = `https://www.kodingvibes.com/api/og?id=${encodeURIComponent(id)}${post.image_url ? `&image=${encodeURIComponent(post.image_url)}` : ''}&v=4`
    
    return {
      title: `${post.title} | KodingVibes`,
      description,
      keywords,
      authors: [{ name: authorName }],
      openGraph: {
        title: post.title,
        description,
        type: 'article',
        url: `https://www.kodingvibes.com/post/${id}`,
        siteName: 'KodingVibes',
        locale: 'es_ES',
        publishedTime: post.created_at,
        modifiedTime: post.edited_at || post.created_at,
        authors: [authorName],
        images: [{
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        }],
      },
      twitter: {
        card: 'summary_large_image',
        title: post.title,
        description,
        images: [ogImageUrl],
        creator: '@kodingvibes',
      },
      alternates: {
        canonical: `https://www.kodingvibes.com/post/${id}`,
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    // Fallback metadata
    return {
      title: 'KodingVibes',
      description: 'Comunidad de desarrolladores',
    }
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: post } = await supabase
    .from('posts')
    .select(`
      *,
      users:user_id (name, username, email, avatar_url)
    `)
    .eq('id', id)
    .eq('is_deleted', false)
    .single()

  if (!post) {
    notFound()
  }

  // Cargar tags del grupo si existe
  let groupTags: Array<{ id: string; name: string; color: string }> = []
  if (post.group_id) {
    const { data: tagsData } = await supabase
      .from('group_tags')
      .select('*')
      .eq('group_id', post.group_id)
    
    if (tagsData) {
      groupTags = tagsData
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`
    if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`
    return 'hace unos minutos'
  }

  const displayAuthor =
    post.is_bot_post && post.bot_name?.trim()
      ? post.bot_name.trim()
      : `@${post.users?.username || post.users?.name || post.users?.email?.split('@')[0] || 'anónimo'}`

  const displayAvatarInitial =
    (post.is_bot_post && post.bot_name?.trim()
      ? post.bot_name.trim()
      : post.users?.username || post.users?.name || post.users?.email || 'A')
      .charAt(0)
      .toUpperCase()

  const displayAvatarUrl = post.users?.avatar_url || null
  const profileHref = getPublicProfileHref(post.users?.username, post.user_id)

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32 sm:pb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al inicio</span>
        </Link>

        <article className="bg-card border border-border rounded-xl overflow-hidden relative">
                {/* Desktop: Vote section lateral */}
          <div className="hidden sm:flex">
            <div className="bg-muted/30 p-4 flex items-start">
              <VoteButtons postId={post.id} initialVotes={post.vote_count} />
            </div>

            {/* Content section */}
            <div className="flex-1 p-6">
              {post.video_url && (
                <div className="mb-6 overflow-hidden rounded-xl">
                  <iframe
                    src={`https://www.youtube.com/embed/${post.video_url.split('v=')[1] || post.video_url.split('/').pop()}`}
                    className="w-full aspect-video rounded-xl"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {post.image_url && (
                <div className="mb-6 overflow-hidden rounded-xl">
                  <Image
                    src={post.image_url}
                    alt={post.title}
                    width={900}
                    height={600}
                    className="w-full max-h-[600px] object-cover"
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-3">
                  <Link href={profileHref} className="inline-flex items-center gap-3 rounded-md hover:opacity-90 transition-opacity">
                    {displayAvatarUrl ? (
                      <Image
                        src={displayAvatarUrl}
                        alt=""
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                        {displayAvatarInitial}
                      </div>
                    )}
                    <p className="font-medium text-foreground">
                      {displayAuthor}
                    </p>
                  </Link>
                  <div>
                    {post.is_bot_post && (
                      <p className="inline-flex items-center gap-1 text-xs mt-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5">
                        <Bot className="h-3 w-3" />
                        bot
                      </p>
                    )}
                    <p className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(post.created_at)}
                      {post.edited_at && (
                        <span className="flex items-center gap-1 ml-2 text-xs">
                          <Edit3 className="h-3 w-3" />
                          (editado)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                
                {/* Post Actions */}
                <PostActionsClient 
                  postId={post.id}
                  userId={post.user_id}
                  createdAt={post.created_at}
                  isDeleted={post.is_deleted}
                  status={post.status as 'draft' | 'published'}
                  title={post.title}
                  imageUrl={post.image_url}
                />
              </div>

              {/* Tags sobre el título */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {post.tags.map((tagValue) => {
                    // Buscar el tag en los tags del grupo
                    const groupTag = groupTags.find(gt => 
                      gt.name.toLowerCase().replace(/\s+/g, '-') === tagValue
                    )
                    
                    return (
                      <span
                        key={tagValue}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: groupTag?.color || '#6b7280' }}
                      >
                        {groupTag?.name || tagValue}
                      </span>
                    )
                  })}
                </div>
              )}

              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                {post.title}
              </h1>
              
              {post.content && (
                <div className="mb-6">
                  <MarkdownContent content={post.content} />
                </div>
              )}
            </div>
          </div>

                {/* Mobile: Vote section floating */}
          <div className="sm:hidden">
            {/* Floating vote buttons - positioned left to avoid overlap with create button */}
            <div className="fixed bottom-6 left-6 z-50 flex flex-col items-center gap-1 bg-card border border-border rounded-xl shadow-2xl p-2">
              <VoteButtons postId={post.id} initialVotes={post.vote_count} />
            </div>

            {/* Content section */}
            <div className="p-4">
              {post.video_url && (
                <div className="mb-6 overflow-hidden rounded-xl">
                  <iframe
                    src={`https://www.youtube.com/embed/${post.video_url.split('v=')[1] || post.video_url.split('/').pop()}`}
                    className="w-full aspect-video rounded-xl"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {post.image_url && (
                <div className="mb-6 overflow-hidden rounded-xl">
                  <Image
                    src={post.image_url}
                    alt={post.title}
                    width={900}
                    height={600}
                    className="w-full max-h-[600px] object-cover"
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-3">
                  <Link href={profileHref} className="inline-flex items-center gap-3 rounded-md hover:opacity-90 transition-opacity">
                    {displayAvatarUrl ? (
                      <Image
                        src={displayAvatarUrl}
                        alt=""
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                        {displayAvatarInitial}
                      </div>
                    )}
                    <p className="font-medium text-foreground">
                      {displayAuthor}
                    </p>
                  </Link>
                  <div>
                    {post.is_bot_post && (
                      <p className="inline-flex items-center gap-1 text-xs mt-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5">
                        <Bot className="h-3 w-3" />
                        bot
                      </p>
                    )}
                    <p className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(post.created_at)}
                      {post.edited_at && (
                        <span className="flex items-center gap-1 ml-2 text-xs">
                          <Edit3 className="h-3 w-3" />
                          (editado)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                
                {/* Post Actions */}
                <PostActionsClient 
                  postId={post.id}
                  userId={post.user_id}
                  createdAt={post.created_at}
                  isDeleted={post.is_deleted}
                  status={post.status as 'draft' | 'published'}
                  title={post.title}
                  imageUrl={post.image_url}
                />
              </div>

              {/* Tags sobre el título */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {post.tags.map((tagValue) => {
                    // Buscar el tag en los tags del grupo
                    const groupTag = groupTags.find(gt => 
                      gt.name.toLowerCase().replace(/\s+/g, '-') === tagValue
                    )
                    
                    return (
                      <span
                        key={tagValue}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: groupTag?.color || '#6b7280' }}
                      >
                        {groupTag?.name || tagValue}
                      </span>
                    )
                  })}
                </div>
              )}

              <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
                {post.title}
              </h1>
              
              {post.content && (
                <div className="mb-6">
                  <MarkdownContent content={post.content} />
                </div>
              )}
            </div>
          </div>
        </article>

        {/* Comments section */}
        <div className="mt-6">
          <CommentSection postId={post.id} />
        </div>
      </div>
    </main>
  )
}
