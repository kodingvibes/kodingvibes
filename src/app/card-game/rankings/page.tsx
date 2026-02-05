'use client'

import { useState, useEffect } from 'react'
import { PlayerRanking, getRankDisplayName, getRankColor } from '@/lib/card-game/types'
import { getLeaderboard } from '@/lib/card-game/multiplayer'
import Link from 'next/link'
import '@/app/card-game/card-game.css'

// Demo leaderboard data for when Supabase tables aren't set up yet
const DEMO_LEADERBOARD: PlayerRanking[] = [
  { userId: '1', username: 'Phantom_0x', elo: 2150, wins: 89, losses: 23, streak: 7, rank: 'ghost_in_the_machine' },
  { userId: '2', username: 'NullByte', elo: 1850, wins: 67, losses: 31, streak: 4, rank: 'elite_runner' },
  { userId: '3', username: 'Rogue_AI', elo: 1720, wins: 55, losses: 28, streak: -2, rank: 'elite_runner' },
  { userId: '4', username: 'DarkFlow', elo: 1580, wins: 48, losses: 35, streak: 3, rank: 'netrunner' },
  { userId: '5', username: 'CyberVoid', elo: 1490, wins: 42, losses: 33, streak: 1, rank: 'netrunner' },
  { userId: '6', username: 'Glitch_Runner', elo: 1350, wins: 38, losses: 30, streak: -1, rank: 'netrunner' },
  { userId: '7', username: 'ByteStorm', elo: 1200, wins: 25, losses: 22, streak: 2, rank: 'hacker' },
  { userId: '8', username: 'ShadowLink', elo: 1100, wins: 20, losses: 18, streak: -3, rank: 'hacker' },
  { userId: '9', username: 'Neo_Hack', elo: 980, wins: 15, losses: 20, streak: -2, rank: 'script_kiddie' },
  { userId: '10', username: 'Data_Punk', elo: 870, wins: 10, losses: 16, streak: 1, rank: 'script_kiddie' },
]

function getRankIcon(rank: string): string {
  switch (rank) {
    case 'ghost_in_the_machine': return '👻'
    case 'elite_runner': return '💎'
    case 'netrunner': return '🔷'
    case 'hacker': return '💚'
    case 'script_kiddie': return '📟'
    default: return '❓'
  }
}

