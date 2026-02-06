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

export default function CombatLog({ entries }: CombatLogProps) {
  const recentEntries = entries.slice(-8)

  return (
    <div className="combat-log rounded-lg border border-gray-700/30 bg-black/40 p-2">
      <div className="flex items-center gap-1 mb-1 pb-1 border-b border-gray-700/30">
        <span className="text-[9px] font-bold" style={{ color: 'var(--neon-green)' }}>
          {'>'} COMBAT_LOG
        </span>
      </div>
      {recentEntries.map((entry, idx) => (
        <div
          key={idx}
          className="py-0.5 leading-tight"
          style={{ color: getEntryColor(entry.type) }}
        >
          <span className="opacity-40">[T{entry.turn}]</span> {entry.message}
        </div>
      ))}
    </div>
  )
}
