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

  const handleCloseModal = () => setSelectedCardId(null)

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

        {/* Card Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4 justify-items-center">
          {filteredCards.map(card => (
            <GameCard
              key={card.id}
              card={card}
              onClick={() => setSelectedCardId(card.id)}
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

      {/* Fullscreen Modal */}
      {selectedCard && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          onClick={handleCloseModal}
        >
          <div 
            className="relative w-full h-full flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 p-4 lg:p-12"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 lg:top-8 lg:right-8 text-4xl text-gray-400 hover:text-white transition-colors z-20 bg-black/80 rounded-full w-12 h-12 flex items-center justify-center border border-gray-700"
            >
              ×
            </button>

            {/* Extra Large Card */}
            <div className="flex flex-col items-center gap-6">
              <GameCard card={selectedCard} size="xl" />

              {/* Tags */}
              <div className="flex gap-3 flex-wrap justify-center">
                <span className="text-sm font-mono px-4 py-2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  {selectedCard.type.toUpperCase()}
                </span>
                <span className="text-sm font-mono px-4 py-2 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  {selectedCard.faction.toUpperCase()}
                </span>
                <span className="text-sm font-mono px-4 py-2 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                  {selectedCard.rarity.toUpperCase()}
                </span>
              </div>

              {/* Description */}
              <div className="max-w-lg text-center">
                <p className="text-base leading-relaxed" style={{ color: 'var(--neon-green)' }}>
                  {selectedCard.ability}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}