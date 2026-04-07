'use client'

import { CSSProperties, useRef } from 'react'
import { CardDefinition, CardInstance, CardRarity } from '@/lib/card-game/types'
import Image from 'next/image'

interface GameCardProps {
  card: CardDefinition | CardInstance
  onClick?: () => void
  isPlayable?: boolean
  isExhausted?: boolean
  isAttackTarget?: boolean
  isSelected?: boolean
  canAttack?: boolean
  directAttackReady?: boolean
  dimExhausted?: boolean
  isPlaying?: boolean
  animationClass?: string
  animationStyle?: CSSProperties
  onLongPress?: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showBack?: boolean
}

function isCardInstance(card: CardDefinition | CardInstance): card is CardInstance {
  return 'instanceId' in card
}

// Function to get card image path
function getCardImagePath(card: CardDefinition): string {
  // Events are always in 'events' folder regardless of faction
  if (card.type === 'event') {
    return `/cards/events/${card.id}.png`
  }
  
  let folder: string
  if (card.faction === 'runner') {
    folder = 'runner'
  } else if (card.faction === 'corp') {
    folder = 'corp'
  } else {
    folder = 'neutral'
  }
  return `/cards/${folder}/${card.id}.png`
}

function getRarityClass(rarity: CardRarity): string {
  return `rarity-${rarity}`
}

function getTypeColor(type: string): { bg: string; text: string } {
  switch (type) {
    case 'program': return { bg: 'rgba(0, 255, 255, 0.2)', text: '#00ffff' }
    case 'ice': return { bg: 'rgba(255, 136, 0, 0.2)', text: '#ff8800' }
    case 'hardware': return { bg: 'rgba(0, 255, 65, 0.2)', text: '#00ff41' }
    case 'event': return { bg: 'rgba(255, 0, 255, 0.2)', text: '#ff00ff' }
    default: return { bg: 'rgba(255,255,255,0.1)', text: '#ffffff' }
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'program': return 'PRG'
    case 'ice': return 'ICE'
    case 'hardware': return 'HW'
    case 'event': return 'EVT'
    default: return type
  }
}

