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

export default function Home() {
  const router = useRouter()
  const [posts, setPosts] = useState<PostWithUser[]>([])
  const [loading, setLoading] = useState(true)
  
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
  
  const handleDelete = () => {
    router.refresh()
  }

  const postsWithCount = posts.map(post => ({
    ...post,
    comments_count: post.comments?.[0]?.count || 0
  }))

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              Comparte tu <span className="text-yellow-300">conocimiento</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto mb-8">
              Únete a la comunidad de desarrolladores. Comparte código, aprende y conecta con otros programadores.
            </p>
            <Link
              href="/submit"
              className="inline-flex items-center gap-2 bg-white text-indigo-600 px-8 py-3 rounded-full font-semibold hover:bg-white/90 transition-colors shadow-lg"
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
