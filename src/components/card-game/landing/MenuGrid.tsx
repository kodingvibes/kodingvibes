'use client'

import Link from 'next/link'
import { ALL_CARDS } from '@/lib/card-game/cards'

// Get representative cards for backgrounds
const AI_CARD = ALL_CARDS.find(c => c.faction === 'corp' && c.rarity === 'rare')
const MULTI_CARD = ALL_CARDS.find(c => c.rarity === 'legendary')
const COLLECTION_CARD = ALL_CARDS.find(c => c.type === 'hardware')
const DECK_CARD = ALL_CARDS.find(c => c.type === 'program')
const RANK_CARD = ALL_CARDS.find(c => c.faction === 'runner')

const MENU_ITEMS = [
  {
    title: 'JUGAR vs AI',
    description: 'Enfréntate a la Corp AI en combate individual',
    icon: '🎮',
    href: '/card-game/play',
    color: 'cyan',
    card: AI_CARD,
    size: 'large',
    glow: 'rgba(0, 255, 255, 0.15)',
  },
  {
    title: 'MULTIJUGADOR',
    description: 'Desafía a otros runners en tiempo real',
    icon: '⚔️',
    href: '/card-game/lobby',
    color: 'magenta',
    card: MULTI_CARD,
    size: 'large',
    glow: 'rgba(255, 0, 255, 0.15)',
  },
  {
    title: 'COLECCIÓN',
    description: `Explora las ${ALL_CARDS.length} cartas disponibles`,
    icon: '🃏',
    href: '/card-game/collection',
    color: 'green',
    card: COLLECTION_CARD,
    size: 'small',
    glow: 'rgba(0, 255, 65, 0.15)',
  },
  {
    title: 'DECK BUILDER',
    description: 'Construye y guarda tus decks personalizados',
    icon: '🔧',
    href: '/card-game/deck-builder',
    color: 'yellow',
    card: DECK_CARD,
    size: 'small',
    glow: 'rgba(255, 255, 0, 0.15)',
  },
  {
    title: 'RANKINGS',
    description: 'Clasificación global y sistema ELO',
    icon: '🏆',
    href: '/card-game/rankings',
    color: 'red',
    card: RANK_CARD,
    size: 'small',
    glow: 'rgba(255, 0, 68, 0.15)',
  },
  {
    title: 'CÓMO JUGAR',
    description: 'Aprende reglas clave, incluido daño excedente',
    icon: '📖',
    href: null,
    color: 'gray',
    card: null,
    size: 'small',
    glow: 'rgba(100, 100, 100, 0.15)',
  },
]

const COLOR_MAP = {
  cyan: { text: '#00ffff', border: 'rgba(0, 255, 255, 0.3)', bg: 'rgba(0, 255, 255, 0.05)' },
  magenta: { text: '#ff00ff', border: 'rgba(255, 0, 255, 0.3)', bg: 'rgba(255, 0, 255, 0.05)' },
  green: { text: '#00ff41', border: 'rgba(0, 255, 65, 0.3)', bg: 'rgba(0, 255, 65, 0.05)' },
  yellow: { text: '#ffff00', border: 'rgba(255, 255, 0, 0.3)', bg: 'rgba(255, 255, 0, 0.05)' },
  red: { text: '#ff0044', border: 'rgba(255, 0, 68, 0.3)', bg: 'rgba(255, 0, 68, 0.05)' },
  gray: { text: 'var(--cyber-text)', border: 'rgba(100, 100, 100, 0.3)', bg: 'rgba(100, 100, 100, 0.05)' },
}

