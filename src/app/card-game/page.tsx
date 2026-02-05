'use client'

import { useEffect, useState } from 'react'
import { ALL_CARDS } from '@/lib/card-game/cards'
import GameCard from '@/components/card-game/GameCard'
import Link from 'next/link'
import './card-game.css'

const FEATURED_CARDS = ALL_CARDS.filter(c => c.rarity === 'legendary')

export default function CardGameHub() {
  const [featuredIdx, setFeaturedIdx] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => {
      setFeaturedIdx(prev => (prev + 1) % FEATURED_CARDS.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  const featuredCard = FEATURED_CARDS[featuredIdx]

  return (
    <div className="netrun-theme min-h-screen grid-pattern scanlines relative" style={{ background: 'var(--cyber-bg)' }}>
      {/* Header bar */}
      <div className="border-b border-cyan-500/10 bg-black/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-[10px] font-mono hover:underline" style={{ color: 'var(--cyber-muted)' }}>
            {'<'} KodingVibes
          </Link>
          <h1 className="text-lg font-bold font-mono tracking-widest neon-text-cyan">
            {'//'}NETRUN
          </h1>
          <div className="w-20" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero section */}
        <div className="text-center mb-12 relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold font-mono mb-4">
            <span className="neon-text-cyan">NET</span>
            <span className="neon-text-magenta">RUN</span>
          </h2>
          <p className="text-sm md:text-base font-mono max-w-lg mx-auto mb-2" style={{ color: 'var(--cyber-text)' }}>
            El juego de cartas cyberpunk de KodingVibes
          </p>
          <p className="text-xs font-mono" style={{ color: 'var(--cyber-muted)' }}>
            Hackea. Defiende. Domina la red.
          </p>

          {/* Featured card carousel */}
          {mounted && (
            <div className="flex justify-center mt-8 mb-8">
              <div className="relative">
                <GameCard card={featuredCard} size="lg" />
                <div className="absolute -inset-4 rounded-xl bg-gradient-to-r from-cyan-500/10 via-transparent to-magenta-500/10 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Featured card name */}
          <p className="text-xs font-mono font-bold" style={{ color: featuredCard?.artColors[0] }}>
            {featuredCard?.name}
          </p>
          <p className="text-[10px] font-mono italic mt-1" style={{ color: 'var(--cyber-muted)' }}>
            {featuredCard?.flavorText}
          </p>

          {/* Dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            {FEATURED_CARDS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setFeaturedIdx(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  idx === featuredIdx
                    ? 'bg-cyan-400 shadow-[0_0_5px_#00ffff]'
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {/* Play vs AI */}
          <Link href="/card-game/play" className="group">
            <div className="rounded-lg border border-cyan-500/20 bg-black/40 p-6 transition-all duration-300 hover:border-cyan-500/50 hover:bg-cyan-500/5 hover:shadow-[0_0_20px_rgba(0,255,255,0.1)]">
              <div className="text-3xl mb-3">🎮</div>
              <h3 className="text-sm font-mono font-bold neon-text-cyan mb-1">
                JUGAR vs AI
              </h3>
              <p className="text-[10px] font-mono" style={{ color: 'var(--cyber-muted)' }}>
                Enfréntate a la Corp AI en combate individual
              </p>
            </div>
          </Link>

          {/* Multiplayer */}
          <Link href="/card-game/lobby" className="group">
            <div className="rounded-lg border border-magenta-500/20 bg-black/40 p-6 transition-all duration-300 hover:border-purple-500/50 hover:bg-purple-500/5 hover:shadow-[0_0_20px_rgba(255,0,255,0.1)]" style={{ borderColor: 'rgba(255,0,255,0.2)' }}>
              <div className="text-3xl mb-3">⚔️</div>
              <h3 className="text-sm font-mono font-bold neon-text-magenta mb-1">
                MULTIJUGADOR
              </h3>
              <p className="text-[10px] font-mono" style={{ color: 'var(--cyber-muted)' }}>
                Desafía a otros runners en tiempo real
              </p>
            </div>
          </Link>

          {/* Collection */}
          <Link href="/card-game/collection" className="group">
            <div className="rounded-lg border border-green-500/20 bg-black/40 p-6 transition-all duration-300 hover:border-green-500/50 hover:bg-green-500/5 hover:shadow-[0_0_20px_rgba(0,255,65,0.1)]">
              <div className="text-3xl mb-3">🃏</div>
              <h3 className="text-sm font-mono font-bold neon-text-green mb-1">
                COLECCIÓN
              </h3>
              <p className="text-[10px] font-mono" style={{ color: 'var(--cyber-muted)' }}>
                Explora las {ALL_CARDS.length} cartas disponibles
              </p>
            </div>
          </Link>

          {/* Deck Builder */}
          <Link href="/card-game/deck-builder" className="group">
            <div className="rounded-lg border border-yellow-500/20 bg-black/40 p-6 transition-all duration-300 hover:border-yellow-500/50 hover:bg-yellow-500/5 hover:shadow-[0_0_20px_rgba(255,255,0,0.1)]">
              <div className="text-3xl mb-3">🔧</div>
              <h3 className="text-sm font-mono font-bold neon-text-yellow mb-1">
                DECK BUILDER
              </h3>
              <p className="text-[10px] font-mono" style={{ color: 'var(--cyber-muted)' }}>
                Construye y guarda tus decks personalizados
              </p>
            </div>
          </Link>

          {/* Rankings */}
          <Link href="/card-game/rankings" className="group">
            <div className="rounded-lg border border-red-500/20 bg-black/40 p-6 transition-all duration-300 hover:border-red-500/50 hover:bg-red-500/5 hover:shadow-[0_0_20px_rgba(255,0,68,0.1)]">
              <div className="text-3xl mb-3">🏆</div>
              <h3 className="text-sm font-mono font-bold neon-text-red mb-1">
                RANKINGS
              </h3>
              <p className="text-[10px] font-mono" style={{ color: 'var(--cyber-muted)' }}>
                Clasificación global y sistema ELO
              </p>
            </div>
          </Link>

          {/* How to play */}
          <div className="rounded-lg border border-gray-500/20 bg-black/40 p-6">
            <div className="text-3xl mb-3">📖</div>
            <h3 className="text-sm font-mono font-bold mb-1" style={{ color: 'var(--cyber-text)' }}>
              CÓMO JUGAR
            </h3>
            <ul className="space-y-1 text-[9px] font-mono" style={{ color: 'var(--cyber-muted)' }}>
              <li>• 20 HP de integridad del sistema</li>
              <li>• Juega cartas gastando RAM</li>
              <li>• Ataca para destruir defensas enemigas</li>
              <li>• Reduce la integridad rival a 0</li>
              <li>• 4 tipos: Program, ICE, Hardware, Event</li>
            </ul>
          </div>
        </div>

        {/* Stats footer */}
        <div className="mt-12 text-center">
          <div className="inline-flex gap-8 p-4 rounded-lg border border-gray-700/20 bg-black/20">
            <div>
              <p className="text-lg font-mono font-bold neon-text-cyan">{ALL_CARDS.length}</p>
              <p className="text-[9px] font-mono" style={{ color: 'var(--cyber-muted)' }}>CARTAS</p>
            </div>
            <div>
              <p className="text-lg font-mono font-bold neon-text-magenta">3</p>
              <p className="text-[9px] font-mono" style={{ color: 'var(--cyber-muted)' }}>FACCIONES</p>
            </div>
            <div>
              <p className="text-lg font-mono font-bold neon-text-green">4</p>
              <p className="text-[9px] font-mono" style={{ color: 'var(--cyber-muted)' }}>TIPOS</p>
            </div>
            <div>
              <p className="text-lg font-mono font-bold neon-text-yellow">5</p>
              <p className="text-[9px] font-mono" style={{ color: 'var(--cyber-muted)' }}>RANGOS</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
