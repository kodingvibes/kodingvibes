'use client'

import { useState, useMemo, useEffect } from 'react'
import { createInitialGameState } from '@/lib/card-game/engine'
import { getStarterDeck } from '@/lib/card-game/cards'
import { DeckConfig } from '@/lib/card-game/types'
import GameBoard from '@/components/card-game/GameBoard'
import Link from 'next/link'
import '@/styles/card-game.css'

export const dynamic = 'force-dynamic'

export default function PlayPage() {
  const [started, setStarted] = useState(false)
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [savedDecks, setSavedDecks] = useState<DeckConfig[]>([])

  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem('netrun_decks')
      setSavedDecks(saved ? JSON.parse(saved) : [])
    } catch {
      setSavedDecks([])
    }
  }, [])

  const startGame = () => {
    console.log('Starting game...')
    console.log('Player deck:', playerDeck.length, 'cards')
    console.log('Opponent deck:', opponentDeck.length, 'cards')
    try {
      const state = createInitialGameState(playerDeck, opponentDeck)
      console.log('Game state created:', state)
      setStarted(true)
    } catch (error) {
      console.error('Error creating game state:', error)
    }
  }

  const playerDeck = useMemo(() => {
    if (selectedDeckId) {
      const deck = savedDecks.find(d => d.id === selectedDeckId)
      if (deck) return deck.cards
    }
    return getStarterDeck('runner')
  }, [selectedDeckId, savedDecks])

  const opponentDeck = useMemo(() => getStarterDeck('corp'), [])

  const particles = useMemo(() => {
    if (!mounted) return []
    return [...Array(30)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: `${3 + Math.random() * 4}s`,
      delay: `${Math.random() * 2}s`,
    }))
  }, [mounted])

  const initialState = useMemo(
    () => createInitialGameState(playerDeck, opponentDeck),
    [playerDeck, opponentDeck]
  )

  if (started) {
    return <GameBoard initialState={initialState} />
  }

  return (
    <div className="netrun-theme min-h-screen relative overflow-hidden" style={{ background: 'var(--cyber-bg)' }}>
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/20 via-transparent to-magenta-950/20" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 255, 255, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 255, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
        {/* Floating particles (client-only to avoid hydration mismatch) */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute w-1 h-1 rounded-full bg-cyan-400/40"
            style={{
              left: p.left,
              top: p.top,
              animation: `float ${p.duration} ease-in-out infinite`,
              animationDelay: p.delay,
              boxShadow: '0 0 8px rgba(0, 255, 255, 0.5)',
            }}
          />
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center py-8">
        <div className="max-w-lg w-full mx-4">
          <div
            className="rounded-xl p-6 md:p-8 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0.6) 100%)',
              border: '2px solid rgba(0, 255, 255, 0.3)',
              boxShadow: '0 0 40px rgba(0, 255, 255, 0.15), inset 0 0 60px rgba(0, 255, 255, 0.05)',
            }}
          >
            {/* Content */}
            <div className="relative z-10">
              <Link
                href="/card-game"
                className="text-[10px] font-mono mb-4 block hover:underline inline-flex items-center gap-1 group"
                style={{ color: 'var(--cyber-muted)' }}
              >
                <span className="group-hover:-translate-x-1 transition-transform">←</span> VOLVER AL MENÚ
              </Link>

              <h1
                className="text-3xl md:text-4xl font-bold font-mono mb-2"
                style={{
                  fontFamily: 'var(--font-michroma)',
                  background: 'linear-gradient(135deg, #00ffff 0%, #ffffff 50%, #00ff41 100%)',
                  backgroundSize: '200% 200%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'gradient-shift 3s ease infinite',
                  filter: 'drop-shadow(0 0 20px rgba(0, 255, 255, 0.5))',
                }}
              >
                ⚡ PARTIDA vs AI
              </h1>
              <p className="text-sm font-mono mb-6" style={{ color: 'var(--cyber-muted)' }}>
                Enfréntate a la Corp AI y demuestra tu habilidad
              </p>

              {/* Deck selection */}
              <div className="mb-6">
                <label className="text-[10px] font-mono block mb-3" style={{ color: 'var(--neon-cyan)', textShadow: '0 0 5px var(--neon-cyan)' }}>
                  {'>'} SELECCIONA TU DECK
                </label>

                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedDeckId(null)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 text-xs font-mono relative overflow-hidden group ${
                      selectedDeckId === null ? 'scale-[1.02]' : 'hover:scale-[1.01]'
                    }`}
                    style={{
                      background: selectedDeckId === null
                        ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 100, 100, 0.3))'
                        : 'rgba(0, 0, 0, 0.4)',
                      border: selectedDeckId === null
                        ? '2px solid var(--neon-cyan)'
                        : '1px solid rgba(100, 100, 100, 0.3)',
                      boxShadow: selectedDeckId === null
                        ? '0 0 20px rgba(0, 255, 255, 0.3), inset 0 0 10px rgba(0, 255, 255, 0.05)'
                        : 'none',
                      color: selectedDeckId === null ? 'var(--neon-cyan)' : 'var(--cyber-muted)',
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-between">
                      <span>⚡ Deck Starter (Runner)</span>
                      {selectedDeckId === null && <span className="text-xs">✓</span>}
                    </span>
                  </button>

                  {savedDecks.map(deck => (
                    <button
                      key={deck.id}
                      onClick={() => setSelectedDeckId(deck.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 text-xs font-mono relative overflow-hidden group ${
                        selectedDeckId === deck.id ? 'scale-[1.02]' : 'hover:scale-[1.01]'
                      }`}
                      style={{
                        background: selectedDeckId === deck.id
                          ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 100, 100, 0.3))'
                          : 'rgba(0, 0, 0, 0.4)',
                        border: selectedDeckId === deck.id
                          ? '2px solid var(--neon-cyan)'
                          : '1px solid rgba(100, 100, 100, 0.3)',
                        boxShadow: selectedDeckId === deck.id
                          ? '0 0 20px rgba(0, 255, 255, 0.3), inset 0 0 10px rgba(0, 255, 255, 0.05)'
                          : 'none',
                        color: selectedDeckId === deck.id ? 'var(--neon-cyan)' : 'var(--cyber-muted)',
                      }}
                    >
                      <span className="relative z-10 flex items-center justify-between">
                        <span>🎴 {deck.name} ({deck.faction.toUpperCase()})</span>
                        {selectedDeckId === deck.id && <span className="text-xs">✓</span>}
                      </span>
                    </button>
                  ))}
                </div>

                {savedDecks.length === 0 && (
                  <p className="text-[10px] font-mono mt-3" style={{ color: 'var(--cyber-muted)' }}>
                    No tienes decks guardados.{' '}
                    <Link href="/card-game/deck-builder" className="text-cyan-400 hover:underline">
                      Crea uno
                    </Link>
                  </p>
                )}
              </div>

              {/* Opponent info */}
              <div
                className="mb-6 p-4 rounded-lg border-l-4"
                style={{
                  background: 'rgba(255, 136, 0, 0.05)',
                  borderLeftColor: 'var(--neon-orange)',
                  borderColor: 'rgba(255, 136, 0, 0.3)',
                }}
              >
                <p className="text-[10px] font-mono mb-1" style={{ color: 'var(--neon-orange)', textShadow: '0 0 5px var(--neon-orange)' }}>
                  {'>'} OPONENTE DETECTADO
                </p>
                <p className="text-sm font-mono" style={{ color: 'var(--cyber-text)' }}>
                  Corp AI - Dificultad Media
                </p>
                <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--cyber-muted)' }}>
                  Deck: Corp Starter (20 cartas)
                </p>
              </div>

              {/* Game rules summary */}
              <div
                className="mb-6 p-4 rounded-lg"
                style={{
                  background: 'rgba(0, 255, 65, 0.05)',
                  border: '1px solid rgba(0, 255, 65, 0.2)',
                }}
              >
                <p className="text-[10px] font-mono mb-2" style={{ color: 'var(--neon-green)', textShadow: '0 0 5px var(--neon-green)' }}>
                  {'>'} REGLAS RÁPIDAS
                </p>
                <ul className="space-y-1 text-[10px] font-mono" style={{ color: 'var(--cyber-muted)' }}>
                  <li>• Reduce la integridad del oponente a 0 para ganar</li>
                  <li>• Juega cartas gastando RAM (se recarga cada turno)</li>
                  <li>• Comienzas con 1 RAM y aumenta +1 por turno (máx. 10)</li>
                  <li>• Las cartas no pueden atacar el turno que se juegan</li>
                  <li>• Destruye defensas antes de atacar directamente</li>
                </ul>
              </div>

              <button
                onClick={startGame}
                className="cyber-btn cyber-btn-green w-full text-base py-4 font-bold relative overflow-hidden group"
                style={{
                  clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
                  boxShadow: '0 0 30px rgba(0, 255, 65, 0.4)',
                  zIndex: 50,
                  cursor: 'pointer',
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2 pointer-events-none">
                  <span className="group-hover:rotate-12 transition-transform">⚡</span>
                  INICIAR PARTIDA
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </span>
                {/* Animated shine */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
