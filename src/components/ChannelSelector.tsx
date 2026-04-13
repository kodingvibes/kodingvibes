'use client'

import Link from 'next/link'
import ChannelPicker from '@/components/ChannelPicker'
import type { Tables } from '@/types/database'

type Group = Tables<'groups'>

interface ChannelSelectorProps {
  groups: Group[]
  selectedGroupId: string | null
  onSelect: (groupId: string) => void
  disabled?: boolean
  error?: string | null
}

export default function ChannelSelector({
  groups,
  selectedGroupId,
  onSelect,
  disabled = false,
  error,
}: ChannelSelectorProps) {
  const selectedGroup = groups.find((g) => g.id === selectedGroupId)

  if (groups.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          No tienes acceso a ningún canal.{' '}
          <Link href="/channels" className="underline ml-1">
            Explora los canales disponibles
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
      <ChannelPicker
        channels={groups}
        selectedChannelId={selectedGroupId}
        onSelect={(channelId) => {
          if (channelId) onSelect(channelId)
        }}
        label="Canal"
        required
        disabled={disabled}
        error={error}
        allowAll={false}
      />

      {selectedGroup && !error && (
        <p className="text-xs text-muted-foreground mt-2">
          Publicando en: <span className="font-medium text-foreground">{selectedGroup.name}</span>
          {selectedGroup.slug !== 'general' && (
            <a
              href={`/channel/${selectedGroup.slug}`}
              className="ml-2 text-primary hover:underline"
            >
              Ver canal
            </a>
          )}
        </p>
      )}
    </div>
  )
}
