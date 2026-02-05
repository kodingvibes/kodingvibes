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
}

type Group = Tables<'groups'>

const heroMessages = [
  {
    title: "El Prompt es el nuevo Push",
    subtitle: "Comparte configuraciones, descubre workflows y deja de pelear con la sintaxis."
  },
  {
    title: "De Junior a Prompt Engineer en comunidad",
    subtitle: "Tu stack ya no es solo React. Es Claude + Cursor + ese prompt mágico que alguien más ya debuggeó."
  },
  {
    title: "Agents trabajando mientras duermes",
    subtitle: "Orquesta tu equipo de IA, comparte flujos autónomos y conecta con quienes ya no programan solos."
  },
  {
    title: "El conocimiento colectivo de la IA",
    subtitle: "¿Cómo hiciste que GPT entendiera tu base legacy? Comparte el template. Toma el de otros."
  },
  {
    title: "Codea con IA, no contra ella",
    subtitle: "Vibe coding en español. Desde tus primeros prompts hasta repos que se escriben solos."
  },
  {
    title: "El futuro se lanza hoy",
    subtitle: "Galería de proyectos hechos 80% por agents. Muestra lo tuyo, aprende el stack nuevo."
  },
  {
    title: "Debugging cognitivo",
    subtitle: "Cuando la IA alucina, la comunidad corrige. Comparte tus fails épicos y sus fixes."
  },
  {
    title: "Sintaxis opcional, lógica obligatoria",
    subtitle: "Dejar de tipear no significa dejar de pensar. Discute arquitectura mientras el boilerplate se genera solo."
  },
  {
    title: "Tu stack extendido (humano + silicona)",
    subtitle: "Conecta con devs que hablan español y orquestan IA como si nada. Bienvenido al nuevo toolchain."
  },
  {
    title: "La última comunidad antes de que lo programe todo una IA",
    subtitle: "Mientras tanto, compartimos prompts, evaluamos models y decidimos qué partes mantener humanas."
  }
]

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
  
  const supabase = createClient()
  
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
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

        // Set selected group from URL, default to null (all channels)
        if (groupFilter) {
          const group = groupsData.find(g => g.slug === groupFilter)
          if (group) setSelectedGroup(group)
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

      // Filter by group if specified, otherwise show all channels
      if (groupFilter) {
        const group = groupsData?.find(g => g.slug === groupFilter)
        if (group) {
          postsQuery = postsQuery.eq('group_id', group.id)
        }
      }
      // If no group filter, show posts from all channels (no filter applied)

      const { data: postsData, error: postsError } = await postsQuery.order('vote_count', { ascending: false })
      
      if (postsError) {
        console.error('Error fetching posts:', postsError)
      }

      setPosts(postsData || [])
      setLoading(false)
    }
    
    fetchData()
  }, [groupFilter])

  // Hero carousel rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % heroMessages.length)
        setIsTransitioning(false)
      }, 500)
    }, 6000)

    return () => clearInterval(interval)
  }, [])
  
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

  const currentMessage = heroMessages[currentMessageIndex]

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="text-center min-h-[280px] sm:min-h-[320px] flex flex-col justify-center">
            <div 
              className={`transition-all duration-500 ease-in-out transform ${
                isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
              }`}
            >
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight leading-tight">
                {currentMessage.title}
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-white/90 max-w-3xl mx-auto mb-8 leading-relaxed">
                {currentMessage.subtitle}
              </p>
            </div>
            
            {/* Progress indicators */}
            <div className="flex justify-center gap-2 mb-6">
              {heroMessages.map((_, index) => (
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
                  aria-label={`Ver mensaje ${index + 1}`}
                />
              ))}
            </div>
            
            <Link
              href="/submit"
              className="inline-flex items-center gap-2 bg-white text-indigo-600 px-8 py-3 rounded-full font-semibold hover:bg-white/90 transition-colors shadow-lg mx-auto"
            >
              <Sparkles className="h-5 w-5" />
              Crear tu primer post
            </Link>
          </div>
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
