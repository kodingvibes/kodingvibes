'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Check, X, Loader2, ArrowLeft, Clock, Shield, User as UserIcon } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import type { Tables } from '@/types/database'

type GroupRequest = Tables<'group_creation_requests'> & {
  requester: { name: string | null; username: string | null; email: string } | null
}

export default function GroupRequestsAdminPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<GroupRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectionModal, setShowRejectionModal] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser) {
        router.push('/')
        return
      }

      setUser(currentUser)

      // Check if user is admin
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', currentUser.id)
        .single()

      if (!userData?.is_admin) {
        alert('No tienes permisos para acceder a esta página')
        router.push('/')
        return
      }

      setIsAdmin(true)

      // Fetch pending requests with requester info
      const { data: requestsData } = await supabase
        .from('group_creation_requests')
        .select(`
          *,
          requester:users!requested_by(name, username, email)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      setRequests(requestsData || [])
      setLoading(false)
    }

    checkAdminAndFetch()
  }, [supabase, router])

  const handleApprove = async (requestId: string) => {
    if (!user) return
    
    setProcessingId(requestId)

    try {
      const { error } = await supabase.rpc('approve_group_request', {
        request_id: requestId,
        admin_id: user.id
      })

      if (error) throw error

      // Remove from list
      setRequests(prev => prev.filter(r => r.id !== requestId))
      alert('Canal aprobado exitosamente')
    } catch (error) {
      console.error('Error approving request:', error)
      alert('Error al aprobar el canal')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    if (!user) return
    
    if (!rejectionReason.trim()) {
      alert('Por favor proporciona un motivo de rechazo')
      return
    }

    setProcessingId(requestId)

    try {
      const { error } = await supabase.rpc('reject_group_request', {
        request_id: requestId,
        admin_id: user.id,
        reason: rejectionReason.trim()
      })

      if (error) throw error

      // Remove from list
      setRequests(prev => prev.filter(r => r.id !== requestId))
      setShowRejectionModal(null)
      setRejectionReason('')
      alert('Solicitud rechazada')
    } catch (error) {
      console.error('Error rejecting request:', error)
      alert('Error al rechazar la solicitud')
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-8 w-48 bg-muted rounded animate-pulse mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Panel de Administración</h1>
            <p className="text-muted-foreground">Solicitudes de nuevos canales</p>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No hay solicitudes pendientes
            </h2>
            <p className="text-muted-foreground">
              Cuando los usuarios soliciten crear nuevos canales, aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div 
                key={request.id} 
                className="bg-card border border-border rounded-xl p-6"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-foreground">
                        {request.name}
                      </h3>
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                        Pendiente
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      /{request.slug}
                    </p>
                    <p className="text-foreground text-sm mb-3">
                      {request.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <UserIcon className="h-3.5 w-3.5" />
                         Solicitado por: {request.requester?.name || request.requester?.email}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(request.created_at).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                      <span>•</span>
                      <span className={request.is_public ? 'text-green-600' : 'text-orange-600'}>
                        {request.is_public ? 'Público' : 'Privado'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-border">
                  <button
                    onClick={() => handleApprove(request.id)}
                    disabled={processingId === request.id}
                    className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {processingId === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Aprobar
                  </button>
                  <button
                    onClick={() => setShowRejectionModal(request.id)}
                    disabled={processingId === request.id}
                    className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rejection Modal */}
        {showRejectionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Rechazar solicitud
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Por favor proporciona un motivo para rechazar esta solicitud. 
                Esto ayudará al solicitante a entender la decisión.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Motivo del rechazo..."
                className="w-full p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none mb-4"
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowRejectionModal(null)
                    setRejectionReason('')
                  }}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleReject(showRejectionModal)}
                  disabled={!rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  Confirmar rechazo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
