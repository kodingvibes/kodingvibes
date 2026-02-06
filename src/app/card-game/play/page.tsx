'use client'

import { useState, useMemo } from 'react'
import { createInitialGameState } from '@/lib/card-game/engine'
import { getStarterDeck } from '@/lib/card-game/cards'
import { DeckConfig } from '@/lib/card-game/types'
import GameBoard from '@/components/card-game/GameBoard'
import Link from 'next/link'
import '@/app/card-game/card-game.css'

export default function PlayPage() {
  const [started, setStarted] = useState(false)
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)

  const savedDecks: DeckConfig[] = useMemo(() => {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem('netrun_decks')
    return saved ? JSON.parse(saved) : []
  }, [])

  const startGame = () => {
    setStarted(true)
  }

  const playerDeck = useMemo(() => {
    if (selectedDeckId) {
      const deck = savedDecks.find(d => d.id === selectedDeckId)
      if (deck) return deck.cards
    }
    return getStarterDeck('runner')
  }, [selectedDeckId, savedDecks])

  const opponentDeck = useMemo(() => getStarterDeck('corp'), [])

  const initialState = useMemo(
    () => createInitialGameState(playerDeck, opponentDeck),
    [playerDeck, opponentDeck]
  )

  if (started) {
    return <GameBoard initialState={initialState} />
  }

  return (
    <div className="netrun-theme min-h-screen grid-pattern flex items-center justify-center" style={{ background: 'var(--cyber-bg)' }}>
      <div className="max-w-md w-full mx-4">
        <div className="rounded-lg border border-cyan-500/20 bg-black/60 p-6 backdrop-blur-sm">
          <Link
            href="/card-game"
            className="text-[10px] font-mono mb-4 block hover:underline"
            style={{ color: 'var(--cyber-muted)' }}
          >
            {'<'} VOLVER AL MENÚ
          </Link>

          <h1 className="text-2xl font-bold font-mono neon-text-cyan mb-2">
            PARTIDA vs AI
          </h1>
          <p className="text-xs font-mono mb-6" style={{ color: 'var(--cyber-muted)' }}>
            Enfréntate a la Corp AI con tu deck
          </p>

          {/* Deck selection */}
          <div className="mb-6">
            <label className="text-[10px] font-mono block mb-2" style={{ color: 'var(--cyber-muted)' }}>
              SELECCIONA TU DECK
            </label>

            <button
              onClick={() => setSelectedDeckId(null)}
              className={`w-full text-left px-3 py-2 rounded mb-2 transition-all text-xs font-mono ${
                selectedDeckId === null
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-gray-800/50 text-gray-400 border border-gray-700/30 hover:text-gray-300'
              }`}
            >
              ⚡ Deck Starter (Runner)
            </button>

            {savedDecks.map(deck => (
              <button
                key={deck.id}
                onClick={() => setSelectedDeckId(deck.id)}
                className={`w-full text-left px-3 py-2 rounded mb-2 transition-all text-xs font-mono ${
                  selectedDeckId === deck.id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                    : 'bg-gray-800/50 text-gray-400 border border-gray-700/30 hover:text-gray-300'
                }`}
              >
                🎴 {deck.name} ({deck.faction.toUpperCase()})
              </button>
            ))}

            {savedDecks.length === 0 && (
              <p className="text-[10px] font-mono" style={{ color: 'var(--cyber-muted)' }}>
                No tienes decks guardados.{' '}
                <Link href="/card-game/deck-builder" className="text-cyan-400 hover:underline">
                  Crea uno
                </Link>
              </p>
            )}
          </div>

          {/* Difficulty info */}
          <div className="mb-6 p-3 rounded bg-gray-800/30 border border-gray-700/20">
            <p className="text-[10px] font-mono neon-text-yellow mb-1">OPONENTE</p>
            <p className="text-xs font-mono" style={{ color: 'var(--cyber-text)' }}>
              Corp AI - Dificultad Media
            </p>
            <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--cyber-muted)' }}>
              Deck: Corp Starter (20 cartas)
            </p>
          </div>

          {/* Game rules summary */}
          <div className="mb-6 p-3 rounded bg-gray-800/30 border border-gray-700/20">
            <p className="text-[10px] font-mono neon-text-green mb-2">REGLAS RÁPIDAS</p>
            <ul className="space-y-1 text-[10px] font-mono" style={{ color: 'var(--cyber-muted)' }}>
              <li>• Reduce la integridad del oponente a 0 para ganar</li>
              <li>• Juega cartas gastando RAM (se recarga cada turno)</li>
              <li>• Las cartas no pueden atacar el turno que se juegan</li>
              <li>• Debes destruir las defensas antes de atacar directamente</li>
              <li>• Cada carta tiene fuerza (ataque) y firewall (defensa)</li>
            </ul>
          </div>

          <button
            onClick={startGame}
            className="cyber-btn cyber-btn-green w-full text-sm py-3 font-bold"
          >
            ▶ INICIAR PARTIDA
          </button>
        </div>
      </div>
    </div>
  )
}
