'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { 
  Shield, AlertTriangle, Check, X, Ban, Clock, 
  User as UserIcon, ArrowLeft, AlertCircle, Info, Search
} from 'lucide-react'
import Link from 'next/link'
import type { Tables } from '@/types/database'

type ModerationRequest = Tables<'moderation_requests'> & {
  requester: { name: string | null; username: string | null; email: string } | null
  post: { title: string; user_id: string } | null
  group: { name: string; slug: string } | null
}

type UserBan = Tables<'user_bans'> & {
  user: { name: string | null; username: string | null; email: string } | null
  banner: { name: string | null; username: string | null; email: string } | null
}

type UserSearch = {
  id: string
  email: string
  username: string | null
  name: string | null
  is_admin: boolean
  created_at: string
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [moderationRequests, setModerationRequests] = useState<ModerationRequest[]>([])
  const [activeBans, setActiveBans] = useState<UserBan[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'moderation' | 'bans' | 'users'>('moderation')
  const [adminNotes, setAdminNotes] = useState('')
  const [showNotesModal, setShowNotesModal] = useState<string | null>(null)
  
  // Ban modal states
  const [showBanModal, setShowBanModal] = useState(false)
  const [banUserId, setBanUserId] = useState<string | null>(null)
  const [banReason, setBanReason] = useState('')
  const [banType, setBanType] = useState<'permanent' | 'temporary'>('temporary')
  const [banDuration, setBanDuration] = useState('7') // días
  
  // User search
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearch[]>([])
  const [searching, setSearching] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/')
        return
      }

      // Check if user is admin
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!userData?.is_admin) {
        alert('No tienes permisos para acceder a esta página')
        router.push('/')
        return
      }

      setIsAdmin(true)
      await fetchData()
    }

    checkAdminAndFetch()
  }, [supabase, router])

  const fetchData = async () => {
    // Fetch pending moderation requests
    const { data: requestsData } = await supabase
      .from('moderation_requests')
      .select(`
        *,
        requester:users!requested_by(name, username, email),
        post:posts(title, user_id),
        group:groups(name, slug)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    setModerationRequests(requestsData || [])

    // Fetch active bans
    const { data: bansData } = await supabase
      .from('user_bans')
      .select(`
        *,
        user:users!user_id(name, username, email),
        banner:users!banned_by(name, username, email)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    setActiveBans(bansData || [])
    setLoading(false)
  }

  const handleApproveModeration = async (requestId: string) => {
    setProcessingId(requestId)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.rpc('approve_moderation_request', {
        request_id: requestId,
        admin_id: user.id,
        notes: adminNotes || undefined
      })

      if (error) throw error

      setModerationRequests(prev => prev.filter(r => r.id !== requestId))
      setShowNotesModal(null)
      setAdminNotes('')
      alert('Petición aprobada y post eliminado')
    } catch (error) {
      console.error('Error:', error)
      alert('Error al aprobar la petición')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectModeration = async (requestId: string) => {
    if (!adminNotes.trim()) {
      alert('Por favor proporciona una nota explicando el rechazo')
      return
    }

    setProcessingId(requestId)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.rpc('reject_moderation_request', {
        request_id: requestId,
        admin_id: user.id,
        notes: adminNotes
      })

      if (error) throw error

      setModerationRequests(prev => prev.filter(r => r.id !== requestId))
      setShowNotesModal(null)
      setAdminNotes('')
      alert('Petición rechazada')
    } catch (error) {
      console.error('Error:', error)
      alert('Error al rechazar la petición')
    } finally {
      setProcessingId(null)
    }
  }

  const handleBanUser = async () => {
    if (!banUserId || !banReason.trim()) {
      alert('Por favor completa todos los campos')
      return
    }

    setProcessingId(banUserId)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let expiresAt = null
      if (banType === 'temporary') {
        const days = parseInt(banDuration)
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
      }

      const { error } = await supabase.rpc('ban_user', {
        target_user_id: banUserId,
        admin_id: user.id,
        ban_reason: banReason,
        ban_type_val: banType,
        expires_at_val: expiresAt || undefined
      })

      if (error) throw error

      await fetchData()
      setShowBanModal(false)
      setBanUserId(null)
      setBanReason('')
      setBanType('temporary')
      setBanDuration('7')
      alert('Usuario suspendido exitosamente')
    } catch (error) {
      console.error('Error:', error)
      alert('Error al suspender usuario')
    } finally {
      setProcessingId(null)
    }
  }

  const handleUnbanUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de que quieres remover la suspensión de este usuario?')) {
      return
    }

    setProcessingId(userId)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.rpc('unban_user', {
        target_user_id: userId,
        admin_id: user.id,
        unban_reason_val: 'Apelación aprobada por admin'
      })

      if (error) throw error

      await fetchData()
      alert('Suspensión removida exitosamente')
    } catch (error) {
      console.error('Error:', error)
      alert('Error al remover suspensión')
    } finally {
      setProcessingId(null)
    }
  }

  const handleUserSearch = async () => {
    if (!userSearch.trim()) return

    setSearching(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, username, name, is_admin, created_at')
        .or(`email.ilike.%${userSearch}%,username.ilike.%${userSearch}%,name.ilike.%${userSearch}%`)
        .limit(10)

      if (error) throw error
      setSearchResults(data || [])
    } catch (error) {
      console.error('Error:', error)
      alert('Error al buscar usuarios')
    } finally {
      setSearching(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDisplayName = (user: { name: string | null; username: string | null; email: string } | null) => {
    if (!user) return 'Usuario desconocido'
    return user.username || user.name || user.email.split('@')[0]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Panel de Administración</h1>
              <p className="text-muted-foreground mt-1">
                Gestiona peticiones de moderación y usuarios
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab('moderation')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'moderation'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Peticiones ({moderationRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('bans')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'bans'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Ban className="h-4 w-4" />
            Suspensiones ({activeBans.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserIcon className="h-4 w-4" />
            Usuarios
          </button>
        </div>

        {/* Moderation Requests Tab */}
        {activeTab === 'moderation' && (
          <div className="space-y-4">
            {moderationRequests.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-xl">
                <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">No hay peticiones pendientes</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Todas las peticiones de moderación han sido procesadas
                </p>
              </div>
            ) : (
              moderationRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium rounded">
                          {request.group?.name || 'Grupo desconocido'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(request.created_at)}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {request.post?.title || 'Post eliminado'}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Solicitado por: <span className="font-medium text-foreground">
                          @{getDisplayName(request.requester)}
                        </span>
                      </p>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-foreground mb-1">Motivo:</p>
                        <p className="text-sm text-muted-foreground">{request.reason}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-4 border-t border-border">
                    <button
                      onClick={() => setShowNotesModal(request.id)}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      disabled={processingId === request.id}
                    >
                      <Check className="w-4 h-4" />
                      Aprobar
                    </button>
                    <button
                      onClick={() => {
                        setShowNotesModal(request.id)
                        setAdminNotes('')
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      disabled={processingId === request.id}
                    >
                      <X className="w-4 h-4" />
                      Rechazar
                    </button>
                    <Link
                      href={`/post/${request.post_id}`}
                      target="_blank"
                      className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
                    >
                      Ver post
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Bans Tab */}
        {activeTab === 'bans' && (
          <div className="space-y-4">
            {activeBans.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-xl">
                <Ban className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium text-foreground">No hay suspensiones activas</p>
              </div>
            ) : (
              activeBans.map((ban) => (
                <div
                  key={ban.id}
                  className="bg-card border border-border rounded-xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          ban.ban_type === 'permanent'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                        }`}>
                          {ban.ban_type === 'permanent' ? 'Permanente' : 'Temporal'}
                        </span>
                        {ban.ban_type === 'temporary' && ban.expires_at && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Expira: {formatDate(ban.expires_at)}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        @{getDisplayName(ban.user)}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Suspendido por: @{getDisplayName(ban.banner)}
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        {formatDate(ban.created_at)}
                      </p>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-foreground mb-1">Motivo:</p>
                        <p className="text-sm text-muted-foreground">{ban.reason}</p>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleUnbanUser(ban.user_id)}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    disabled={processingId === ban.user_id}
                  >
                    <Check className="w-4 h-4" />
                    Remover Suspensión
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            {/* Search */}
            <div className="bg-card border border-border rounded-xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Buscar Usuario</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleUserSearch()}
                  placeholder="Email, username o nombre..."
                  className="flex-1 px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                />
                <button
                  onClick={handleUserSearch}
                  disabled={searching}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Buscar
                </button>
              </div>
            </div>

            {/* Results */}
            {searchResults.length > 0 && (
              <div className="space-y-4">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="bg-card border border-border rounded-xl p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-foreground">
                            @{user.username || 'sin_username'}
                          </h3>
                          {user.is_admin && (
                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium rounded flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{user.email}</p>
                        {user.name && (
                          <p className="text-sm text-muted-foreground">{user.name}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Registrado: {formatDate(user.created_at)}
                        </p>
                      </div>
                      
                      {!user.is_admin && (
                        <button
                          onClick={() => {
                            setBanUserId(user.id)
                            setShowBanModal(true)
                          }}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                          <Ban className="w-4 h-4" />
                          Suspender
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes Modal */}
        {showNotesModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Notas del Admin (opcional)
              </h3>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Agrega notas sobre esta decisión..."
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent min-h-[100px] mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleApproveModeration(showNotesModal)}
                  disabled={processingId === showNotesModal}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => handleRejectModeration(showNotesModal)}
                  disabled={processingId === showNotesModal}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Rechazar
                </button>
                <button
                  onClick={() => {
                    setShowNotesModal(null)
                    setAdminNotes('')
                  }}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ban Modal */}
        {showBanModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Suspender Usuario
              </h3>
              
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Tipo de suspensión
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBanType('temporary')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        banType === 'temporary'
                          ? 'bg-orange-600 text-white'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      Temporal
                    </button>
                    <button
                      onClick={() => setBanType('permanent')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        banType === 'permanent'
                          ? 'bg-red-600 text-white'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      Permanente
                    </button>
                  </div>
                </div>

                {banType === 'temporary' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Duración (días)
                    </label>
                    <select
                      value={banDuration}
                      onChange={(e) => setBanDuration(e.target.value)}
                      className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                    >
                      <option value="1">1 día</option>
                      <option value="3">3 días</option>
                      <option value="7">7 días</option>
                      <option value="14">14 días</option>
                      <option value="30">30 días</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Motivo *
                  </label>
                  <textarea
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Explica el motivo de la suspensión..."
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent min-h-[100px]"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleBanUser}
                  disabled={processingId === banUserId}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Suspender
                </button>
                <button
                  onClick={() => {
                    setShowBanModal(false)
                    setBanUserId(null)
                    setBanReason('')
                    setBanType('temporary')
                  }}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
