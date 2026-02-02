'use client'

import { createClient } from '@/lib/supabase/client'
import PostCard from '@/components/PostCard'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TrendingUp, Clock, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Tables } from '@/types/database'

interface PostWithUser extends Tables<'posts'> {
  users: { name: string | null; username: string | null; email: string } | null
  comments: { count: number }[]
}

const heroMessages = [
  {
    title: "El Prompt es el nuevo Push",
    subtitle: "Comparte configs, descubre workflows y deja de pelear con la sintaxis."
  },
  {
    title: "De Junior a Prompt Engineer en comunidad",
    subtitle: "Tu stack ya no es solo React. Es Claude + Cursor + ese prompt mágico que alguien más ya debuggeó."
  },
  {
    title: "Agents trabajando mientras dormís",
    subtitle: "Orquestá tu equipo de IA, compartí flujos autónomos y conectá con quienes ya no codean solos."
  },
  {
    title: "El conocimiento colectivo de la IA",
    subtitle: "¿Cómo hiciste que GPT entendiera tu base legacy? Compartí el template. Robá el de otros."
  },
  {
    title: "Codeá con IA, no contra ella",
    subtitle: "Vibe coding en español. Desde tus primeros prompts hasta repos que se escriben solos."
  },
  {
    title: "El futuro se shippea hoy",
    subtitle: "Galería de proyectos hechos 80% por agents. Mostrá lo tuyo, aprendé el stack nuevo."
  },
  {
    title: "Debugging cognitivo",
    subtitle: "Cuando la IA alucina, la comunidad corrige. Compartí tus fails épicos y sus fixes."
  },
  {
    title: "Syntaxis opcional, lógica obligatoria",
    subtitle: "Dejar de tipear no significa dejar de pensar. Discutí arquitectura mientras el boilerplate se genera solo."
  },
  {
    title: "Tu stack extendido (humano + silicona)",
    subtitle: "Conectá con devs que hablan español y orquestan IA como si nada. Bienvenido al nuevo toolchain."
  },
  {
    title: "La última comunidad antes de que lo codee todo una IA",
    subtitle: "Mientras tanto, compartimos prompts, evaluamos models y decidimos qué partes mantener humanas."
  }
]

export default function Home() {
  const router = useRouter()
  const [posts, setPosts] = useState<PostWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  useEffect(() => {
    const fetchPosts = async () => {
      const supabase = createClient()
      
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          users:user_id (name, username, email),
          comments:comments (count)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
      
      setPosts(postsData || [])
      setLoading(false)
    }
    
    fetchPosts()
  }, [])

  // Hero carousel rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % heroMessages.length)
        setIsTransitioning(false)
      }, 500) // Wait for fade out
    }, 6000) // Change every 6 seconds

    return () => clearInterval(interval)
  }, [])
  
  const handleDelete = () => {
    router.refresh()
  }

  const postsWithCount = posts.map(post => ({
    ...post,
    comments_count: post.comments?.[0]?.count || 0
  }))

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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sort tabs */}
        <div className="flex items-center gap-2 mb-6">
          <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground font-medium text-sm">
            <TrendingUp className="h-4 w-4" />
            <span>Populares</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground font-medium text-sm hover:bg-muted/80 transition-colors">
            <Clock className="h-4 w-4" />
            <span>Recientes</span>
          </button>
        </div>

        {/* Posts feed */}
        <div className="space-y-4">
          {!loading && postsWithCount.length > 0 ? (
            postsWithCount.map((post) => (
              <PostCard key={post.id} post={post} onDelete={handleDelete} />
            ))
          ) : (
            <div className="text-center py-16 bg-card rounded-xl border border-border border-dashed">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-lg mb-4">No hay posts aún</p>
              <Link
                href="/submit"
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
