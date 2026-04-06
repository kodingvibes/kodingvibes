'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Users, Lock, Globe, Plus, Hash, ArrowRight, Home } from 'lucide-react'
import type { Tables } from '@/types/database'
import type { User } from '@supabase/supabase-js'

type Group = Tables<'groups'>

interface GroupWithMembership extends Group {
  is_member?: boolean
  member_role?: string
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupWithMembership[]>([])
  const [myGroups, setMyGroups] = useState<GroupWithMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchGroups = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)

      // Fetch all active groups
      const { data: groupsData, error: groupsError, status, statusText } = await supabase
        .from('groups')
        .select('*')
        .eq('is_active', true)
        .order('post_count', { ascending: false })

      if (groupsError) {
        console.error('Error fetching groups:', {
          error: groupsError,
          message: groupsError.message,
          details: groupsError.details,
          hint: groupsError.hint,
          code: groupsError.code,
          status,
          statusText
        })
      }

      if (groupsData) {
        if (currentUser) {
          // Fetch user's memberships
          const { data: memberships } = await supabase
            .from('group_members')
            .select('*')
            .eq('user_id', currentUser.id)

          const membershipMap = new Map(memberships?.map(m => [m.group_id, m]))

          const groupsWithMembership = groupsData.map(group => ({
            ...group,
            is_member: membershipMap.has(group.id),
            member_role: membershipMap.get(group.id)?.role
          }))

          setGroups(groupsWithMembership)
          setMyGroups(groupsWithMembership.filter(g => g.is_member))
        } else {
          setGroups(groupsData)
        }
      }

      setLoading(false)
    }

    fetchGroups()
  }, [supabase])

  const handleJoinGroup = async (groupId: string) => {
    if (!user) {
      alert('Debes iniciar sesión para unirte a un grupo')
      return
    }

    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: user.id })

    if (error) {
      alert('Error al unirse al grupo: ' + error.message)
      return
    }

    // Update local state
    setGroups(prev => prev.map(g => 
      g.id === groupId ? { ...g, is_member: true, member_role: 'member' } : g
    ))
    
    const joinedGroup = groups.find(g => g.id === groupId)
    if (joinedGroup) {
      setMyGroups(prev => [...prev, { ...joinedGroup, is_member: true, member_role: 'member' }])
    }
  }

  const handleLeaveGroup = async (groupId: string) => {
    if (!user) return

    // No permitir salir del grupo por defecto
    const group = groups.find(g => g.id === groupId)
    if (group?.is_default) {
      alert('No puedes abandonar el canal principal de la comunidad')
      return
    }

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id)

    if (error) {
      alert('Error al salir del grupo: ' + error.message)
      return
    }

    // Update local state
    setGroups(prev => prev.map(g => 
      g.id === groupId ? { ...g, is_member: false, member_role: undefined } : g
    ))
    setMyGroups(prev => prev.filter(g => g.id !== groupId))
  }

  const publicGroups = groups.filter(g => g.is_public)
  const privateGroups = groups.filter(g => !g.is_public)

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Hash className="h-8 w-8 text-primary" />
              Canales
            </h1>
            <p className="text-muted-foreground mt-1">
              Únete a grupos para compartir y descubrir contenido específico
            </p>
          </div>
          <Link
            href="/groups/create"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="h-5 w-5" />
            Solicitar nuevo canal
          </Link>
        </div>

        {/* My Groups Section */}
        {user && myGroups.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Mis Canales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myGroups.map(group => (
                <GroupCard 
                  key={group.id} 
                  group={group} 
                  isMember={true}
                  onLeave={() => handleLeaveGroup(group.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Public Groups */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-green-500" />
            Canales Públicos
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : publicGroups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicGroups.map(group => (
                <GroupCard 
                  key={group.id} 
                  group={group} 
                  isMember={group.is_member}
                  onJoin={() => handleJoinGroup(group.id)}
                  onLeave={() => handleLeaveGroup(group.id)}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No hay canales públicos disponibles</p>
          )}
        </div>

        {/* Private Groups */}
        {privateGroups.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-orange-500" />
              Canales Privados
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Los canales privados requieren unirse para ver su contenido
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {privateGroups.map(group => (
                <GroupCard 
                  key={group.id} 
                  group={group} 
                  isMember={group.is_member}
                  onJoin={() => handleJoinGroup(group.id)}
                  onLeave={() => handleLeaveGroup(group.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function GroupCard({ 
  group, 
  isMember, 
  onJoin, 
  onLeave 
}: { 
  group: GroupWithMembership
  isMember?: boolean
  onJoin?: () => void
  onLeave?: () => void
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors">
      {/* Banner */}
      <div className="relative h-24 bg-gradient-to-br from-primary/80 to-primary">
        {group.banner_url ? (
          <Image
            src={group.banner_url}
            alt={`Banner de ${group.name}`}
            fill
            className="object-cover"
          />
        ) : (
          <div 
            className="absolute inset-0 opacity-50"
            style={{ backgroundColor: group.color || '#6366f1' }}
          />
        )}
        {group.banner_url && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between -mt-10 mb-3">
          <div className="flex items-center gap-3">
            {/* Icon */}
            {group.icon_url ? (
              <div className="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-card bg-card">
                <Image
                  src={group.icon_url}
                  alt={`Icono de ${group.name}`}
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              </div>
            ) : (
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl ring-2 ring-card"
                style={{ backgroundColor: group.color || '#6366f1' }}
              >
                {group.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{group.name}</h3>
                {group.is_default && (
                  <span className="inline-flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded text-xs font-medium">
                    <Home className="h-3 w-3" />
                    Principal
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {group.member_count}
                </span>
                <span>•</span>
                <span>{group.post_count} posts</span>
              </div>
            </div>
          </div>
          {group.is_public ? (
            <Globe className="h-4 w-4 text-green-500" />
          ) : (
            <Lock className="h-4 w-4 text-orange-500" />
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {group.description || 'Sin descripción'}
        </p>

        <div className="flex items-center gap-2">
          <Link
            href={`/group/${group.slug}`}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-medium transition-colors text-sm"
          >
            Ver canal
            <ArrowRight className="h-4 w-4" />
          </Link>
          
          {isMember ? (
            !group.is_default && (
              <button
                onClick={onLeave}
                className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors text-sm"
              >
                Salir
              </button>
            )
          ) : !group.is_default && (
            <button
              onClick={onJoin}
              className="px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-lg font-medium transition-opacity text-sm"
            >
              Unirse
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
