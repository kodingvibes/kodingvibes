'use client'

import { useEffect, useState } from 'react'
import { ALL_CARDS } from '@/lib/card-game/cards'
import GameCard from '@/components/card-game/GameCard'
import Link from 'next/link'

const LEGENDARY_CARDS = ALL_CARDS.filter(c => c.rarity === 'legendary').slice(0, 5)

export default function HeroSection() {
  const [mounted, setMounted] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(1280)

  useEffect(() => {
    setMounted(true)

    const handleResize = () => {
      setViewportWidth(window.innerWidth)
    }

    handleResize()

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const isMobile = viewportWidth < 640
  const isTablet = viewportWidth >= 640 && viewportWidth < 1024

  const fanConfig = isMobile
    ? { spacing: 78, rotation: 13, lift: 16, containerHeight: 230, maxWidth: 420 }
    : isTablet
      ? { spacing: 116, rotation: 17, lift: 24, containerHeight: 280, maxWidth: 760 }
      : { spacing: 168, rotation: 23, lift: 34, containerHeight: 340, maxWidth: 1120 }

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden pt-0">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/30 via-transparent to-magenta-950/30" />
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-cyan-400/60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
              boxShadow: '0 0 10px rgba(0, 255, 255, 0.6)',
            }}
          />
        ))}
        {[...Array(15)].map((_, i) => (
          <div
            key={`magenta-${i}`}
            className="absolute w-1 h-1 rounded-full bg-magenta-400/60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${4 + Math.random() * 5}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
              boxShadow: '0 0 10px rgba(255, 0, 255, 0.6)',
            }}
          />
        ))}
      </div>

      {/* Content container */}
      <div className="relative z-10 container mx-auto px-4 py-2 md:py-3">
        {/* 3D Card Fan Composition - ABOVE THE TITLE */}
        {mounted && (
          <div className="flex justify-center items-center mb-8 perspective-1000">
            <div
              className="relative flex items-end justify-center"
              style={{
                height: `${fanConfig.containerHeight}px`,
                width: '100%',
                maxWidth: `${fanConfig.maxWidth}px`,
              }}
            >
              {LEGENDARY_CARDS.map((card, index) => {
                const totalCards = LEGENDARY_CARDS.length
                const offset = index - Math.floor(totalCards / 2)
                const rotation = offset * fanConfig.rotation
                const translateX = offset * fanConfig.spacing
                const translateY = Math.abs(offset) * fanConfig.lift
                const zIndex = Math.abs(offset)
                const scale = 1 - Math.abs(offset) * (isMobile ? 0.07 : 0.05)

                return (
                  <div
                    key={card.id}
                    className="absolute transition-all duration-500 ease-out"
                    style={{
                      transform: `
                        translateX(${translateX}px)
                        translateY(${translateY}px)
                        rotate(${rotation}deg)
                        scale(${scale})
                      `,
                      zIndex: 10 - zIndex,
                    }}
                  >
                    <div
                      style={{
                        animation: `card-float ${3 + Math.abs(offset) * 0.3}s ease-in-out infinite`,
                        animationDelay: `${Math.abs(offset) * 0.15}s`,
                      }}
                    >
                      <GameCard card={card} size="md" />
                      {/* Glow effect behind each card */}
                      <div 
                        className="absolute inset-0 rounded-xl blur-2xl -z-10"
                        style={{
                          background: `radial-gradient(ellipse at center, ${card.artColors[0]}60 0%, transparent 70%)`,
                          transform: 'scale(1.15)',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Main title - BELOW THE CARDS */}
        <div className="text-center mb-8">
          <h1 
            className="text-5xl md:text-7xl lg:text-8xl font-bold mb-4 tracking-wider"
            style={{
              fontFamily: 'var(--font-michroma)',
              background: 'linear-gradient(135deg, #00ffff 0%, #ffffff 50%, #ff00ff 100%)',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'gradient-shift 3s ease infinite',
              filter: 'drop-shadow(0 0 30px rgba(0, 255, 255, 0.6))',
            }}
          >
            NETRUN
          </h1>
          <p 
            className="text-lg md:text-xl lg:text-2xl font-medium mb-2"
            style={{ 
              color: 'var(--cyber-text)',
              textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
            }}
          >
            El juego de cartas cyberpunk definitivo
          </p>
          <p 
            className="text-sm md:text-base font-mono"
            style={{ color: 'var(--cyber-muted)' }}
          >
            Hackea. Defiende. Domina la red.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <Link 
            href="/card-game/play"
            className="group relative px-8 py-4 font-bold font-mono text-lg tracking-wider overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #00ffff 0%, #00ccff 100%)',
              color: '#000',
              clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
              transition: 'all 0.3s ease',
              boxShadow: '0 0 20px rgba(0, 255, 255, 0.4)',
            }}
          >
            <span className="relative z-10 flex items-center gap-2">
              JUGAR GRATIS
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </Link>

          <Link 
            href="/card-game/collection"
            className="group px-8 py-4 font-bold font-mono text-lg tracking-wider border-2 transition-all duration-300"
            style={{
              borderColor: 'var(--neon-magenta)',
              color: 'var(--neon-magenta)',
              clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
              boxShadow: '0 0 15px rgba(255, 0, 255, 0.3)',
            }}
          >
            <span className="flex items-center gap-2">
              VER COLECCIÓN
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </Link>
        </div>

        {/* Social proof */}
        <div className="text-center">
          <p className="text-xs font-mono" style={{ color: 'var(--cyber-muted)' }}>
            Únete a <span className="neon-text-cyan font-bold">10,000+ runners</span> activos
          </p>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 rounded-full flex justify-center pt-2" style={{ borderColor: 'var(--cyber-muted)' }}>
          <div className="w-1 h-2 rounded-full bg-cyan-400 animate-pulse" />
        </div>
      </div>
    </section>
  )
}
