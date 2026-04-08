'use client'

import { useState, useEffect } from 'react'
import HeroSection from '@/components/card-game/landing/HeroSection'
import FeatureShowcase from '@/components/card-game/landing/FeatureShowcase'
import MenuGrid from '@/components/card-game/landing/MenuGrid'
import StatsCounter from '@/components/card-game/landing/StatsCounter'
import CTASection from '@/components/card-game/landing/CTASection'
import '@/styles/card-game.css'

export const dynamic = 'force-dynamic'

export default function CardGameHub() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="netrun-theme min-h-screen flex items-center justify-center" style={{ background: 'var(--cyber-bg)' }}>
        <div className="cyber-spinner" />
      </div>
    )
  }

  return (
    <div className="netrun-theme min-h-screen relative" style={{ background: 'var(--cyber-bg)' }}>
      {/* Animated background layers */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/20 via-transparent to-magenta-950/20" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 255, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }} />
        
        {/* Radial glow */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(0, 255, 255, 0.08) 0%, transparent 50%)',
        }} />
      </div>

      {/* Main content */}
      <main className="relative z-10">
        <HeroSection />
        <FeatureShowcase />
        <MenuGrid />
        <StatsCounter />
        <CTASection />
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-cyan-500/10 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs font-mono mb-2" style={{ color: 'var(--cyber-muted)' }}>
            NETRUN © 2026 - KodingVibes
          </p>
          <p className="text-[10px] font-mono" style={{ color: 'var(--cyber-muted)' }}>
            Un juego de cartas cyberpunk. Hackea. Defiende. Domina.
          </p>
        </div>
      </footer>
    </div>
  )
}
