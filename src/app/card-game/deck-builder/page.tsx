'use client'

import { useState, useCallback } from 'react'
import { ALL_CARDS, getStarterDeck } from '@/lib/card-game/cards'
import { CardFaction, DeckConfig } from '@/lib/card-game/types'
import GameCard from '@/components/card-game/GameCard'
import Link from 'next/link'
import '@/app/card-game/card-game.css'

const DECK_SIZE = 20
const MAX_COPIES = 2

export default function DeckBuilderPage() {
  const [deckName, setDeckName] = useState('Mi Deck')
  const [deckFaction, setDeckFaction] = useState<CardFaction>('runner')
  const [deckCards, setDeckCards] = useState<string[]>([])
  const [savedDecks, setSavedDecks] = useState<DeckConfig[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('netrun_decks')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })

  const availableCards = ALL_CARDS.filter(
    c => c.faction === deckFaction || c.faction === 'neutral'
  )

  const cardCounts = deckCards.reduce<Record<string, number>>((acc, id) => {
    acc[id] = (acc[id] || 0) + 1
    return acc
  }, {})

  const addCard = useCallback((cardId: string) => {
    if (deckCards.length >= DECK_SIZE) return
    if ((cardCounts[cardId] || 0) >= MAX_COPIES) return
    setDeckCards(prev => [...prev, cardId])
  }, [deckCards.length, cardCounts])

  const removeCard = useCallback((cardId: string) => {
    setDeckCards(prev => {
      const idx = prev.lastIndexOf(cardId)
      if (idx === -1) return prev
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)]
    })
  }, [])

  const loadStarter = useCallback(() => {
    setDeckCards(getStarterDeck(deckFaction === 'neutral' ? 'runner' : deckFaction as 'runner' | 'corp'))
  }, [deckFaction])

  const saveDeck = useCallback(() => {
    if (deckCards.length !== DECK_SIZE) return

    const deck: DeckConfig = {
      id: `deck_${Date.now()}`,
      name: deckName,
      faction: deckFaction,
      cards: deckCards,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const updated = [...savedDecks.filter(d => d.name !== deckName), deck]
    setSavedDecks(updated)
    localStorage.setItem('netrun_decks', JSON.stringify(updated))
  }, [deckCards, deckName, deckFaction, savedDecks])

  const loadDeck = useCallback((deck: DeckConfig) => {
    setDeckName(deck.name)
    setDeckFaction(deck.faction)
    setDeckCards(deck.cards)
  }, [])

  const deleteDeck = useCallback((deckId: string) => {
    const updated = savedDecks.filter(d => d.id !== deckId)
    setSavedDecks(updated)
    localStorage.setItem('netrun_decks', JSON.stringify(updated))
  }, [savedDecks])

  // Stats
  const avgCost = deckCards.length > 0
    ? (deckCards.reduce((sum, id) => sum + (ALL_CARDS.find(c => c.id === id)?.ramCost || 0), 0) / deckCards.length).toFixed(1)
    : '0'

  const totalStrength = deckCards.reduce((sum, id) => sum + (ALL_CARDS.find(c => c.id === id)?.strength || 0), 0)
  const totalFirewall = deckCards.reduce((sum, id) => sum + (ALL_CARDS.find(c => c.id === id)?.firewall || 0), 0)

  return (
    <div className="netrun-theme min-h-screen grid-pattern" style={{ background: 'var(--cyber-bg)' }}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <Link
              href="/card-game"
              className="text-[10px] font-mono mb-1 block hover:underline"
              style={{ color: 'var(--cyber-muted)' }}
            >
              {'<'} VOLVER AL MENÚ
            </Link>
            <h1 className="text-2xl font-bold font-mono neon-text-cyan">
              CONSTRUCTOR DE DECK
            </h1>
          </div>

          <div className="flex gap-2">
            <button onClick={loadStarter} className="cyber-btn text-[10px]">
              Cargar Starter
            </button>
            <button onClick={() => setDeckCards([])} className="cyber-btn cyber-btn-red text-[10px]">
              Limpiar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Cards */}
          <div className="lg:col-span-2">
            {/* Faction selector */}
            <div className="flex gap-2 mb-4">
              {(['runner', 'corp'] as CardFaction[]).map(faction => (
                <button
                  key={faction}
                  onClick={() => { setDeckFaction(faction); setDeckCards([]) }}
                  className={`text-sm font-mono px-4 py-2 rounded transition-all ${
                    deckFaction === faction
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      : 'bg-gray-800/50 text-gray-500 border border-gray-700/30 hover:text-gray-300'
                  }`}
                >
                  {faction.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Card grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 justify-items-center">
              {availableCards.map(card => {
                const count = cardCounts[card.id] || 0
                const canAdd = deckCards.length < DECK_SIZE && count < MAX_COPIES
                return (
                  <div key={card.id} className="relative">
                    <GameCard
                      card={card}
                      onClick={() => canAdd ? addCard(card.id) : undefined}
                      isPlayable={canAdd}
                    />
                    {count > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 text-black text-[10px] font-bold flex items-center justify-center z-10">
                        {count}
                      </div>
                    )}
                    {!canAdd && count >= MAX_COPIES && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center z-5">
                        <span className="text-[10px] font-mono text-gray-400">MAX</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Deck Panel */}
          <div>
            <div className="sticky top-4 rounded-lg border border-cyan-500/20 bg-black/40 p-4">
              {/* Deck name */}
              <input
                type="text"
                value={deckName}
                onChange={e => setDeckName(e.target.value)}
                className="w-full bg-transparent border-b border-cyan-500/30 text-cyan-400 font-mono text-lg font-bold mb-3 pb-1 outline-none focus:border-cyan-400"
                placeholder="Nombre del deck..."
              />

              {/* Progress */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono" style={{ color: 'var(--cyber-muted)' }}>
                  CARTAS
                </span>
                <span className={`text-sm font-mono font-bold ${
                  deckCards.length === DECK_SIZE ? 'neon-text-green' : 'neon-text-yellow'
                }`}>
                  {deckCards.length}/{DECK_SIZE}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded bg-gray-800 mb-4">
                <div
                  className="h-full rounded transition-all duration-300"
                  style={{
                    width: `${(deckCards.length / DECK_SIZE) * 100}%`,
                    background: deckCards.length === DECK_SIZE ? 'var(--neon-green)' : 'var(--neon-cyan)',
                    boxShadow: `0 0 5px ${deckCards.length === DECK_SIZE ? 'var(--neon-green)' : 'var(--neon-cyan)'}`,
                  }}
                />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-gray-800/50 rounded p-2">
                  <p className="text-[9px] font-mono" style={{ color: 'var(--cyber-muted)' }}>AVG COST</p>
                  <p className="text-sm font-bold neon-text-cyan">{avgCost}</p>
                </div>
                <div className="bg-gray-800/50 rounded p-2">
                  <p className="text-[9px] font-mono" style={{ color: 'var(--cyber-muted)' }}>STR</p>
                  <p className="text-sm font-bold" style={{ color: '#ff4444' }}>{totalStrength}</p>
                </div>
                <div className="bg-gray-800/50 rounded p-2">
                  <p className="text-[9px] font-mono" style={{ color: 'var(--cyber-muted)' }}>FW</p>
                  <p className="text-sm font-bold" style={{ color: '#4488ff' }}>{totalFirewall}</p>
                </div>
              </div>

              {/* Deck list */}
              <div className="max-h-60 overflow-y-auto space-y-1 mb-4 pr-1">
                {Object.entries(cardCounts)
                  .sort(([a], [b]) => {
                    const cardA = ALL_CARDS.find(c => c.id === a)
                    const cardB = ALL_CARDS.find(c => c.id === b)
                    return (cardA?.ramCost || 0) - (cardB?.ramCost || 0)
                  })
                  .map(([cardId, count]) => {
                    const card = ALL_CARDS.find(c => c.id === cardId)
                    if (!card) return null
                    return (
                      <div
                        key={cardId}
                        className="flex items-center gap-2 px-2 py-1 rounded bg-gray-800/30 hover:bg-gray-800/50 transition-colors cursor-pointer group"
                        onClick={() => removeCard(cardId)}
                      >
                        <span className="text-[10px] font-mono w-4 text-center" style={{ color: 'var(--neon-cyan)' }}>
                          {card.ramCost}
                        </span>
                        <span className="text-[10px]">{card.artIcon}</span>
                        <span className="text-[11px] font-mono flex-1 truncate" style={{ color: 'var(--cyber-text)' }}>
                          {card.name}
                        </span>
                        <span className="text-[10px] font-mono" style={{ color: 'var(--cyber-muted)' }}>
                          x{count}
                        </span>
                        <span className="text-[10px] text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          ✕
                        </span>
                      </div>
                    )
                  })}
              </div>

              {/* Save button */}
              <button
                onClick={saveDeck}
                disabled={deckCards.length !== DECK_SIZE}
                className={`w-full cyber-btn cyber-btn-green text-xs py-2 ${
                  deckCards.length !== DECK_SIZE ? 'opacity-30 cursor-not-allowed' : ''
                }`}
              >
                GUARDAR DECK
              </button>

              {/* Saved decks */}
              {savedDecks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700/30">
                  <h3 className="text-[10px] font-mono mb-2" style={{ color: 'var(--cyber-muted)' }}>
                    DECKS GUARDADOS
                  </h3>
                  {savedDecks.map(deck => (
                    <div
                      key={deck.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded bg-gray-800/30 hover:bg-gray-800/50 transition-colors mb-1"
                    >
                      <span className="text-xs font-mono flex-1 truncate" style={{ color: 'var(--cyber-text)' }}>
                        {deck.name}
                      </span>
                      <span className="text-[9px]" style={{ color: 'var(--cyber-muted)' }}>
                        {deck.faction.toUpperCase()}
                      </span>
                      <button
                        onClick={() => loadDeck(deck)}
                        className="text-[9px] font-mono text-cyan-400 hover:text-cyan-300"
                      >
                        CARGAR
                      </button>
                      <button
                        onClick={() => deleteDeck(deck.id)}
                        className="text-[9px] font-mono text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
