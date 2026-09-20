'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface GroupJoinButtonProps {
  groupId: string
  groupName: string
  isMember: boolean
  isDefault: boolean
}

/**
 * The only interactive part of a channel card. It is isolated in its own
 * client component so the card itself (banner, name, counts, description, the
 * link to the channel) is rendered on the server and remains visible without
 * JavaScript.
 */
export default function GroupJoinButton({
  groupId,
  groupName,
  isMember,
  isDefault,
}: GroupJoinButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  if (isDefault) return null

  const handleJoin = async () => {
    setLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/?auth_required=1')
        return
      }

      const { error: joinError } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: user.id })

      if (joinError) {
        setError(joinError.message)
        return
      }

      router.refresh()
    } catch {
      setError('No se pudo completar la acción')
    } finally {
      setLoading(false)
    }
  }

  const handleLeave = async () => {
    setLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { error: leaveError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id)

      if (leaveError) {
        setError(leaveError.message)
        return
      }

      router.refresh()
    } catch {
      setError('No se pudo completar la acción')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-stretch">
      <button
        onClick={isMember ? handleLeave : handleJoin}
        disabled={loading}
        className={
          isMember
            ? 'px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors text-sm'
            : 'px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-lg font-medium transition-opacity text-sm'
        }
      >
        {loading ? '...' : isMember ? 'Salir' : 'Unirse'}
      </button>
      {error && (
        <span className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </span>
      )}
      <span className="sr-only">{groupName}</span>
    </div>
  )
}