export default function MenuGrid() {
  return (
    <section className="relative py-20">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 
            className="text-3xl md:text-5xl font-bold mb-4"
            style={{ 
              fontFamily: 'var(--font-michroma)',
              color: 'var(--cyber-text)',
            }}
          >
            ELIGE TU <span className="neon-text-magenta">CAMINO</span>
          </h2>
          <p className="text-sm md:text-base font-mono" style={{ color: 'var(--cyber-muted)' }}>
            Cada modo de juego es una nueva oportunidad para demostrar tu habilidad
          </p>
        </div>

        {/* Grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {MENU_ITEMS.map((item, index) => {
            const colors = COLOR_MAP[item.color as keyof typeof COLOR_MAP]
            const isLarge = item.size === 'large'
            
            const cardClasses = isLarge 
              ? 'md:row-span-1 lg:col-span-1' 
              : ''

            return (
              <Link
                key={index}
                href={item.href || '#'}
                className={`group relative overflow-hidden rounded-lg transition-all duration-300 ${cardClasses}`}
                style={{
                  background: `linear-gradient(135deg, ${colors.bg} 0%, rgba(0, 0, 0, 0.4) 100%)`,
                  border: `1px solid ${colors.border}`,
                  clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
                }}
              >
                {/* Card background image (if available) */}
                {item.card && (
                  <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                    {/* Would use Image component here, using gradient fallback */}
                    <div 
                      className="w-full h-full"
                      style={{
                        background: `radial-gradient(ellipse at center, ${colors.text} 0%, transparent 70%)`,
                      }}
                    />
                  </div>
                )}

                {/* Glow effect on hover */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at center, ${item.glow} 0%, transparent 70%)`,
                  }}
                />

                {/* Content */}
                <div className="relative z-10 p-6 h-full flex flex-col">
                  {/* Icon */}
                  <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>

                  {/* Title */}
                  <h3 
                    className={`font-bold mb-2 transition-colors duration-300 ${
                      isLarge ? 'text-lg md:text-xl' : 'text-base'
                    }`}
                    style={{ 
                      fontFamily: 'var(--font-michroma)',
                      color: colors.text,
                    }}
                  >
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p 
                    className={`font-mono transition-colors duration-300 ${
                      isLarge ? 'text-xs md:text-sm' : 'text-[10px] md:text-xs'
                    }`}
                    style={{ color: 'var(--cyber-muted)' }}
                  >
                    {item.description}
                  </p>

                  {/* Arrow indicator */}
                  <div className="mt-auto pt-4 flex items-center gap-2 text-xs font-mono opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <span style={{ color: colors.text }}>EXPLORAR</span>
                    <span style={{ color: colors.text }}>→</span>
                  </div>
                </div>

                {/* Animated border on hover */}
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{
                  boxShadow: `inset 0 0 30px ${item.glow}`,
                }} />
              </Link>
            )
          })}
        </div>

        {/* Multiplayer full-width banner */}
        <div className="mt-4">
          <Link 
            href="/card-game/lobby"
            className="group relative block overflow-hidden rounded-lg p-8 transition-all duration-500"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 0, 255, 0.1) 0%, rgba(0, 0, 0, 0.6) 100%)',
              border: '1px solid rgba(255, 0, 255, 0.3)',
              clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
            }}
          >
            {/* Animated background */}
            <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-500">
              <div className="absolute inset-0" style={{
                background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 0, 255, 0.05) 10px, rgba(255, 0, 255, 0.05) 20px)',
              }} />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-5xl">🌐</span>
                <div>
                  <h3 
                    className="text-xl md:text-2xl font-bold neon-text-magenta mb-1"
                    style={{ fontFamily: 'var(--font-michroma)' }}
                  >
                    MULTIJUGADOR EN TIEMPO REAL
                  </h3>
                  <p className="text-sm font-mono" style={{ color: 'var(--cyber-muted)' }}>
                    Compite contra runners de todo el mundo y escala en el ranking global
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right hidden md:block">
                  <p className="text-2xl font-bold neon-text-green">247</p>
                  <p className="text-[10px] font-mono" style={{ color: 'var(--cyber-muted)' }}>JUGADORES ONLINE</p>
                </div>
                <button 
                  className="px-6 py-3 font-bold font-mono text-sm transition-all duration-300 group-hover:scale-105"
                  style={{
                    background: 'var(--neon-magenta)',
                    color: '#000',
                    clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                  }}
                >
                  JUGAR AHORA →
                </button>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}
