'use client'

import { CardDefinition, CardInstance, CardRarity } from '@/lib/card-game/types'

interface GameCardProps {
  card: CardDefinition | CardInstance
  onClick?: () => void
  isPlayable?: boolean
  isExhausted?: boolean
  isAttackTarget?: boolean
  isSelected?: boolean
  size?: 'sm' | 'md' | 'lg'
  showBack?: boolean
}

function isCardInstance(card: CardDefinition | CardInstance): card is CardInstance {
  return 'instanceId' in card
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
  size = 'md',
  showBack = false,
}: GameCardProps) {
  const def = isCardInstance(card) ? card.definition : card
  const inst = isCardInstance(card) ? card : null
  const strength = inst?.currentStrength ?? def.strength
  const firewall = inst?.currentFirewall ?? def.firewall
  const exhausted = inst?.isExhausted ?? isExhausted

  const typeColor = getTypeColor(def.type)
  const isSmall = size === 'sm'

  const sizeClasses = {
    sm: 'game-card game-card-sm',
    md: 'game-card',
    lg: 'game-card scale-[1.3]',
  }

  return (
    <div
      className={`
        ${sizeClasses[size]}
        ${getRarityClass(def.rarity)}
        ${isPlayable ? 'card-playable' : ''}
        ${exhausted ? 'card-exhausted' : ''}
        ${isAttackTarget ? 'attack-target' : ''}
        ${isSelected ? 'neon-glow-cyan' : ''}
        ${showBack ? 'flipped' : ''}
      `}
      onClick={onClick}
    >
      <div className="game-card-inner">
        {/* Front */}
        <div
          className="game-card-front flex flex-col"
          style={{
            background: `linear-gradient(135deg, ${def.artColors[0]}22, #0a0a1a 40%, ${def.artColors[1]}22)`,
          }}
        >
          {/* Top bar: cost + type */}
          <div className={`flex items-center justify-between ${isSmall ? 'px-1 pt-0.5' : 'px-1.5 pt-1'}`}>
            <span
              className={`rounded flex items-center justify-center font-bold ${
                isSmall ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-xs'
              }`}
              style={{ background: 'rgba(0,255,255,0.15)', color: '#00ffff' }}
            >
              {def.ramCost}
            </span>
            <span
              className="type-badge"
              style={{
                background: typeColor.bg,
                color: typeColor.text,
                fontSize: isSmall ? '0.55rem' : undefined,
              }}
            >
              {getTypeLabel(def.type)}
            </span>
          </div>

          {/* Art area */}
          <div
            className={`flex-1 flex items-center justify-center relative rounded ${
              isSmall ? 'mx-1 my-0.5' : 'mx-1.5 my-1'
            }`}
            style={{
              background: `linear-gradient(135deg, ${def.artColors[0]}44, ${def.artColors[1]}44)`,
            }}
          >
            <span className={`${isSmall ? 'text-2xl' : 'text-3xl md:text-4xl'} drop-shadow-lg select-none`}>
              {def.artIcon}
            </span>
            {def.rarity === 'legendary' && (
              <div className="absolute top-0.5 right-0.5">
                <span className="text-[9px]">⭐</span>
              </div>
            )}
            {def.rarity === 'rare' && (
              <div className="absolute top-0.5 right-0.5">
                <span className="text-[9px]">💠</span>
              </div>
            )}
          </div>

          {/* Name */}
          <div className={isSmall ? 'px-1 mb-0' : 'px-1.5 mb-0.5'}>
            <p
              className={`font-bold truncate leading-tight ${isSmall ? 'text-[9px]' : 'text-[11px]'}`}
              style={{ color: def.artColors[0] }}
            >
              {def.name}
            </p>
          </div>

          {/* Ability text - hidden for small cards */}
          {!isSmall && (
            <div className="px-1.5 mb-0.5">
              <p className="text-[8px] leading-tight text-gray-400 line-clamp-2">
                {def.ability}
              </p>
            </div>
          )}

          {/* Stats bar */}
          {def.type !== 'event' && (
            <div className={`flex items-center justify-between ${isSmall ? 'px-1 pb-0.5' : 'px-1.5 pb-1'}`}>
              <span
                className={`flex items-center gap-0.5 font-bold ${isSmall ? 'text-[10px]' : 'text-xs'}`}
                style={{ color: '#ff4444' }}
              >
                ⚔️ {strength}
              </span>
              <span
                className={`flex items-center gap-0.5 font-bold ${isSmall ? 'text-[10px]' : 'text-xs'}`}
                style={{ color: '#4488ff' }}
              >
                🛡️ {firewall}
              </span>
            </div>
          )}
        </div>

        {/* Back */}
        <div className="game-card-back" />
      </div>
    </div>
  )
}
