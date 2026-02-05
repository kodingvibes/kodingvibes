'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { 
  Users, Lock, Globe, Plus, ArrowLeft, Hash,
  TrendingUp, Clock, Settings, UserPlus, LogOut,
  Shield, Crown, Home, Search, ChevronLeft, ChevronRight,
  Calendar
} from 'lucide-react'
import PostCard from '@/components/PostCard'
import EventCard from '@/components/EventCard'
import EventForm from '@/components/EventForm'
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
type GroupMember = {
  id: string
  role: string
  joined_at: string
  user_id: string
  users: { username: string | null } | null
}

type Event = Tables<'events'>

interface PostWithCount extends Post {
  comments_count: number
}

interface EventWithAttendees extends Event {
  users?: { name: string | null; username: string | null } | null
  attendee_count?: number
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
  const [activeTab, setActiveTab] = useState<'posts' | 'members' | 'events'>('posts')
  const [memberSearch, setMemberSearch] = useState('')
  const [memberPage, setMemberPage] = useState(1)
  const [events, setEvents] = useState<EventWithAttendees[]>([])
  const [showEventForm, setShowEventForm] = useState(false)
  const [eventFilter, setEventFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const MEMBERS_PER_PAGE = 12
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

      // Fetch members (without join to avoid RLS recursion)
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('id, role, joined_at, user_id')
        .eq('group_id', groupData.id)
        .order('joined_at', { ascending: false })

      if (membersError) {
        console.error('Error fetching members:', membersError)
      }

      // Fetch usernames separately if we have members
      let membersWithUsers: GroupMember[] = []
      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(m => m.user_id)
        
        const { data: usersData } = await supabase
          .from('users')
          .select('id, username')
          .in('id', userIds)

        const usersMap = new Map(usersData?.map(u => [u.id, u.username]) || [])
        
        membersWithUsers = membersData.map(member => ({
          ...member,
          users: { username: usersMap.get(member.user_id) || null }
        }))
      }
      
      setMembers(membersWithUsers)

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

        // Fetch events
        const { data: eventsData } = await supabase
          .from('events')
          .select(`
            *,
            users:created_by (name, username),
            attendees:event_attendees (count)
          `)
          .eq('group_id', groupData.id)
          .order('start_date', { ascending: true })
        
        const eventsWithCount = (eventsData || []).map(event => ({
          ...event,
          attendee_count: event.attendees?.[0]?.count || 0
        }))
        
