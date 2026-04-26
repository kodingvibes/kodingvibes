'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Globe, Lock, Search } from 'lucide-react'
import type { Tables } from '@/types/database'

type Group = Tables<'groups'>

interface ChannelPickerProps {
  channels: Group[]
  selectedChannelId: string | null
  onSelect: (channelId: string | null) => void
  allowAll?: boolean
  allLabel?: string
  label?: string
  required?: boolean
  disabled?: boolean
  error?: string | null
  placeholder?: string
}

export default function ChannelPicker({
  channels,
  selectedChannelId,
  onSelect,
  allowAll = false,
  allLabel = 'Todos los canales',
  label,
  required = false,
  disabled = false,
  error,
  placeholder = 'Buscar canal...',
}: ChannelPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedChannel = channels.find((channel) => channel.id === selectedChannelId)

  const filteredChannels = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return channels

    return channels.filter((channel) => {
      const name = channel.name?.toLowerCase() || ''
      const slug = channel.slug?.toLowerCase() || ''
      return name.includes(search) || slug.includes(search)
    })
  }, [channels, query])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setQuery('')
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setQuery('')
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

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-foreground mb-3">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <button
        type="button"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left transition-all ${
          disabled
            ? 'border-border bg-muted cursor-not-allowed opacity-50'
            : isOpen
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 bg-background'
        }`}
      >
        {selectedChannel ? (
          <>
            {selectedChannel.icon_url ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-background/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedChannel.icon_url} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: selectedChannel.color || '#6366f1' }}
              >
                {selectedChannel.name[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{selectedChannel.name}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {selectedChannel.is_public ? (
                  <>
                    <Globe className="h-3 w-3" />
                    <span>Publico</span>
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
          <p className="flex-1 text-muted-foreground">{allowAll ? allLabel : 'Selecciona un canal'}</p>
        )}

        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border bg-card sticky top-0">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto p-2 space-y-1">
            {allowAll && (
              <button
                type="button"
                onClick={() => {
                  onSelect(null)
                  setIsOpen(false)
                  setQuery('')
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors hover:bg-muted"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted text-muted-foreground font-semibold">
                  #
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{allLabel}</p>
                  <p className="text-xs text-muted-foreground">Sin filtro por canal</p>
                </div>
                {!selectedChannelId && (
                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            )}

            {filteredChannels.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No se encontraron canales para &quot;{query.trim()}&quot;
              </div>
            ) : (
              filteredChannels.map((channel) => (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => {
                    onSelect(channel.id)
                    setIsOpen(false)
                    setQuery('')
                  }}
                  className="relative w-full flex items-center gap-3 px-4 py-3 rounded-lg overflow-hidden group text-left transition-all hover:opacity-90"
                  style={{
                    backgroundImage: channel.banner_url ? `url(${channel.banner_url})` : undefined,
                    backgroundColor: !channel.banner_url ? (channel.color || '#6366f1') : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />

                  {channel.icon_url ? (
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-background/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={channel.icon_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div
                      className="relative w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: channel.color || '#6366f1' }}
                    >
                      {channel.name[0].toUpperCase()}
                    </div>
                  )}

                  <div className="relative flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{channel.name}</p>
                    <div className="flex items-center gap-1 text-xs text-white/70">
                      {channel.is_public ? (
                        <>
                          <Globe className="h-3 w-3" />
                          <span>Publico</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-3 w-3" />
                          <span>Privado</span>
                        </>
                      )}
                    </div>
                  </div>

                  {selectedChannelId === channel.id && (
                    <div className="relative w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
