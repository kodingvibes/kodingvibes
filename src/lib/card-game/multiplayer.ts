import { createBrowserClient } from '@supabase/ssr'
import { GameState, GameAction, LobbyRoom, PlayerRanking } from './types'

// ============================================
// NetRun - Multiplayer Service
// Supabase real-time game sync
// Uses untyped client since netrun tables are
// not in the generated Database types yet.
// ============================================

const GAMES_CHANNEL_PREFIX = 'netrun_game_'
const LOBBY_CHANNEL = 'netrun_lobby'

function getUntypedClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createBrowserClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function getSupabaseClient() {
  return getUntypedClient()
}

// ---- Lobby Operations ----

export async function createRoom(
  hostId: string,
  hostName: string,
  hostDeckId: string
): Promise<LobbyRoom | null> {
  const supabase = getSupabaseClient()

  const room: Omit<LobbyRoom, 'id'> = {
    hostId,
    hostName,
    guestId: null,
    guestName: null,
    status: 'waiting',
    hostDeckId,
    guestDeckId: null,
    createdAt: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('netrun_rooms')
    .insert(room)
    .select()
    .single()

  if (error) {
    console.error('Error creating room:', error)
    return null
  }

  return data as LobbyRoom
}

export async function joinRoom(
  roomId: string,
  guestId: string,
  guestName: string,
  guestDeckId: string
): Promise<boolean> {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('netrun_rooms')
    .update({
      guestId,
      guestName,
      guestDeckId,
      status: 'ready',
    })
    .eq('id', roomId)
    .is('guestId', null)

  if (error) {
    console.error('Error joining room:', error)
    return false
  }

  return true
}

export async function getOpenRooms(): Promise<LobbyRoom[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('netrun_rooms')
    .select('*')
    .eq('status', 'waiting')
    .order('createdAt', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error fetching rooms:', error)
    return []
  }

  return (data || []) as LobbyRoom[]
}

export async function deleteRoom(roomId: string): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.from('netrun_rooms').delete().eq('id', roomId)
}

export async function updateRoomStatus(roomId: string, status: LobbyRoom['status']): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.from('netrun_rooms').update({ status }).eq('id', roomId)
}

// ---- Real-time Game Sync ----

export function subscribeToRoom(
  roomId: string,
  onUpdate: (room: LobbyRoom) => void
) {
  const supabase = getSupabaseClient()

  const channel = supabase
    .channel(`room_${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'netrun_rooms',
        filter: `id=eq.${roomId}`,
      },
      (payload) => {
        if (payload.new) {
          onUpdate(payload.new as LobbyRoom)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeLobby(
  onUpdate: (rooms: LobbyRoom[]) => void
) {
  const supabase = getSupabaseClient()

  const channel = supabase
    .channel(LOBBY_CHANNEL)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'netrun_rooms',
      },
      async () => {
        // Refetch all rooms on any change
        const rooms = await getOpenRooms()
        onUpdate(rooms)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// ---- Game State Sync (Broadcast Channel) ----

export function createGameChannel(
  roomId: string,
  onGameStateUpdate: (state: GameState) => void,
  onActionReceived: (action: GameAction) => void
) {
  const supabase = getSupabaseClient()

  const channel = supabase.channel(`${GAMES_CHANNEL_PREFIX}${roomId}`, {
    config: { broadcast: { self: false } },
  })

  channel
    .on('broadcast', { event: 'game_state' }, ({ payload }) => {
      onGameStateUpdate(payload.state as GameState)
    })
    .on('broadcast', { event: 'game_action' }, ({ payload }) => {
      onActionReceived(payload.action as GameAction)
    })
    .subscribe()

  const sendGameState = (state: GameState) => {
    channel.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { state },
    })
  }

  const sendAction = (action: GameAction) => {
    channel.send({
      type: 'broadcast',
      event: 'game_action',
      payload: { action },
    })
  }

  const cleanup = () => {
    supabase.removeChannel(channel)
  }

  return { sendGameState, sendAction, cleanup }
}

// ---- Rankings ----

export async function getPlayerRanking(userId: string): Promise<PlayerRanking | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('netrun_rankings')
    .select('*')
    .eq('userId', userId)
    .single()

  if (error) return null
  return data as PlayerRanking
}

export async function getLeaderboard(limit: number = 20): Promise<PlayerRanking[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('netrun_rankings')
    .select('*')
    .order('elo', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching leaderboard:', error)
    return []
  }

  return (data || []) as PlayerRanking[]
}

export async function updatePlayerRanking(
  userId: string,
  username: string,
  won: boolean
): Promise<void> {
  const supabase = getSupabaseClient()

  // Get current ranking
  const { data: existing } = await supabase
    .from('netrun_rankings')
    .select('*')
    .eq('userId', userId)
    .single()

  if (!existing) {
    // Create new ranking
    await supabase.from('netrun_rankings').insert({
      userId,
      username,
      elo: 1000,
      wins: won ? 1 : 0,
      losses: won ? 0 : 1,
      streak: won ? 1 : 0,
      rank: 'script_kiddie',
    })
    return
  }

  // Calculate new ELO (simplified K-factor of 32)
  const K = 32
  const expectedScore = 1 / (1 + Math.pow(10, (1000 - existing.elo) / 400))
  const actualScore = won ? 1 : 0
  const newElo = Math.max(100, Math.round(existing.elo + K * (actualScore - expectedScore)))

  const newStreak = won
    ? (existing.streak > 0 ? existing.streak + 1 : 1)
    : (existing.streak < 0 ? existing.streak - 1 : -1)

  // Determine rank
  let rank = 'script_kiddie'
  if (newElo >= 2000) rank = 'ghost_in_the_machine'
  else if (newElo >= 1600) rank = 'elite_runner'
  else if (newElo >= 1300) rank = 'netrunner'
  else if (newElo >= 1000) rank = 'hacker'

  await supabase
    .from('netrun_rankings')
    .update({
      elo: newElo,
      wins: existing.wins + (won ? 1 : 0),
      losses: existing.losses + (won ? 0 : 1),
      streak: newStreak,
      rank,
      username,
    })
    .eq('userId', userId)
}

// ---- Matchmaking ----

export async function findMatch(
  userId: string,
  _userElo?: number
): Promise<LobbyRoom | null> {
  const supabase = getSupabaseClient()

  // Look for rooms within ~200 ELO range
  // Since we can't filter by ELO on rooms directly, just find any open room
  const { data, error } = await supabase
    .from('netrun_rooms')
    .select('*')
    .eq('status', 'waiting')
    .neq('hostId', userId)
    .order('createdAt', { ascending: true })
    .limit(1)
    .single()

  if (error || !data) return null
  return data as LobbyRoom
}
