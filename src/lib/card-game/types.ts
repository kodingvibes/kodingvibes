// ============================================
// NetRun - Cyberpunk Card Game Types
// ============================================

export type CardRarity = 'common' | 'uncommon' | 'rare' | 'legendary'
export type CardType = 'program' | 'ice' | 'hardware' | 'event'
export type CardFaction = 'runner' | 'corp' | 'neutral'

export interface CardDefinition {
  id: string
  name: string
  type: CardType
  faction: CardFaction
  rarity: CardRarity
  strength: number
  firewall: number
  ramCost: number
  ability: string
  abilityEffect?: AbilityEffect
  abilityEffects?: AbilityEffect[] // multiple effects for compound abilities
  flavorText: string
  artColors: [string, string] // gradient colors for CSS art
  artIcon: string // emoji or icon identifier
}

export interface CardInstance {
  instanceId: string
  definition: CardDefinition
  currentStrength: number
  currentFirewall: number
  isExhausted: boolean // already attacked this turn
  buffs: Buff[]
}

export interface Buff {
  type: 'strength' | 'firewall' | 'shield' | 'poison'
  value: number
  turnsRemaining: number | null // null = permanent
}

export type AbilityEffect = {
  type: 'on_play' | 'on_attack' | 'on_defend' | 'passive' | 'on_death'
  effect:
    | { action: 'damage_opponent'; value: number }
    | { action: 'heal_player'; value: number }
    | { action: 'draw_cards'; value: number }
    | { action: 'buff_self'; stat: 'strength' | 'firewall'; value: number }
    | { action: 'buff_all_allies'; stat: 'strength' | 'firewall'; value: number }
    | { action: 'debuff_enemy'; stat: 'strength' | 'firewall'; value: number }
    | { action: 'destroy_random_enemy' }
    | { action: 'gain_ram'; value: number }
    | { action: 'steal_ram'; value: number }
    | { action: 'shield'; value: number }
    | { action: 'pierce' } // ignore firewall
    | { action: 'double_strike' } // attack twice
    | { action: 'drain'; value: number } // damage + heal
}

// Game state
export type GamePhase = 'draw' | 'main' | 'combat' | 'end' | 'game_over'
export type PlayerSide = 'player' | 'opponent'

export interface PlayerState {
  systemIntegrity: number // HP, starts at 20
  maxRam: number // increases each turn
  currentRam: number
  hand: CardInstance[]
  field: CardInstance[] // cards on the board (max 5)
  deck: CardInstance[]
  graveyard: CardInstance[]
  shield: number // absorbs damage
}

export interface GameState {
  id: string
  phase: GamePhase
  turn: number
  activePlayer: PlayerSide
  player: PlayerState
  opponent: PlayerState
  combatLog: CombatLogEntry[]
  winner: PlayerSide | null
  isMultiplayer: boolean
  animatingAction: GameAction | null
}

export interface CombatLogEntry {
  turn: number
  message: string
  type: 'attack' | 'ability' | 'play' | 'damage' | 'heal' | 'info' | 'system'
}

// Game actions
export type GameAction =
  | { type: 'play_card'; cardInstanceId: string; playerSide: PlayerSide }
  | { type: 'attack'; attackerInstanceId: string; targetInstanceId: string | null; playerSide: PlayerSide }
  | { type: 'end_turn'; playerSide: PlayerSide }
  | { type: 'draw_card'; playerSide: PlayerSide }
  | { type: 'direct_attack'; attackerInstanceId: string; playerSide: PlayerSide }

// Deck building
export interface DeckConfig {
  id: string
  name: string
  faction: CardFaction
  cards: string[] // card definition IDs (20 cards)
  createdAt: string
  updatedAt: string
}

// Multiplayer
export type LobbyStatus = 'waiting' | 'ready' | 'playing' | 'finished'

export interface LobbyRoom {
  id: string
  hostId: string
  hostName: string
  guestId: string | null
  guestName: string | null
  status: LobbyStatus
  hostDeckId: string
  guestDeckId: string | null
  createdAt: string
}

export interface MultiplayerGameState {
  roomId: string
  gameState: GameState
  lastAction: GameAction | null
  lastActionTimestamp: string
}

// Rankings
export interface PlayerRanking {
  userId: string
  username: string
  elo: number
  wins: number
  losses: number
  streak: number
  rank: PlayerRank
}

export type PlayerRank = 'script_kiddie' | 'hacker' | 'netrunner' | 'elite_runner' | 'ghost_in_the_machine'

export function getRankFromElo(elo: number): PlayerRank {
  if (elo >= 2000) return 'ghost_in_the_machine'
  if (elo >= 1600) return 'elite_runner'
  if (elo >= 1300) return 'netrunner'
  if (elo >= 1000) return 'hacker'
  return 'script_kiddie'
}

export function getRankDisplayName(rank: PlayerRank): string {
  const names: Record<PlayerRank, string> = {
    script_kiddie: 'Script Kiddie',
    hacker: 'Hacker',
    netrunner: 'Netrunner',
    elite_runner: 'Elite Runner',
    ghost_in_the_machine: 'Ghost in the Machine',
  }
  return names[rank]
}

export function getRankColor(rank: PlayerRank): string {
  const colors: Record<PlayerRank, string> = {
    script_kiddie: '#6b7280',
    hacker: '#22c55e',
    netrunner: '#3b82f6',
    elite_runner: '#a855f7',
    ghost_in_the_machine: '#ef4444',
  }
  return colors[rank]
}