export default function RankingsPage() {
  const [leaderboard, setLeaderboard] = useState<PlayerRanking[]>(DEMO_LEADERBOARD)
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await getLeaderboard()
        if (data.length > 0) {
          setLeaderboard(data)
        }
      } catch {
        // Keep demo data on error
      }
    }
    fetchLeaderboard()
  }, [])

  return (
    <div className="netrun-theme min-h-screen grid-pattern" style={{ background: 'var(--cyber-bg)' }}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Link
          href="/card-game"
          className="text-[10px] font-mono mb-4 block hover:underline"
          style={{ color: 'var(--cyber-muted)' }}
        >
          {'<'} VOLVER AL MENÚ
        </Link>

        <h1 className="text-2xl font-bold font-mono neon-text-cyan mb-2">
          RANKINGS GLOBALES
        </h1>
        <p className="text-xs font-mono mb-8" style={{ color: 'var(--cyber-muted)' }}>
          Los mejores NetRunners de la red
        </p>

        {/* Rank tiers */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-8">
          {[
            { rank: 'ghost_in_the_machine', label: 'Ghost', elo: '2000+' },
            { rank: 'elite_runner', label: 'Elite', elo: '1600-1999' },
            { rank: 'netrunner', label: 'Netrunner', elo: '1300-1599' },
            { rank: 'hacker', label: 'Hacker', elo: '1000-1299' },
            { rank: 'script_kiddie', label: 'Kiddie', elo: '<1000' },
          ].map(tier => (
            <div
              key={tier.rank}
              className="p-2 rounded border border-gray-700/30 bg-black/30 text-center"
            >
              <p className="text-lg">{getRankIcon(tier.rank)}</p>
              <p className="text-[10px] font-mono font-bold" style={{ color: getRankColor(tier.rank as PlayerRanking['rank']) }}>
                {tier.label}
              </p>
              <p className="text-[9px] font-mono" style={{ color: 'var(--cyber-muted)' }}>
                {tier.elo} ELO
              </p>
            </div>
          ))}
        </div>

        {/* Leaderboard table */}
        <div className="rounded-lg border border-cyan-500/20 bg-black/40 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 p-3 border-b border-gray-700/30 text-[10px] font-mono font-bold" style={{ color: 'var(--cyber-muted)' }}>
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-4">RUNNER</div>
            <div className="col-span-2 text-center">ELO</div>
            <div className="col-span-2 text-center">W/L</div>
            <div className="col-span-1 text-center">%</div>
            <div className="col-span-2 text-center">RACHA</div>
          </div>

          {/* Rows */}
          {leaderboard.map((player, idx) => {
            const winRate = player.wins + player.losses > 0
              ? Math.round((player.wins / (player.wins + player.losses)) * 100)
              : 0
            const rankColor = getRankColor(player.rank)

            return (
              <div
                key={player.userId}
                className={`grid grid-cols-12 gap-2 p-3 items-center transition-colors hover:bg-white/5 ${
                  idx === 0 ? 'bg-yellow-500/5' : idx === 1 ? 'bg-gray-300/5' : idx === 2 ? 'bg-orange-500/5' : ''
                }`}
              >
                {/* Position */}
                <div className="col-span-1 text-center">
                  <span className={`text-sm font-mono font-bold ${
                    idx === 0 ? 'neon-text-yellow' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-orange-400' : ''
                  }`} style={idx > 2 ? { color: 'var(--cyber-muted)' } : undefined}>
                    {idx + 1}
                  </span>
                </div>

                {/* Player */}
                <div className="col-span-4 flex items-center gap-2 min-w-0">
                  <span className="text-sm flex-shrink-0">{getRankIcon(player.rank)}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-bold truncate" style={{ color: 'var(--cyber-text)' }}>
                      {player.username}
                    </p>
                    <p className="text-[9px] font-mono" style={{ color: rankColor }}>
                      {getRankDisplayName(player.rank)}
                    </p>
                  </div>
                </div>

                {/* ELO */}
                <div className="col-span-2 text-center">
                  <span className="text-sm font-mono font-bold" style={{ color: rankColor }}>
                    {player.elo}
                  </span>
                </div>

                {/* W/L */}
                <div className="col-span-2 text-center">
                  <span className="text-xs font-mono">
                    <span className="text-green-400">{player.wins}</span>
                    <span style={{ color: 'var(--cyber-muted)' }}>/</span>
                    <span className="text-red-400">{player.losses}</span>
                  </span>
                </div>

                {/* Win % */}
                <div className="col-span-1 text-center">
                  <span className={`text-[10px] font-mono ${winRate >= 60 ? 'text-green-400' : winRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {winRate}%
                  </span>
                </div>

                {/* Streak */}
                <div className="col-span-2 text-center">
                  <span className={`text-xs font-mono font-bold ${
                    player.streak > 0 ? 'text-green-400' : player.streak < 0 ? 'text-red-400' : ''
                  }`} style={player.streak === 0 ? { color: 'var(--cyber-muted)' } : undefined}>
                    {player.streak > 0 ? `🔥 ${player.streak}` : player.streak < 0 ? `❄️ ${Math.abs(player.streak)}` : '-'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 rounded-lg border border-gray-700/20 bg-black/20">
          <h3 className="text-xs font-mono font-bold neon-text-green mb-2">SISTEMA ELO</h3>
          <ul className="space-y-1 text-[10px] font-mono" style={{ color: 'var(--cyber-muted)' }}>
            <li>• Todos los jugadores comienzan con 1000 ELO</li>
            <li>• Las victorias contra rivales de mayor ELO dan más puntos</li>
            <li>• Factor K = 32 (variación moderada por partida)</li>
            <li>• El rango se actualiza automáticamente según tu ELO</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