        setEvents(eventsWithCount)
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
    setEvents([])
  }

  const refreshEvents = async () => {
    if (!group) return
    const { data: eventsData } = await supabase
      .from('events')
      .select(`
        *,
        users:created_by (name, username),
        attendees:event_attendees (count)
      `)
      .eq('group_id', group.id)
      .order('start_date', { ascending: true })
    
    const eventsWithCount = (eventsData || []).map(event => ({
      ...event,
      attendee_count: event.attendees?.[0]?.count || 0
    }))
    
    setEvents(eventsWithCount)
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
  const isGroupCreator = group.created_by === user?.id
  const isAdmin = userRole === 'admin' || user?.is_admin
  const isModerator = userRole === 'moderator'
  const canManageGroup = isGroupCreator || isAdmin || isModerator

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
                  {canManageGroup && (
                    <Link
                      href={`/group/${slug}/admin`}
                      className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full font-medium transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Administrar
                    </Link>
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
          {user && (
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
          )}
          <button
            onClick={() => setActiveTab('events')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'events'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Eventos ({group.event_count || 0})
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

        {activeTab === 'members' && user && (
          <div>
            {/* Búsqueda de miembros */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por username..."
                  value={memberSearch}
                  onChange={(e) => {
                    setMemberSearch(e.target.value)
                    setMemberPage(1) // Reset a página 1 al buscar
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Lista de miembros filtrada y paginada */}
            {(() => {
              const filteredMembers = members.filter(member => {
                if (!memberSearch.trim()) return true
                const username = member.users?.username || ''
                return username.toLowerCase().includes(memberSearch.toLowerCase())
              })
              const totalPages = Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE)
              const paginatedMembers = filteredMembers.slice(
                (memberPage - 1) * MEMBERS_PER_PAGE,
                memberPage * MEMBERS_PER_PAGE
              )

              return (
                <>
                  {paginatedMembers.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {paginatedMembers.map((member) => (
                        <div 
                          key={member.id} 
                          className="bg-card border border-border rounded-lg p-3 flex flex-col items-center gap-2 hover:border-primary/50 transition-colors"
                        >
                          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-muted-foreground">
                              {member.users?.username?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div className="text-center min-w-0 w-full">
                            <p className="font-medium text-foreground text-sm truncate">
                              @{member.users?.username || 'usuario'}
                            </p>
                            {member.role === 'admin' && (
                              <span className="inline-flex items-center gap-1 text-xs text-orange-500">
                                <Crown className="h-3 w-3" />
                                Admin
                              </span>
                            )}
                            {member.role === 'moderator' && (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-500">
                                <Shield className="h-3 w-3" />
                                Mod
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-card rounded-xl border border-border border-dashed">
                      <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">
                        {memberSearch ? 'No se encontraron miembros' : 'No hay miembros aún'}
                      </p>
                    </div>
                  )}

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <button
                        onClick={() => setMemberPage(p => Math.max(1, p - 1))}
                        disabled={memberPage === 1}
                        className="p-2 rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => {
                            // Mostrar primera, última, actual y adyacentes
                            if (page === 1 || page === totalPages) return true
                            if (Math.abs(page - memberPage) <= 1) return true
                            return false
                          })
                          .map((page, idx, arr) => (
                            <>
                              {idx > 0 && arr[idx - 1] !== page - 1 && (
                                <span key={`ellipsis-${page}`} className="px-2 text-muted-foreground">...</span>
                              )}
                              <button
                                key={page}
                                onClick={() => setMemberPage(page)}
                                className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors ${
                                  memberPage === page
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted hover:bg-muted/80 text-foreground'
                                }`}
                              >
                                {page}
                              </button>
                            </>
                          ))}
                      </div>
                      <button
                        onClick={() => setMemberPage(p => Math.min(totalPages, p + 1))}
                        disabled={memberPage === totalPages}
                        className="p-2 rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Info de resultados */}
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    {filteredMembers.length} {filteredMembers.length === 1 ? 'miembro' : 'miembros'}
                    {memberSearch && ` encontrados`}
                  </p>
                </>
              )
            })()}
          </div>
        )}

        {activeTab === 'events' && (
          <div>
            {/* Filtros */}
            <div className="flex items-center justify-between gap-2 mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEventFilter('upcoming')}
                  className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                    eventFilter === 'upcoming'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Próximos
                </button>
                <button
                  onClick={() => setEventFilter('past')}
                  className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                    eventFilter === 'past'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Pasados
                </button>
                <button
                  onClick={() => setEventFilter('all')}
                  className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                    eventFilter === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Todos
                </button>
              </div>

              {isMember && (
                <button
                  onClick={() => setShowEventForm(true)}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full font-medium hover:opacity-90 transition-opacity text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo evento
                </button>
              )}
            </div>

            {/* Lista de eventos */}
            {(() => {
              const filteredEvents = events.filter(event => {
                if (eventFilter === 'all') return true
                if (eventFilter === 'upcoming') {
                  return event.status === 'upcoming' || event.status === 'ongoing'
                }
                if (eventFilter === 'past') {
                  return event.status === 'completed' || event.status === 'cancelled'
                }
                return true
              })

              return (
                <>
                  {!canViewContent ? (
                    <div className="text-center py-16 bg-card rounded-xl border border-border border-dashed">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Canal privado
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Únete a este canal para ver los eventos
                      </p>
                      <button
                        onClick={handleJoinGroup}
                        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium hover:opacity-90 transition-opacity"
                      >
                        <UserPlus className="h-5 w-5" />
                        Unirse al canal
                      </button>
                    </div>
                  ) : filteredEvents.length > 0 ? (
                    <div className="space-y-4">
                      {filteredEvents.map((event) => (
                        <EventCard key={event.id} event={event} groupSlug={slug} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-card rounded-xl border border-border border-dashed">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-lg mb-4">
                        {eventFilter === 'upcoming' 
                          ? 'No hay eventos próximos' 
                          : eventFilter === 'past'
                          ? 'No hay eventos pasados'
                          : 'No hay eventos aún'}
                      </p>
                      {isMember && eventFilter !== 'past' && (
                        <button
                          onClick={() => setShowEventForm(true)}
                          className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                        >
                          <Plus className="h-4 w-4" />
                          Crear el primer evento
                        </button>
                      )}
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}

        {showEventForm && group && user && (
          <EventForm
            groupId={group.id}
            groupSlug={slug}
            userId={user.id}
            onClose={() => setShowEventForm(false)}
            onSuccess={refreshEvents}
          />
        )}
      </div>
    </main>
  )
}
