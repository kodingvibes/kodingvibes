'use client'

import { CombatLogEntry } from '@/lib/card-game/types'

interface CombatLogProps {
  entries: CombatLogEntry[]
}

function getEntryColor(type: CombatLogEntry['type']): string {
  switch (type) {
    case 'attack': return '#ff4444'
    case 'ability': return '#aa88ff'
    case 'play': return '#00ffff'
    case 'damage': return '#ff0044'
    case 'heal': return '#00ff41'
    case 'info': return '#6666aa'
    case 'system': return '#ffff00'
    default: return '#666688'
  }
}

function getEntryIcon(type: CombatLogEntry['type']): string {
  switch (type) {
    case 'attack': return '⚔️'
    case 'ability': return '⚡'
    case 'play': return '💾'
    case 'damage': return '💥'
    case 'heal': return '💚'
    case 'info': return 'ℹ️'
    case 'system': return '⚙️'
    default: return '•'
  }
}

export default function CombatLog({ entries }: CombatLogProps) {
  const recentEntries = entries.slice(-10)

  return (
    <div
      className="rounded-lg border p-3 font-mono overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 10, 0, 0.9) 100%)',
        border: '1px solid rgba(0, 255, 100, 0.3)',
        boxShadow: '0 0 20px rgba(0, 255, 100, 0.1), inset 0 0 30px rgba(0, 0, 0, 0.8)',
      }}
    >
      {/* Terminal header */}
      <div
        className="flex items-center gap-2 mb-2 pb-2 border-b"
        style={{ borderBottomColor: 'rgba(0, 255, 100, 0.2)' }}
      >
        <span
          className="text-[10px] font-bold tracking-wider"
          style={{
            color: 'var(--neon-green)',
            textShadow: '0 0 5px var(--neon-green)',
          }}
        >
          {'>'} COMBAT_LOG_TERMINAL
        </span>
        <span
          className="text-[8px] ml-auto"
          style={{ color: 'rgba(0, 255, 100, 0.5)' }}
        >
          v2.077
        </span>
      </div>

      {/* Log entries */}
      <div className="space-y-1 max-h-48 overflow-y-auto" style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(0, 255, 100, 0.3) transparent',
      }}>
        {recentEntries.length === 0 ? (
          <div
            className="text-[10px] italic"
            style={{ color: 'rgba(0, 255, 100, 0.4)' }}
          >
            {'>'} Esperando acciones de combate...
            <span className="inline-block w-2 h-4 ml-1 align-middle" style={{
              background: 'var(--neon-green)',
              animation: 'blink 1s step-end infinite',
            }} />
          </div>
        ) : (
          recentEntries.map((entry, idx) => (
            <div
              key={idx}
              className="text-[10px] md:text-[11px] leading-tight flex items-start gap-1.5"
              style={{
                color: getEntryColor(entry.type),
                textShadow: '0 0 3px currentColor',
                animation: `typing 0.3s ease-out ${idx * 0.05}s both`,
              }}
            >
              <span className="flex-shrink-0 opacity-70">{getEntryIcon(entry.type)}</span>
              <span className="opacity-40 flex-shrink-0">[T{entry.turn}]</span>
              <span className="flex-1">{entry.message}</span>
            </div>
          ))
        )}
      </div>

      {/* Blinking cursor */}
      <div className="mt-2 text-[10px]" style={{ color: 'var(--neon-green)' }}>
        <span className="mr-1">{'>'}</span>
        <span className="inline-block w-2 h-4 align-middle" style={{
          background: 'var(--neon-green)',
          animation: 'blink 1s step-end infinite',
        }} />
      </div>
    </div>
  )
}