export default function GameCard({
  card,
  onClick,
  isPlayable = false,
  isExhausted = false,
  isAttackTarget = false,
  isSelected = false,
  canAttack = false,
  directAttackReady = false,
  dimExhausted = true,
  isPlaying = false,
  animationClass = '',
  animationStyle,
  onLongPress,
  size = 'md',
  showBack = false,
}: GameCardProps) {
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFiredRef = useRef(false)
  const startPointRef = useRef<{ x: number; y: number } | null>(null)

  const clearPressTimer = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }

  const startLongPress = (x: number, y: number) => {
    if (!onLongPress) return
    clearPressTimer()
    longPressFiredRef.current = false
    startPointRef.current = { x, y }
    pressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true
      onLongPress()
    }, 1000)
  }

  const trackLongPressMove = (x: number, y: number) => {
    if (!startPointRef.current || !pressTimerRef.current) return
    const dx = Math.abs(x - startPointRef.current.x)
    const dy = Math.abs(y - startPointRef.current.y)
    if (dx > 8 || dy > 8) {
      clearPressTimer()
      startPointRef.current = null
    }
  }

  const endLongPress = () => {
    clearPressTimer()
    startPointRef.current = null
  }

  const def = isCardInstance(card) ? card.definition : card
  const inst = isCardInstance(card) ? card : null
  const strength = inst?.currentStrength ?? def.strength
  const firewall = inst?.currentFirewall ?? def.firewall
  const exhausted = inst?.isExhausted ?? isExhausted

  const typeColor = getTypeColor(def.type)
  const isSmall = size === 'sm'
  const isXL = size === 'xl'

  const sizeClasses = {
    sm: 'game-card game-card-sm',
    md: 'game-card',
    lg: 'game-card scale-[1.3]',
    xl: 'game-card xl-card',
  }

  // Dynamic glow based on card state
  const getDynamicGlow = () => {
    if (isAttackTarget) return '0 0 30px rgba(255, 0, 68, 0.8), 0 0 60px rgba(255, 0, 68, 0.4)'
    if (isSelected) return '0 0 30px rgba(0, 255, 255, 0.8), 0 0 60px rgba(0, 255, 255, 0.4)'
    if (canAttack) return '0 0 25px rgba(255, 68, 68, 0.7), 0 0 50px rgba(255, 68, 68, 0.4)'
    if (isPlayable) return '0 0 20px rgba(0, 255, 65, 0.6), 0 0 40px rgba(0, 255, 65, 0.3)'
    if (exhausted) return 'none'
    return ''
  }

  // Defense border: any unit with firewall > 0, unless a stronger border state applies
  const hasDefense = def.type !== 'event' && firewall > 0

  return (
    <div
      className={`
        ${sizeClasses[size]}
        ${getRarityClass(def.rarity)}
        ${isPlayable ? 'card-playable' : ''}
        ${exhausted && dimExhausted ? 'card-exhausted' : ''}
        ${isAttackTarget ? 'attack-target' : ''}
        ${isSelected ? 'neon-glow-cyan' : ''}
        ${showBack ? 'flipped' : ''}
        ${hasDefense && !directAttackReady ? 'card-has-defense' : ''}
        ${directAttackReady ? 'card-direct-attack-ready' : ''}
        ${isPlaying ? 'anim-summon' : ''}
        ${animationClass}
      `}
      onClick={onClick}
      data-instance-id={inst?.instanceId}
      onMouseDown={(e) => {
        if (e.button !== 0) return
        startLongPress(e.clientX, e.clientY)
      }}
      onMouseMove={(e) => trackLongPressMove(e.clientX, e.clientY)}
      onMouseUp={endLongPress}
      onMouseLeave={endLongPress}
      onTouchStart={(e) => {
        const t = e.touches[0]
        if (!t) return
        startLongPress(t.clientX, t.clientY)
      }}
      onTouchMove={(e) => {
        const t = e.touches[0]
        if (!t) return
        trackLongPressMove(t.clientX, t.clientY)
      }}
      onTouchEnd={endLongPress}
      style={{
        filter: exhausted && dimExhausted ? 'grayscale(0.6) brightness(0.7)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
        ...animationStyle,
      }}
      onClickCapture={(e) => {
        if (longPressFiredRef.current) {
          e.preventDefault()
          e.stopPropagation()
          longPressFiredRef.current = false
        }
      }}
    >
      <div className="game-card-inner">
        {/* Front */}
        <div
          className="game-card-front flex flex-col rounded-lg relative overflow-hidden"
          style={{
            boxShadow: getDynamicGlow(),
            transition: 'box-shadow 0.3s ease, transform 0.3s ease',
          }}
        >
          {/* Full card background image with inner glow */}
          <div className="absolute inset-0 z-0">
            <Image
              src={getCardImagePath(def)}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100px, 150px"
              unoptimized
            />
            {/* Inner glow overlay based on type */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at center, ${typeColor.bg}40 0%, transparent 70%)`,
                mixBlendMode: 'overlay',
              }}
            />
          </div>
          
          {/* Bottom gradient overlay for text readability */}
          <div 
            className="absolute bottom-0 left-0 right-0 z-0 pointer-events-none"
            style={{ 
              height: '55%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 30%, rgba(0,0,0,0.5) 60%, transparent 100%)'
            }}
          />
          
          {/* Animated border glow for playable cards */}
          {isPlayable && !directAttackReady && (
            <div
              className="absolute inset-0 rounded-lg pointer-events-none"
              style={{
                border: '2px solid rgba(0, 255, 65, 0.6)',
                borderRadius: '10px',
                animation: 'power-surge 1.5s ease-in-out infinite',
              }}
            />
          )}
          
          {/* Attack ready indicator */}
          {canAttack && (
            <div
              className="absolute -top-1 -right-1 z-30 text-xl animate-bounce"
              style={{
                filter: 'drop-shadow(0 0 5px rgba(255, 68, 68, 0.8))',
              }}
            >
              ⚔️
            </div>
          )}

          {/* Content with semi-transparent backgrounds for readability */}
          {/* Top bar: cost + type */}
          <div className={`flex items-center justify-between z-10 ${isXL ? 'p-3 pb-1' : 'p-1.5 pb-0'}`}>
            <span
              className={`rounded-md flex items-center justify-center font-bold ${isXL ? 'w-10 h-10 text-base' : 'w-5 h-5 text-[9px]'}`}
              style={{ background: 'rgba(0,0,0,0.8)', color: '#00ffff', border: '1px solid rgba(0,255,255,0.3)' }}
            >
              {def.ramCost}
            </span>
            <span
              className={`type-badge ${isXL ? 'text-sm' : 'text-[9px]'}`}
              style={{
                background: 'rgba(0,0,0,0.8)',
                color: typeColor.text,
                border: `1px solid ${typeColor.text}`,
              }}
            >
              {getTypeLabel(def.type)}
            </span>
          </div>

          {/* Art area spacer */}
          <div className={`flex-1 relative z-10 ${isXL ? 'mx-3 my-1' : 'mx-1.5 my-0'}`}>
            {/* Rarity indicator */}
            {def.rarity === 'legendary' && (
              <div className="absolute top-0 right-0 z-20">
                <span className={isXL ? 'text-base' : 'text-[8px]'}>⭐</span>
              </div>
            )}
            {def.rarity === 'rare' && (
              <div className="absolute top-0 right-0 z-20">
                <span className={isXL ? 'text-base' : 'text-[8px]'}>💠</span>
              </div>
            )}
          </div>

          {/* Name */}
          <div className={`z-10 ${isXL ? 'px-3' : 'px-1.5'}`}>
            <p
              className={`font-bold truncate leading-tight text-white drop-shadow-md ${isXL ? 'text-xl' : 'text-[9px]'}`}
            >
              {def.name}
            </p>
          </div>

          {/* Ability text - hidden for small cards */}
          {!isSmall && (
            <div className={`z-10 ${isXL ? 'px-3' : 'px-1.5'}`}>
              <p className={`leading-tight text-gray-200 bg-black/50 rounded line-clamp-2 ${isXL ? 'text-base p-3' : 'text-[7px] p-1.5'}`}>
                {def.ability}
              </p>
            </div>
          )}

          {/* Stats bar - enhanced with gem backgrounds */}
          {def.type !== 'event' && (
            <div className={`flex items-center justify-between z-10 ${isXL ? 'p-3 pt-1' : 'p-1.5 pt-0'}`}>
              <span
                className={`flex items-center gap-0.5 font-bold rounded px-1.5 py-0.5 ${isXL ? 'text-lg' : 'text-[9px]'}`}
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 68, 68, 0.3), rgba(255, 0, 0, 0.2))',
                  color: '#ff6666',
                  border: '1px solid rgba(255, 68, 68, 0.4)',
                  boxShadow: '0 0 8px rgba(255, 68, 68, 0.3), inset 0 0 5px rgba(255, 68, 68, 0.1)',
                  textShadow: '0 0 3px rgba(255, 68, 68, 0.5)',
                }}
              >
                ⚔️ {strength}
              </span>
              <span
                className={`flex items-center gap-0.5 font-bold rounded px-1.5 py-0.5 ${isXL ? 'text-lg' : 'text-[9px]'}`}
                style={{
                  background: 'linear-gradient(135deg, rgba(68, 136, 255, 0.3), rgba(0, 0, 255, 0.2))',
                  color: '#6688ff',
                  border: '1px solid rgba(68, 136, 255, 0.4)',
                  boxShadow: '0 0 8px rgba(68, 136, 255, 0.3), inset 0 0 5px rgba(68, 136, 255, 0.1)',
                  textShadow: '0 0 3px rgba(68, 136, 255, 0.5)',
                }}
              >
                🛡️ {firewall}
              </span>
            </div>
          )}
        </div>

        {/* Back - enhanced with animated glow */}
        <div className="game-card-back relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(0, 255, 255, 0.1) 0%, transparent 70%)',
              animation: 'pulse-glow 3s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    </div>
  )
}
