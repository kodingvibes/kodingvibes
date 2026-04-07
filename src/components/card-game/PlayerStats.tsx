'use client'

import { useEffect, useRef, useState } from 'react'

interface PlayerStatsProps {
  name: string
  hp: number
  maxHp: number
  ram: number
  maxRam: number
  shield: number
  deckCount: number
  graveyardCount: number
  isActive: boolean
  side: 'player' | 'opponent'
  directDropHighlight?: boolean
}

export default function PlayerStats({
  name,
  hp,
  maxHp,
  ram,
  maxRam,
  shield,
  deckCount,
  graveyardCount,
  isActive,
  side,
  directDropHighlight = false,
}: PlayerStatsProps) {
  const isPlayer = side === 'player'
  const initializedRef = useRef(false)
  const prevHpRef = useRef(hp)
  const prevShieldRef = useRef(shield)
  const idRef = useRef(0)
  const [indicators, setIndicators] = useState<Array<{ id: number; text: string; color: string }>>([])
  const [hpFlash, setHpFlash] = useState<'damage' | 'heal' | null>(null)
  const [shieldFlash, setShieldFlash] = useState<'gain' | 'loss' | null>(null)

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      prevHpRef.current = hp
      prevShieldRef.current = shield
      return
    }

    const hpDelta = hp - prevHpRef.current
    const shieldDelta = shield - prevShieldRef.current

    if (hpDelta !== 0) {
      const id = ++idRef.current
      setIndicators(prev => [...prev, { id, text: `${hpDelta > 0 ? '+' : ''}${hpDelta} HP`, color: hpDelta > 0 ? '#00ff41' : '#ff3366' }])
      setHpFlash(hpDelta > 0 ? 'heal' : 'damage')
      setTimeout(() => {
        setIndicators(prev => prev.filter(x => x.id !== id))
        setHpFlash(null)
      }, 900)
    }

    if (shieldDelta !== 0) {
      const id = ++idRef.current
      setIndicators(prev => [...prev, { id, text: `${shieldDelta > 0 ? '+' : ''}${shieldDelta} SHIELD`, color: '#66a3ff' }])
      setShieldFlash(shieldDelta > 0 ? 'gain' : 'loss')
      setTimeout(() => {
        setIndicators(prev => prev.filter(x => x.id !== id))
        setShieldFlash(null)
      }, 900)
    }

    prevHpRef.current = hp
    prevShieldRef.current = shield
  }, [hp, shield])

  return (
    <div
      className={`rounded-xl p-1.5 md:p-2 transition-all duration-500 relative overflow-hidden ${
        isActive ? 'anim-turn-start' : ''
      }`}
      style={{
        fontFamily: 'var(--font-michroma)',
        background: directDropHighlight
          ? 'linear-gradient(135deg, rgba(255, 0, 68, 0.22) 0%, rgba(20, 0, 8, 0.88) 100%)'
          : isActive
            ? `linear-gradient(135deg, ${isPlayer ? 'rgba(0, 255, 255, 0.1)' : 'rgba(255, 0, 255, 0.1)'} 0%, rgba(0, 0, 0, 0.5) 100%)`
            : 'rgba(0, 0, 0, 0.4)',
        border: directDropHighlight
          ? '2px solid rgba(255, 80, 110, 0.95)'
          : isActive
            ? `2px solid ${isPlayer ? 'var(--neon-cyan)' : 'var(--neon-magenta)'}`
            : '1px solid rgba(100, 100, 100, 0.3)',
        boxShadow: directDropHighlight
          ? '0 0 24px rgba(255, 51, 102, 0.65), inset 0 0 16px rgba(255, 51, 102, 0.22)'
          : isActive
            ? `0 0 30px ${isPlayer ? 'rgba(0, 255, 255, 0.2)' : 'rgba(255, 0, 255, 0.2)'}, inset 0 0 20px ${isPlayer ? 'rgba(0, 255, 255, 0.05)' : 'rgba(255, 0, 255, 0.05)'}
`
            : 'none',
      }}
    >
      {indicators.map((item, idx) => (
        <div
          key={item.id}
          className="stat-float-indicator"
          style={{
            color: item.color,
            top: `${0.35 + idx * 1.1}rem`,
            right: isPlayer ? '0.75rem' : 'auto',
            left: isPlayer ? 'auto' : '0.75rem',
            textShadow: `0 0 10px ${item.color}`,
          }}
        >
          {item.text}
        </div>
      ))}

      {/* Animated background glow */}
      {isActive && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, ${isPlayer ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255, 0, 255, 0.15)'} 0%, transparent 70%)`,
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Player: RAM/Deck/Graveyard on right, HP center */}
      {/* Opponent: RAM/Deck/Graveyard on left, HP center */}
      <div className="flex items-center gap-2 relative z-10">
        
        {/* HP - Always Center */}
        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span
              className={`text-xs md:text-sm font-bold ${
                isPlayer ? 'neon-text-cyan' : 'neon-text-magenta'
              }`}
              data-attack-anchor={isPlayer ? 'player-name' : 'opponent-name'}
              style={{ 
                fontFamily: 'var(--font-michroma)',
                textShadow: '0 0 10px currentColor',
              }}
            >
              {isActive && '▶ '}{name}
            </span>
            {shield > 0 && (
              <span className={`text-[11px] px-2 py-1 rounded-md ${shieldFlash ? 'stat-hit-flash' : ''}`} style={{
                background: 'rgba(68, 136, 255, 0.2)',
                border: '2px solid rgba(68, 136, 255, 0.6)',
                color: '#66a3ff',
                fontFamily: 'var(--font-michroma)',
                boxShadow: '0 0 12px rgba(68, 136, 255, 0.45), inset 0 0 8px rgba(68, 136, 255, 0.2)',
              }}>
                🛡️ {shield}
              </span>
            )}
          </div>
          
          {/* HP Display */}
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-red-400 text-base">❤️</span>
            <span className={`text-base md:text-lg font-bold ${hpFlash ? 'stat-hit-flash' : ''}`} style={{ 
              fontFamily: 'var(--font-michroma)',
              color: hp > maxHp * 0.6 ? 'var(--neon-green)' : hp > maxHp * 0.3 ? 'var(--neon-yellow)' : 'var(--neon-red)'
            }}>
              {hp}<span className="text-xs text-gray-500">/{maxHp}</span>
            </span>
          </div>
        </div>

        {/* RAM + Deck + Graveyard - Left for opponent, Right for player */}
        <div className={`flex flex-col gap-1.5 ${isPlayer ? 'order-3' : 'order-1'}`}>
          {/* RAM */}
          <div className="flex flex-col gap-0.5">
            <span
              className="text-[9px] font-bold"
              style={{
                fontFamily: 'var(--font-michroma)',
                color: 'var(--neon-cyan)',
                textShadow: '0 0 5px var(--neon-cyan)',
              }}
            >
              RAM
            </span>
            <div className="flex gap-0.5">
              {Array.from({ length: maxRam }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded-sm transition-all duration-300 ${
                    i < ram ? 'anim-power' : ''
                  }`}
                  style={{
                    width: isPlayer ? '10px' : '9px',
                    height: isPlayer ? '13px' : '12px',
                    background: i < ram 
                      ? 'var(--neon-cyan)'
                      : 'rgba(0, 255, 255, 0.15)',
                    border: i < ram
                      ? 'none'
                      : '1px solid rgba(0, 255, 255, 0.3)',
                    boxShadow: i < ram ? '0 0 10px var(--neon-cyan)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Deck + Graveyard */}
          <div className="flex gap-1.5">
            {/* Deck */}
            <div className="relative w-7 h-9">
              {[0, 1, 2].map((offset) => (
                <div
                  key={offset}
                  className="absolute rounded"
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, rgba(30, 30, 60, 0.95) 0%, rgba(20, 20, 40, 0.98) 100%)',
                    border: '1px solid rgba(100, 100, 150, 0.4)',
                    transform: `translate(${offset * 1.5}px, -${offset * 2}px)`,
                    zIndex: offset,
                    boxShadow: offset === 0 ? '0 3px 6px rgba(0, 0, 0, 0.4)' : 'none',
                  }}
                />
              ))}
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold"
                style={{
                  background: 'linear-gradient(135deg, var(--neon-cyan), #0099aa)',
                  color: '#000',
                  fontFamily: 'var(--font-michroma)',
                  boxShadow: '0 0 8px rgba(0, 255, 255, 0.5)',
                }}
              >
                {deckCount}
              </div>
            </div>

            {/* Graveyard */}
            <div className="relative w-7 h-9">
              <div
                className="absolute rounded"
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, rgba(40, 40, 40, 0.9) 0%, rgba(30, 30, 30, 0.95) 100%)',
                  border: '1px solid rgba(80, 80, 80, 0.5)',
                  transform: 'rotate(180deg)',
                  boxShadow: '0 3px 6px rgba(0, 0, 0, 0.4)',
                }}
              />
              {graveyardCount > 0 && (
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #666, #444)',
                    color: '#fff',
                    fontFamily: 'var(--font-michroma)',
                    boxShadow: '0 0 8px rgba(100, 100, 100, 0.5)',
                  }}
                >
                  {graveyardCount}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
