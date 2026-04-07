'use client'

import { useState } from 'react'
import { ALL_CARDS } from '@/lib/card-game/cards'
import GameCard from '@/components/card-game/GameCard'

const FEATURED_CARDS = {
  program: ALL_CARDS.find(c => c.type === 'program' && c.rarity === 'rare') || ALL_CARDS.find(c => c.type === 'program'),
  ice: ALL_CARDS.find(c => c.type === 'ice') || ALL_CARDS.find(c => c.faction === 'corp'),
  hardware: ALL_CARDS.find(c => c.type === 'hardware') || ALL_CARDS.find(c => c.rarity === 'uncommon'),
  event: ALL_CARDS.find(c => c.type === 'event' && c.rarity === 'legendary') || ALL_CARDS.find(c => c.type === 'event'),
}

const FEATURES = {
  program: {
    title: 'PROGRAMAS',
    subtitle: 'Tu arsenal de hacks',
    description: 'Infecta sistemas, roba datos y debilita las defensas enemigas con programas maliciosos.',
    icon: '💻',
    color: '#00ffff',
    stats: { attack: 'Alto', defense: 'Medio', cost: 'Variable' },
  },
  ice: {
    title: 'ICE',
    subtitle: 'Defensas corporativas',
    description: 'Barreras de seguridad que protegen tu sistema. Cuanto más fuerte, más difícil de penetrar.',
    icon: '🛡️',
    color: '#ff8800',
    stats: { attack: 'Bajo', defense: 'Alto', cost: 'Alto' },
  },
  hardware: {
    title: 'HARDWARE',
    subtitle: 'Mejoras permanentes',
    description: 'Equipamiento que permanece en el campo y proporciona ventajas continuas.',
    icon: '🔧',
    color: '#00ff41',
    stats: { attack: 'Variable', defense: 'Variable', cost: 'Medio' },
  },
  event: {
    title: 'EVENTOS',
    subtitle: 'Acciones instantáneas',
    description: 'Efectos poderosos de un solo uso que pueden cambiar el rumbo de la partida.',
    icon: '⚡',
    color: '#ff00ff',
    stats: { attack: 'Variable', defense: 'N/A', cost: 'Bajo' },
  },
}

type CardType = 'program' | 'ice' | 'hardware' | 'event'

export default function FeatureShowcase() {
  const [activeTab, setActiveTab] = useState<CardType>('program')

  return (
    <section className="relative py-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-950/10 to-transparent" />
      
      <div className="relative z-10 container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 
            className="text-3xl md:text-5xl font-bold mb-4"
            style={{ 
              fontFamily: 'var(--font-michroma)',
              color: 'var(--cyber-text)',
            }}
          >
            DOMINA LOS <span className="neon-text-cyan">4 TIPOS</span> DE CARTAS
          </h2>
          <p className="text-sm md:text-base font-mono" style={{ color: 'var(--cyber-muted)' }}>
            Cada tipo tiene un propósito estratégico único
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {(Object.keys(FEATURES) as CardType[]).map((type) => {
            const isActive = activeTab === type
            const feature = FEATURES[type]
            return (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`px-6 py-3 font-mono font-bold text-sm md:text-base transition-all duration-300 ${
                  isActive ? 'scale-105' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  background: isActive ? `${feature.color}20` : 'transparent',
                  border: `2px solid ${isActive ? feature.color : 'var(--cyber-border)'}`,
                  color: isActive ? feature.color : 'var(--cyber-muted)',
                  clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                  boxShadow: isActive ? `0 0 20px ${feature.color}40` : 'none',
                }}
              >
                <span className="flex items-center gap-2">
                  {feature.icon} {feature.title}
                </span>
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="grid lg:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
          {/* Card display */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              {FEATURED_CARDS[activeTab] && (
                <>
                  <GameCard card={FEATURED_CARDS[activeTab]!} size="xl" />
                  {/* Animated glow */}
                  <div 
                    className="absolute inset-0 rounded-2xl blur-2xl -z-10 opacity-50 animate-pulse"
                    style={{
                      background: `radial-gradient(ellipse at center, ${FEATURES[activeTab].color}60 0%, transparent 70%)`,
                      transform: 'scale(1.15)',
                    }}
                  />
                </>
              )}
            </div>
          </div>

          {/* Info panel */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">{FEATURES[activeTab].icon}</span>
                <h3 
                  className="text-2xl md:text-3xl font-bold"
                  style={{ 
                    fontFamily: 'var(--font-michroma)',
                    color: FEATURES[activeTab].color,
                  }}
                >
                  {FEATURES[activeTab].title}
                </h3>
              </div>
              <p 
                className="text-sm font-mono mb-4"
                style={{ color: FEATURES[activeTab].color }}
              >
                {FEATURES[activeTab].subtitle}
              </p>
              <p className="text-base text-gray-300 leading-relaxed">
                {FEATURES[activeTab].description}
              </p>
            </div>

            {/* Stats */}
            <div className="space-y-3 p-4 rounded-lg" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono" style={{ color: 'var(--cyber-muted)' }}>ATAQUE</span>
                <span className="font-bold" style={{ color: '#ff4444' }}>{FEATURES[activeTab].stats.attack}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono" style={{ color: 'var(--cyber-muted)' }}>DEFENSA</span>
                <span className="font-bold" style={{ color: '#4488ff' }}>{FEATURES[activeTab].stats.defense}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono" style={{ color: 'var(--cyber-muted)' }}>COSTE RAM</span>
                <span className="font-bold neon-text-cyan">{FEATURES[activeTab].stats.cost}</span>
              </div>
            </div>

            {/* Quick tips */}
            <div className="p-4 rounded-lg border-l-4" style={{ 
              background: 'rgba(0, 255, 255, 0.05)',
              borderLeftColor: FEATURES[activeTab].color,
            }}>
              <p className="text-xs font-mono" style={{ color: 'var(--cyber-text)' }}>
                <span className="font-bold neon-text-cyan">TIP:</span> Usa programas para atacar, ICE para defenderte, 
                hardware para ventajas duraderas y eventos para momentos críticos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
