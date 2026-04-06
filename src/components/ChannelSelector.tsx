'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Check, Globe, Lock } from 'lucide-react'
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
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selectedGroup = groups.find((g) => g.id === selectedGroupId)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (groups.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          No tienes acceso a ningún canal.{' '}
          <a href="/groups" className="underline ml-1">
            Explora los canales disponibles
          </a>
        </p>
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-foreground mb-3">
        Canal <span className="text-red-500">*</span>
      </label>

      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left transition-all ${
          disabled
            ? 'border-border bg-muted cursor-not-allowed opacity-50'
            : isOpen
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 bg-background'
        }`}
      >
        {selectedGroup ? (
          <>
            {selectedGroup.icon_url ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-background/20">
                <img
                  src={selectedGroup.icon_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: selectedGroup.color || '#6366f1' }}
              >
                {selectedGroup.name[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{selectedGroup.name}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {selectedGroup.is_public ? (
                  <>
                    <Globe className="h-3 w-3" />
                    <span>Público</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3" />
                    <span>Privado</span>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="flex-1 text-muted-foreground">Selecciona un canal</p>
        )}
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {error}
          </p>
        </div>
      )}

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-80 overflow-y-auto">
          <div className="p-2 space-y-1">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => {
                  onSelect(group.id)
                  setIsOpen(false)
                }}
                className="relative w-full flex items-center gap-3 px-4 py-3 rounded-lg overflow-hidden group text-left transition-all hover:opacity-90"
                style={{
                  backgroundImage: group.banner_url
                    ? `url(${group.banner_url})`
                    : undefined,
                  backgroundColor: !group.banner_url ? (group.color || '#6366f1') : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />

                {group.icon_url ? (
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-background/20">
                    <img
                      src={group.icon_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="relative w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: group.color || '#6366f1' }}
                  >
                    {group.name[0].toUpperCase()}
                  </div>
                )}

                <div className="relative flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{group.name}</p>
                  <div className="flex items-center gap-1 text-xs text-white/70">
                    {group.is_public ? (
                      <>
                        <Globe className="h-3 w-3" />
                        <span>Público</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3" />
                        <span>Privado</span>
                      </>
                    )}
                  </div>
                </div>

                {selectedGroupId === group.id && (
                  <div className="relative w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedGroup && !error && (
        <p className="text-xs text-muted-foreground mt-2">
          Publicando en: <span className="font-medium text-foreground">{selectedGroup.name}</span>
          {selectedGroup.slug !== 'general' && (
            <a
              href={`/group/${selectedGroup.slug}`}
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