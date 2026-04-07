'use client'

import { useEffect, useRef, useState } from 'react'
import { ALL_CARDS } from '@/lib/card-game/cards'

const STATS = [
  { value: ALL_CARDS.length, label: 'CARTAS', color: '#00ffff', suffix: '' },
  { value: 3, label: 'FACCIONES', color: '#ff00ff', suffix: '' },
  { value: 4, label: 'TIPOS', color: '#00ff41', suffix: '' },
  { value: 5, label: 'RANGOS', color: '#ffff00', suffix: '' },
]

export default function StatsCounter() {
  const [counts, setCounts] = useState(STATS.map(() => 0))
  const sectionRef = useRef<HTMLElement>(null)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          
          // Animate each stat with stagger
          STATS.forEach((stat, index) => {
            const duration = 1500
            const startTime = Date.now() + index * 200
            const endValue = stat.value

            const animate = () => {
              const elapsed = Date.now() - startTime
              const progress = Math.min(elapsed / duration, 1)
              
              // Easing function (ease-out-quart)
              const eased = 1 - Math.pow(1 - progress, 4)
              
              const currentValue = Math.floor(eased * endValue)
              
              setCounts(prev => {
                const newCounts = [...prev]
                newCounts[index] = currentValue
                return newCounts
              })

              if (progress < 1) {
                requestAnimationFrame(animate)
              }
            }

            requestAnimationFrame(animate)
          })
        }
      },
      { threshold: 0.3 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [hasAnimated])

  return (
    <section 
      ref={sectionRef}
      className="relative py-20 overflow-hidden"
    >
      {/* Background with card silhouettes */}
      <div className="absolute inset-0 opacity-5">
        {/* Decorative card silhouettes */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-32 h-44 rounded-lg border-2"
            style={{
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 15}%`,
              borderColor: 'var(--cyber-muted)',
              transform: `rotate(${(i % 2) * 20 - 10}deg)`,
            }}
          />
        ))}
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-magenta-950/10 to-transparent" />

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
            EL JUEGO EN <span className="neon-text-green">NÚMEROS</span>
          </h2>
          <p className="text-sm md:text-base font-mono" style={{ color: 'var(--cyber-muted)' }}>
            Una colección en constante crecimiento
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 max-w-4xl mx-auto">
          {STATS.map((stat, index) => (
            <div 
              key={index}
              className="text-center p-6 rounded-lg transition-all duration-300 hover:scale-105"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: `1px solid ${stat.color}40`,
                boxShadow: `0 0 20px ${stat.color}10`,
              }}
            >
              {/* Animated number */}
              <div 
                className="text-4xl md:text-6xl lg:text-7xl font-bold mb-2"
                style={{
                  fontFamily: 'var(--font-michroma)',
                  color: stat.color,
                  textShadow: `0 0 20px ${stat.color}60`,
                }}
              >
                {counts[index]}{stat.suffix}
              </div>
              
              {/* Label */}
              <p 
                className="text-xs md:text-sm font-mono tracking-wider"
                style={{ color: 'var(--cyber-muted)' }}
              >
                {stat.label}
              </p>

              {/* Decorative underline */}
              <div 
                className="h-1 rounded-full mt-3 mx-auto"
                style={{
                  width: '60%',
                  background: `linear-gradient(90deg, transparent, ${stat.color}, transparent)`,
                }}
              />
            </div>
          ))}
        </div>

        {/* Additional info */}
        <div className="text-center mt-12">
          <div className="inline-flex flex-wrap justify-center gap-2 md:gap-4 p-4 rounded-lg" style={{
            background: 'rgba(0, 255, 255, 0.05)',
            border: '1px solid rgba(0, 255, 255, 0.1)',
          }}>
            <span className="text-xs font-mono" style={{ color: 'var(--cyber-text)' }}>
              <span className="neon-text-cyan">✦</span> Nuevas cartas cada temporada
            </span>
            <span className="text-xs font-mono hidden md:inline" style={{ color: 'var(--cyber-muted)' }}>
              |
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--cyber-text)' }}>
              <span className="neon-text-magenta">✦</span> Balance constante
            </span>
            <span className="text-xs font-mono hidden md:inline" style={{ color: 'var(--cyber-muted)' }}>
              |
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--cyber-text)' }}>
              <span className="neon-text-green">✦</span> Meta diverso
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
