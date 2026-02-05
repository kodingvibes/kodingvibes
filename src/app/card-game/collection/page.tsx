'use client'

import { useState } from 'react'
import { ALL_CARDS } from '@/lib/card-game/cards'
import { CardType, CardFaction, CardRarity } from '@/lib/card-game/types'
import GameCard from '@/components/card-game/GameCard'
import Link from 'next/link'
import '@/app/card-game/card-game.css'

type FilterType = 'all' | CardType
type FilterFaction = 'all' | CardFaction
type FilterRarity = 'all' | CardRarity

export default function CollectionPage() {
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterFaction, setFilterFaction] = useState<FilterFaction>('all')
  const [filterRarity, setFilterRarity] = useState<FilterRarity>('all')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  const filteredCards = ALL_CARDS.filter(card => {
    if (filterType !== 'all' && card.type !== filterType) return false
    if (filterFaction !== 'all' && card.faction !== filterFaction) return false
    if (filterRarity !== 'all' && card.rarity !== filterRarity) return false
    return true
  })

  const selectedCard = selectedCardId ? ALL_CARDS.find(c => c.id === selectedCardId) : null

  return (
    <div className="netrun-theme min-h-screen grid-pattern" style={{ background: 'var(--cyber-bg)' }}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href="/card-game"
              className="text-[10px] font-mono mb-1 block hover:underline"
              style={{ color: 'var(--cyber-muted)' }}
            >
              {'<'} VOLVER AL MENÚ
            </Link>
            <h1 className="text-2xl font-bold font-mono neon-text-cyan">
              COLECCIÓN DE CARTAS
            </h1>
            <p className="text-xs font-mono mt-1" style={{ color: 'var(--cyber-muted)' }}>
              {ALL_CARDS.length} cartas disponibles | Mostrando {filteredCards.length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 p-3 rounded-lg border border-gray-700/30 bg-black/30">
          <div>
            <label className="text-[9px] font-mono block mb-1" style={{ color: 'var(--cyber-muted)' }}>TIPO</label>
            <div className="flex gap-1">
              {(['all', 'program', 'ice', 'hardware', 'event'] as FilterType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`text-[10px] font-mono px-2 py-1 rounded transition-all ${
                    filterType === type
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      : 'bg-gray-800/50 text-gray-500 border border-gray-700/30 hover:text-gray-300'
                  }`}
                >
                  {type === 'all' ? 'TODOS' : type.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[9px] font-mono block mb-1" style={{ color: 'var(--cyber-muted)' }}>FACCIÓN</label>
            <div className="flex gap-1">
              {(['all', 'runner', 'corp', 'neutral'] as FilterFaction[]).map(faction => (
                <button
                  key={faction}
                  onClick={() => setFilterFaction(faction)}
                  className={`text-[10px] font-mono px-2 py-1 rounded transition-all ${
                    filterFaction === faction
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      : 'bg-gray-800/50 text-gray-500 border border-gray-700/30 hover:text-gray-300'
                  }`}
                >
                  {faction === 'all' ? 'TODAS' : faction.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[9px] font-mono block mb-1" style={{ color: 'var(--cyber-muted)' }}>RAREZA</label>
            <div className="flex gap-1">
              {(['all', 'common', 'uncommon', 'rare', 'legendary'] as FilterRarity[]).map(rarity => (
                <button
                  key={rarity}
                  onClick={() => setFilterRarity(rarity)}
                  className={`text-[10px] font-mono px-2 py-1 rounded transition-all ${
                    filterRarity === rarity
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      : 'bg-gray-800/50 text-gray-500 border border-gray-700/30 hover:text-gray-300'
                  }`}
                >
                  {rarity === 'all' ? 'TODAS' : rarity.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Card Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 justify-items-center">
              {filteredCards.map(card => (
                <GameCard
                  key={card.id}
                  card={card}
                  isSelected={selectedCardId === card.id}
                  onClick={() => setSelectedCardId(selectedCardId === card.id ? null : card.id)}
                />
              ))}
            </div>

            {filteredCards.length === 0 && (
              <div className="text-center py-12">
                <p className="text-lg font-mono" style={{ color: 'var(--cyber-muted)' }}>
                  No se encontraron cartas con esos filtros
                </p>
              </div>
            )}
          </div>

          {/* Card Detail Sidebar */}
          {selectedCard && (
            <div className="hidden lg:block w-72 flex-shrink-0">
              <div className="sticky top-20 rounded-lg border border-cyan-500/20 bg-black/40 p-4">
                <div className="flex justify-center mb-4">
                  <GameCard card={selectedCard} size="lg" />
                </div>

                <h3
                  className="text-lg font-bold font-mono mb-1"
                  style={{ color: selectedCard.artColors[0] }}
                >
                  {selectedCard.name}
                </h3>

                <div className="flex gap-2 mb-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                    {selectedCard.type.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">
                    {selectedCard.faction.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400">
                    {selectedCard.rarity.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono" style={{ color: 'var(--cyber-text)' }}>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--cyber-muted)' }}>RAM Cost:</span>
                    <span className="neon-text-cyan">{selectedCard.ramCost}</span>
                  </div>
                  {selectedCard.type !== 'event' && (
                    <>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--cyber-muted)' }}>Fuerza:</span>
                        <span style={{ color: '#ff4444' }}>{selectedCard.strength}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--cyber-muted)' }}>Firewall:</span>
                        <span style={{ color: '#4488ff' }}>{selectedCard.firewall}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-700/30">
                  <p className="text-xs" style={{ color: 'var(--neon-green)' }}>
                    {selectedCard.ability}
                  </p>
                </div>

                <div className="mt-3">
                  <p className="text-[10px] italic" style={{ color: 'var(--cyber-muted)' }}>
                    &ldquo;{selectedCard.flavorText}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
