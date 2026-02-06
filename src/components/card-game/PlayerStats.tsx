'use client'

interface PlayerStatsProps {
  name: string
  hp: number
  maxHp: number
  ram: number
  maxRam: number
  shield: number
  deckCount: number
  handCount: number
  isActive: boolean
  side: 'player' | 'opponent'
}

export default function PlayerStats({
  name,
  hp,
  maxHp,
  ram,
  maxRam,
  shield,
  deckCount,
  handCount,
  isActive,
  side,
}: PlayerStatsProps) {
  const hpPercent = (hp / maxHp) * 100
  const hpClass = hpPercent > 60 ? 'hp-high' : hpPercent > 30 ? 'hp-medium' : 'hp-low'

  return (
    <div
      className={`rounded-lg p-1.5 md:p-2 font-mono transition-all duration-300 ${
        isActive
          ? 'border border-cyan-500/30 bg-cyan-500/5'
          : 'border border-gray-700/30 bg-gray-900/30'
      }`}
    >
      <div className="flex items-center gap-2 md:gap-3">
        {/* Name + HP */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className={`text-[11px] md:text-xs font-bold truncate ${
                side === 'player' ? 'neon-text-cyan' : 'neon-text-magenta'
              }`}
            >
              {isActive && '▶ '}{name}
            </span>
            {shield > 0 && (
              <span className="text-[10px] md:text-xs px-1.5 py-0 rounded bg-blue-500/20 text-blue-400">
                🛡 {shield}
              </span>
            )}
            <span className="text-[10px] md:text-xs ml-auto font-bold" style={{ color: 'var(--cyber-muted)' }}>
              {hp}/{maxHp}
            </span>
          </div>
          {/* HP bar */}
          <div className="hp-bar">
            <div
              className={`hp-bar-fill ${hpClass}`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* RAM pips */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] md:text-[11px] font-bold" style={{ color: 'var(--neon-cyan)' }}>RAM</span>
          <div className="flex gap-0.5 md:gap-1">
            {Array.from({ length: maxRam }).map((_, i) => (
              <div
                key={i}
                className={`ram-pip ${i < ram ? 'filled' : 'empty'}`}
              />
            ))}
          </div>
        </div>

        {/* Deck + Hand count */}
        <div className="flex flex-col items-center gap-0 text-[10px] md:text-xs" style={{ color: 'var(--cyber-muted)' }}>
          <span>📚{deckCount}</span>
          <span>🃏{handCount}</span>
        </div>
      </div>
    </div>
  )
}
