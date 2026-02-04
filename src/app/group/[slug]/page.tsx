'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { 
  Users, Lock, Globe, Plus, ArrowLeft, Hash,
  TrendingUp, Clock, Settings, UserPlus, LogOut,
  Shield, Crown, Home
} from 'lucide-react'
import PostCard from '@/components/PostCard'
import type { Tables } from '@/types/database'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface User extends SupabaseUser {
  is_admin?: boolean
}

type Group = Tables<'groups'>
type Post = Tables<'posts'> & {
  users: { name: string | null; username: string | null; email: string } | null
  comments: { count: number }[]
}
type GroupMember = Tables<'group_members'> & {
  users: { name: string | null; username: string | null; email: string } | null
}

interface PostWithCount extends Post {
  comments_count: number
}

export default function GroupPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  
  const [group, setGroup] = useState<Group | null>(null)
  const [posts, setPosts] = useState<PostWithCount[]>([])
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'popular' | 'recent'>('recent')
  const [activeTab, setActiveTab] = useState<'posts' | 'members'>('posts')
  const supabase = createClient()

  useEffect(() => {
    const fetchGroupData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)

      // Fetch group
      const { data: groupData } = await supabase
        .from('groups')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

      if (!groupData) {
        router.push('/groups')
        return
      }

      setGroup(groupData)

      // Check membership
      let membershipData = null
      if (currentUser) {
        const { data: membership } = await supabase
          .from('group_members')
          .select('*')
          .eq('group_id', groupData.id)
          .eq('user_id', currentUser.id)
          .single()

        if (membership) {
          membershipData = membership
          setIsMember(true)
          setUserRole(membership.role)
        }
      }

      // Fetch members
      const { data: membersData } = await supabase
        .from('group_members')
        .select('*, users(name, username, email)')
        .eq('group_id', groupData.id)
        .order('joined_at', { ascending: false })

      setMembers(membersData || [])

      // Fetch posts if user is member or group is public
      if (groupData.is_public || membershipData) {
        const { data: postsData } = await supabase
          .from('posts')
          .select(`
            *,
            users:user_id (name, username, email),
            comments:comments (count)
          `)
          .eq('group_id', groupData.id)
          .eq('is_deleted', false)
          .gte('vote_count', 0)

        const postsWithCount = (postsData || []).map(post => ({
          ...post,
          comments_count: post.comments?.[0]?.count || 0
        }))

        setPosts(postsWithCount)
      }

      setLoading(false)
    }

    fetchGroupData()
  }, [slug, router, supabase])

  const handleJoinGroup = async () => {
    if (!user) {
      alert('Debes iniciar sesión para unirte a un grupo')
      return
    }

    if (!group) return

    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id })

    if (error) {
      alert('Error al unirse al grupo: ' + error.message)
      return
    }

    setIsMember(true)
    setUserRole('member')
    
    // Refresh to show posts
    const { data: postsData } = await supabase
      .from('posts')
      .select(`
        *,
        users:user_id (name, username, email),
        comments:comments (count)
      `)
      .eq('group_id', group.id)
      .eq('is_deleted', false)

    const postsWithCount = (postsData || []).map(post => ({
      ...post,
      comments_count: post.comments?.[0]?.count || 0
    }))

    setPosts(postsWithCount)
  }

  const handleLeaveGroup = async () => {
    if (!user || !group) return

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', group.id)
      .eq('user_id', user.id)

    if (error) {
      alert('Error al salir del grupo: ' + error.message)
      return
    }

    setIsMember(false)
    setUserRole(null)
    setPosts([])
  }

  const sortedPosts = [...posts].sort((a, b) => {
    if (sortBy === 'popular') {
      return b.vote_count - a.vote_count
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-48 bg-muted rounded-xl animate-pulse mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    )
  }

  if (!group) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Canal no encontrado</h1>
          <Link href="/groups" className="text-primary hover:underline">
            Ver todos los canales
          </Link>
        </div>
      </main>
    )
  }

  const canViewContent = group.is_public || isMember
  const isAdmin = userRole === 'admin' || user?.is_admin
  const isModerator = userRole === 'moderator'

  return (
    <main className="min-h-screen bg-background">
      {/* Group Header */}
      <div 
        className="text-white"
        style={{ backgroundColor: group.color || '#6366f1' }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link 
            href="/groups" 
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a canales
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-4xl font-bold">
                {group.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-3xl font-bold">{group.name}</h1>
                  {group.is_default && (
                    <span className="inline-flex items-center gap-1 bg-yellow-400/30 text-yellow-100 px-2 py-1 rounded-full text-xs font-medium">
                      <Home className="h-3 w-3" />
                      Canal Principal
                    </span>
                  )}
                  {group.is_public ? (
                    <span className="inline-flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full text-xs font-medium">
                      <Globe className="h-3 w-3" />
                      Público
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full text-xs font-medium">
                      <Lock className="h-3 w-3" />
                      Privado
                    </span>
                  )}
                </div>
                <p className="text-white/80 text-sm mb-2">/{group.slug}</p>
                <div className="flex items-center gap-4 text-sm text-white/90">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {group.member_count} miembros
                  </span>
                  <span>•</span>
                  <span>{group.post_count} posts</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isMember ? (
                <>
                  {(isAdmin || isModerator) && (
                    <button className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full font-medium transition-colors">
                      <Settings className="h-4 w-4" />
                      Administrar
                    </button>
                  )}
                  {!group.is_default && (
                    <button
                      onClick={handleLeaveGroup}
                      className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full font-medium transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Salir
                    </button>
                  )}
                </>
              ) : !group.is_default ? (
                <button
                  onClick={handleJoinGroup}
                  className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 py-2 rounded-full font-semibold hover:bg-white/90 transition-colors"
                >
                  <UserPlus className="h-5 w-5" />
                  Unirse
                </button>
              ) : null}
            </div>
          </div>

          {group.description && (
            <p className="mt-4 text-white/90 max-w-3xl">{group.description}</p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 sm:pb-8">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'posts'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Hash className="h-4 w-4" />
            Posts
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4" />
            Miembros ({group.member_count})
          </button>
        </div>

        {activeTab === 'posts' && (
          <>
            {/* Sort tabs */}
            <div className="flex items-center justify-between gap-2 mb-6">
              <div className="flex items-center gap-2">
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

              {isMember && (
                <Link
                  href={`/submit?group=${group.id}`}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full font-medium hover:opacity-90 transition-opacity text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo post
                </Link>
              )}
            </div>

            {/* Posts feed */}
            {!canViewContent ? (
              <div className="text-center py-16 bg-card rounded-xl border border-border border-dashed">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Canal privado
                </h3>
                <p className="text-muted-foreground mb-4">
                  Únete a este canal para ver y publicar contenido
                </p>
                <button
                  onClick={handleJoinGroup}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium hover:opacity-90 transition-opacity"
                >
                  <UserPlus className="h-5 w-5" />
                  Unirse al canal
                </button>
              </div>
            ) : sortedPosts.length > 0 ? (
              <div className="space-y-4">
                {sortedPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-card rounded-xl border border-border border-dashed">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Hash className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-lg mb-4">No hay posts aún</p>
                {isMember && (
                  <Link
                    href={`/submit?group=${group.id}`}
                    className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Sé el primero en publicar
                  </Link>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'members' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => (
              <div 
                key={member.id} 
                className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    {member.users?.name?.charAt(0) || member.users?.email?.charAt(0) || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {member.users?.name || member.users?.email}
                  </p>
                  <div className="flex items-center gap-2">
                    {member.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 text-xs text-orange-500">
                        <Crown className="h-3 w-3" />
                        Admin
                      </span>
                    )}
                    {member.role === 'moderator' && (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-500">
                        <Shield className="h-3 w-3" />
                        Moderador
                      </span>
                    )}
                    {member.role === 'member' && (
                      <span className="text-xs text-muted-foreground">Miembro</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
