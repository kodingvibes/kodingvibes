'use client'

import { createClient } from '@/lib/supabase/client'
import PostCard from '@/components/PostCard'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { TrendingUp, Clock, Sparkles, Hash, ChevronDown, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Tables } from '@/types/database'

interface PostWithUser extends Tables<'posts'> {
  users: { name: string | null; username: string | null; email: string } | null
  comments: { count: number }[]
  groups?: { name: string; slug: string; color: string } | null
}

type Group = Tables<'groups'>

interface HeroPost extends PostWithUser {
  groups: { name: string; slug: string; color: string } | null
}

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const groupFilter = searchParams.get('group')
  
  const [posts, setPosts] = useState<PostWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [sortBy, setSortBy] = useState<'popular' | 'recent'>('recent')

  // Groups state
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [showGroupDropdown, setShowGroupDropdown] = useState(false)

  // Hero popular posts state
  const [heroPopularPosts, setHeroPopularPosts] = useState<HeroPost[]>([])
  const [heroLoading, setHeroLoading] = useState(true)

  // User posts state
  const [userHasPosts, setUserHasPosts] = useState(false)

  const supabase = createClient()
  
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      // Check if user has any posts
      if (user) {
        const { data: userPosts } = await supabase
          .from('posts')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .limit(1)

        setUserHasPosts(!!(userPosts && userPosts.length > 0))
      }

      // Fetch groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .eq('is_active', true)
        .order('post_count', { ascending: false })

      if (groupsError) {
        console.error('Error fetching groups:', groupsError)
      }

      if (groupsData) {
        setGroups(groupsData)
        
        // Set selected group from URL or default to Comunidad
        if (groupFilter) {
          const group = groupsData.find(g => g.slug === groupFilter)
          if (group) setSelectedGroup(group)
        } else {
          const comunidadGroup = groupsData.find(g => g.slug === 'comunidad')
          if (comunidadGroup) setSelectedGroup(comunidadGroup)
        }
      }

      // Build posts query
      let postsQuery = supabase
        .from('posts')
        .select(`
          *,
          users:user_id (name, username, email),
          comments:comments (count)
        `)
        .eq('is_deleted', false)
        .gte('vote_count', 0)

      // Filter by group if specified, otherwise default to comunidad
      if (groupFilter) {
        const group = groupsData?.find(g => g.slug === groupFilter)
        if (group) {
          postsQuery = postsQuery.eq('group_id', group.id)
        }
      } else {
        // Default: show only posts from comunidad group
        const comunidadGroup = groupsData?.find(g => g.slug === 'comunidad')
        if (comunidadGroup) {
          postsQuery = postsQuery.eq('group_id', comunidadGroup.id)
        }
      }

      const { data: postsData, error: postsError } = await postsQuery.order('vote_count', { ascending: false })
      
      if (postsError) {
        console.error('Error fetching posts:', postsError)
      }

      setPosts(postsData || [])
      setLoading(false)
    }
    
    fetchData()
  }, [groupFilter])

  // Fetch popular posts for hero carousel
  useEffect(() => {
    const fetchHeroPopularPosts = async () => {
      // Fetch top 5 most voted posts from all public groups
      const { data: popularPosts, error } = await supabase
        .from('posts')
        .select(`
          *,
          users:user_id (name, username, email),
          groups:group_id (name, slug, color),
          comments:comments (count)
        `)
        .eq('is_deleted', false)
        .gte('vote_count', 1)
        .order('vote_count', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Error fetching hero popular posts:', error)
      } else if (popularPosts && popularPosts.length > 0) {
        setHeroPopularPosts(popularPosts as HeroPost[])
      }

      setHeroLoading(false)
    }

    fetchHeroPopularPosts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Hero carousel rotation
  useEffect(() => {
    if (heroPopularPosts.length === 0) return

    const interval = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % heroPopularPosts.length)
        setIsTransitioning(false)
      }, 500)
    }, 6000)

    return () => clearInterval(interval)
  }, [heroPopularPosts.length])
  
  const handleDelete = () => {
    router.refresh()
  }

  const handleGroupSelect = (group: Group | null) => {
    setSelectedGroup(group)
    setShowGroupDropdown(false)
    
    if (group) {
      router.push(`/?group=${group.slug}`)
    } else {
      router.push('/')
    }
  }

  const postsWithCount = posts.map(post => ({
    ...post,
    comments_count: post.comments?.[0]?.count || 0
  }))

  const sortedPosts = [...postsWithCount].sort((a, b) => {
    if (sortBy === 'popular') {
      return b.vote_count - a.vote_count
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const currentHeroPost = heroPopularPosts[currentMessageIndex]

  // Helper function to format date
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

  // Helper function to truncate content
  const truncateContent = (content: string | null, maxLength: number = 150) => {
    if (!content) return ''
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength).trim() + '...'
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section - Popular Posts Carousel */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white overflow-hidden">
        {/* Background image with overlay */}
        {currentHeroPost?.image_url && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center transition-all duration-500"
              style={{
                backgroundImage: `url(${currentHeroPost.image_url})`,
                opacity: isTransitioning ? 0 : 1
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 via-purple-900/85 to-pink-900/90 backdrop-blur-sm" />
          </>
        )}

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          {heroLoading || heroPopularPosts.length === 0 ? (
            <div className="text-center min-h-[280px] sm:min-h-[320px] flex flex-col justify-center">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight leading-tight">
                Posts más populares
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-white/90 max-w-3xl mx-auto mb-8 leading-relaxed">
                {heroLoading ? 'Cargando posts populares...' : 'No hay posts populares aún. ¡Sé el primero en compartir!'}
              </p>
              {!userHasPosts && (
                <Link
                  href="/submit"
                  className="inline-flex items-center gap-2 bg-white text-indigo-600 px-8 py-3 rounded-full font-semibold hover:bg-white/90 transition-colors shadow-lg mx-auto"
                >
                  <Sparkles className="h-5 w-5" />
                  Crear tu primer post
                </Link>
              )}
            </div>
          ) : (
            <div className="text-center min-h-[280px] sm:min-h-[320px] flex flex-col justify-center">
              <div
                className={`transition-all duration-500 ease-in-out transform ${
                  isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
                }`}
              >
                {currentHeroPost && (
                  <Link href={`/post/${currentHeroPost.id}`} className="block">
                    {/* Group badge */}
                    {currentHeroPost.groups && (
                      <div className="flex justify-center mb-3">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium text-white/95"
                          style={{ backgroundColor: currentHeroPost.groups.color || '#6366f1' }}
                        >
                          <Hash className="h-4 w-4" />
                          {currentHeroPost.groups.name}
                        </span>
                      </div>
                    )}

                    {/* Post title */}
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight leading-tight hover:text-white/90 transition-colors">
                      {currentHeroPost.title}
                    </h1>

                    {/* Post preview */}
                    {currentHeroPost.content && (
                      <p className="text-base sm:text-lg lg:text-xl text-white/90 max-w-3xl mx-auto mb-4 leading-relaxed">
                        {truncateContent(currentHeroPost.content, 150)}
                      </p>
                    )}

                    {/* Post metadata */}
                    <div className="flex items-center justify-center gap-4 text-sm text-white/80 mb-6">
                      <span className="flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4" />
                        {currentHeroPost.vote_count} votos
                      </span>
                      <span>•</span>
                      <span>
                        @{currentHeroPost.users?.username || currentHeroPost.users?.name || 'anónimo'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDate(currentHeroPost.created_at)}
                      </span>
                    </div>
                  </Link>
                )}
              </div>

              {/* Progress indicators */}
              <div className="flex justify-center gap-2 mb-6">
                {heroPopularPosts.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setIsTransitioning(true)
                      setTimeout(() => {
                        setCurrentMessageIndex(index)
                        setIsTransitioning(false)
                      }, 300)
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === currentMessageIndex
                        ? 'w-8 bg-white'
                        : 'w-1.5 bg-white/40 hover:bg-white/60'
                    }`}
                    aria-label={`Ver post ${index + 1}`}
                  />
                ))}
              </div>

              {!userHasPosts && (
                <Link
                  href="/submit"
                  className="inline-flex items-center gap-2 bg-white text-indigo-600 px-8 py-3 rounded-full font-semibold hover:bg-white/90 transition-colors shadow-lg mx-auto"
                >
                  <Sparkles className="h-5 w-5" />
                  Crear tu primer post
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 sm:pb-8">
        {/* Channel Selector & Sort tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          {/* Group Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowGroupDropdown(!showGroupDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full font-medium text-sm hover:bg-muted/80 transition-colors"
            >
              <Hash className="h-4 w-4" />
              <span>{selectedGroup?.name || 'Todos los canales'}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {showGroupDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowGroupDropdown(false)}
                />
                <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-lg z-50 py-2 max-h-80 overflow-y-auto">
                  <button
                    onClick={() => handleGroupSelect(null)}
                    className={`w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2 ${
                      !selectedGroup ? 'bg-primary/10 text-primary' : ''
                    }`}
                  >
                    <Hash className="h-4 w-4" />
                    <span>Todos los canales</span>
                  </button>
                  
                  <div className="border-t border-border my-2" />
                  
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => handleGroupSelect(group)}
                      className={`w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-3 ${
                        selectedGroup?.id === group.id ? 'bg-primary/10 text-primary' : ''
                      }`}
                    >
                      <div 
                        className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: group.color || '#6366f1' }}
                      >
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.post_count} posts
                        </p>
                      </div>
                    </button>
                  ))}
                  
                  <div className="border-t border-border my-2" />
                  
                  <Link
                    href="/groups"
                    onClick={() => setShowGroupDropdown(false)}
                    className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2 text-primary"
                  >
                    <Users className="h-4 w-4" />
                    <span>Ver todos los canales</span>
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Sort tabs */}
          <div className="flex items-center gap-2 sm:ml-auto">
            <button 
              onClick={() => setSortBy('popular')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                sortBy === 'popular' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Populares</span>
            </button>
            <button 
              onClick={() => setSortBy('recent')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                sortBy === 'recent' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Recientes</span>
            </button>
          </div>
        </div>

        {/* Posts feed */}
        <div className="space-y-4">
          {!loading && sortedPosts.length > 0 ? (
            sortedPosts.map((post) => (
              <PostCard key={post.id} post={post} onDelete={handleDelete} />
            ))
          ) : (
            <div className="text-center py-16 bg-card rounded-xl border border-border border-dashed">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-lg mb-2">
                {selectedGroup 
                  ? `No hay posts en ${selectedGroup.name} aún` 
                  : 'No hay posts aún'}
              </p>
              <Link
                href={selectedGroup ? `/submit?group=${selectedGroup.id}` : '/submit'}
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
              >
                Sé el primero en publicar
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
