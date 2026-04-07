'use client'

import Link from 'next/link'

export default function CTASection() {
  return (
    <section className="relative py-20 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(0, 255, 255, 0.15) 0%, transparent 70%)',
        }} />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 80% 20%, rgba(255, 0, 255, 0.1) 0%, transparent 50%)',
        }} />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: i % 2 === 0 ? '#00ffff' : '#ff00ff',
              opacity: Math.random() * 0.5 + 0.3,
              animation: `float ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
              boxShadow: `0 0 8px ${i % 2 === 0 ? 'rgba(0, 255, 255, 0.8)' : 'rgba(255, 0, 255, 0.8)'}`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main CTA */}
          <div className="mb-12">
            <h2 
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6"
              style={{
                fontFamily: 'var(--font-michroma)',
                background: 'linear-gradient(135deg, #00ffff 0%, #ffffff 30%, #ff00ff 70%, #ff0044 100%)',
                backgroundSize: '200% 200%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'gradient-shift 4s ease infinite',
                filter: 'drop-shadow(0 0 30px rgba(0, 255, 255, 0.5))',
              }}
            >
              ¿LISTO PARA HACKEAR EL SISTEMA?
            </h2>
            
            <p 
              className="text-base md:text-lg mb-8 max-w-2xl mx-auto"
              style={{ color: 'var(--cyber-text)' }}
            >
              Únete a la resistencia. Construye tu deck. Domina la red.
            </p>

            {/* Primary CTA button */}
            <Link 
              href="/card-game/play"
              className="group relative inline-block px-12 py-5 font-bold font-mono text-lg tracking-wider overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #00ffff 0%, #00ccff 100%)',
                color: '#000',
                clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
                transition: 'all 0.3s ease',
                boxShadow: '0 0 30px rgba(0, 255, 255, 0.4)',
              }}
            >
              <span className="relative z-10 flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                COMENZAR AHORA
                <span className="group-hover:translate-x-2 transition-transform duration-300">→</span>
              </span>
              
              {/* Animated shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              
              {/* Pulsing glow */}
              <div className="absolute inset-0 bg-cyan-400/20 blur-xl -z-10 animate-pulse" />
            </Link>
          </div>

          {/* Secondary options */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            <Link 
              href="/card-game/collection"
              className="group flex items-center gap-2 px-6 py-3 font-mono text-sm transition-all duration-300"
              style={{
                color: 'var(--neon-magenta)',
                border: '1px solid rgba(255, 0, 255, 0.3)',
                clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
              }}
            >
              <span>VER CARTAS</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>

            <Link 
              href="/card-game/deck-builder"
              className="group flex items-center gap-2 px-6 py-3 font-mono text-sm transition-all duration-300"
              style={{
                color: 'var(--neon-green)',
                border: '1px solid rgba(0, 255, 65, 0.3)',
                clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
              }}
            >
              <span>CREAR DECK</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>

            <Link 
              href="/card-game/lobby"
              className="group flex items-center gap-2 px-6 py-3 font-mono text-sm transition-all duration-300"
              style={{
                color: 'var(--neon-yellow)',
                border: '1px solid rgba(255, 255, 0, 0.3)',
                clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
              }}
            >
              <span>MULTIJUGADOR</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="relative mt-16">
          {/* Floating cards on sides (decorative) */}
          <div className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 opacity-30">
            <div className="w-24 h-36 rounded-lg border border-cyan-500/30" style={{
              background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.1), transparent)',
              transform: 'rotate(-15deg)',
            }} />
          </div>
          
          <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 opacity-30">
            <div className="w-24 h-36 rounded-lg border border-magenta-500/30" style={{
              background: 'linear-gradient(135deg, rgba(255, 0, 255, 0.1), transparent)',
              transform: 'rotate(15deg)',
            }} />
          </div>
        </div>
      </div>
    </section>
  )
}
