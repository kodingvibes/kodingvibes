'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LobbyRoom, DeckConfig } from '@/lib/card-game/types'
import {
  createRoom, joinRoom, getOpenRooms, deleteRoom,
  subscribeLobby, subscribeToRoom, updateRoomStatus,
  findMatch, createGameChannel,
} from '@/lib/card-game/multiplayer'
import { createInitialGameState } from '@/lib/card-game/engine'
import { getStarterDeck } from '@/lib/card-game/cards'
import { GameState } from '@/lib/card-game/types'
import GameBoard from '@/components/card-game/GameBoard'
import Link from 'next/link'
import '@/app/card-game/card-game.css'

type LobbyView = 'lobby' | 'waiting' | 'matchmaking' | 'playing'

type SerializedDeck = {
  id: string
  cards: string[]
}

function serializeDeckSelection(deckId: string | null, cards: string[]): string {
  const payload: SerializedDeck = {
    id: deckId || 'starter',
    cards,
  }
  return JSON.stringify(payload)
}

function parseDeckSelection(serialized: string | null | undefined): string[] | null {
  if (!serialized) return null

  try {
    const parsed = JSON.parse(serialized) as Partial<SerializedDeck>
    if (!Array.isArray(parsed.cards)) return null
    if (parsed.cards.length !== 20) return null
    if (!parsed.cards.every(cardId => typeof cardId === 'string')) return null
    return parsed.cards
  } catch {
    return null
  }
}

export default function LobbyPage() {
  const [view, setView] = useState<LobbyView>('lobby')
  const [rooms, setRooms] = useState<LobbyRoom[]>([])
  const [currentRoom, setCurrentRoom] = useState<LobbyRoom | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedDecks, setSavedDecks] = useState<DeckConfig[]>([])
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof createGameChannel> | null>(null)
  const roomUnsubRef = useRef<(() => void) | null>(null)

  const supabase = useMemo(() => createClient(), [])

  // Auth check
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data: userData } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single()
        setUsername(userData?.username || user.email?.split('@')[0] || 'Runner')
      }
    }
    getUser()
  }, [supabase])

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      channelRef.current?.cleanup()
      roomUnsubRef.current?.()
    }
  }, [])

  // Load saved decks
  useEffect(() => {
    const saved = localStorage.getItem('netrun_decks')
    if (saved) setSavedDecks(JSON.parse(saved))
  }, [])

  // Fetch rooms
  useEffect(() => {
    if (view !== 'lobby') return
    getOpenRooms().then(setRooms)

    const unsubscribe = subscribeLobby(setRooms)
    return unsubscribe
  }, [view])

  const getSelectedDeckCards = useCallback((): string[] => {
    if (selectedDeckId) {
      const deck = savedDecks.find(d => d.id === selectedDeckId)
      if (deck) return deck.cards
    }
    return getStarterDeck('runner')
  }, [selectedDeckId, savedDecks])

  // Create a room
  const handleCreateRoom = async () => {
    if (!userId) {
      setError('Debes iniciar sesión para jugar multijugador')
      return
    }

    const deckPayload = serializeDeckSelection(selectedDeckId, getSelectedDeckCards())

    const room = await createRoom(userId, username, deckPayload)
    if (!room) {
      setError('Error al crear la sala')
      return
    }

    setCurrentRoom(room)
    setIsHost(true)
    setView('waiting')

    // Subscribe to room changes
    roomUnsubRef.current?.()
    roomUnsubRef.current = subscribeToRoom(room.id, (updatedRoom) => {
      setCurrentRoom(updatedRoom)
      if (updatedRoom.status === 'ready' && updatedRoom.guestId) {
        startMultiplayerGame(updatedRoom, true)
      }
    })
  }

  // Join a room
  const handleJoinRoom = async (room: LobbyRoom) => {
    if (!userId) {
      setError('Debes iniciar sesión para jugar multijugador')
      return
    }

    const deckPayload = serializeDeckSelection(selectedDeckId, getSelectedDeckCards())

    const success = await joinRoom(room.id, userId, username, deckPayload)
    if (!success) {
      setError('Error al unirse a la sala')
      return
    }

    setCurrentRoom({
      ...room,
      guestId: userId,
      guestName: username,
      guestDeckId: deckPayload,
      status: 'ready',
    })
    setIsHost(false)
    setView('waiting')

    // The host will start the game and broadcast the initial state
    // Subscribe to game channel to receive it
    setTimeout(() => {
      startMultiplayerGame({ ...room, guestId: userId, guestDeckId: deckPayload }, false)
    }, 1000)
  }

  // Start multiplayer game
  const startMultiplayerGame = (room: LobbyRoom, asHost: boolean) => {
    const localDeck = getSelectedDeckCards()
    const hostDeckFromRoom = parseDeckSelection(room.hostDeckId)
    const guestDeckFromRoom = parseDeckSelection(room.guestDeckId)

    const hostDeck = hostDeckFromRoom ?? (asHost ? localDeck : getStarterDeck('runner'))
    const guestDeck = guestDeckFromRoom ?? (asHost ? getStarterDeck('runner') : localDeck)

    if (asHost && !guestDeckFromRoom) {
      setError('No se pudo leer el deck del invitado. Se usará deck starter como fallback.')
    }

    const onRemoteAction = () => {
      // Actions are broadcast for observability; authoritative sync uses game_state events.
    }

    // Clean up previous channel
    channelRef.current?.cleanup()

    if (asHost) {
      const state = createInitialGameState(hostDeck, guestDeck, true, room.id)
      setGameState(state)

      const channel = createGameChannel(
        room.id,
        (receivedState) => setGameState(receivedState),
        onRemoteAction,
      )
      channelRef.current = channel

      // Broadcast initial state
      setTimeout(() => channel.sendGameState(state), 500)

      updateRoomStatus(room.id, 'playing')
    } else {
      // Guest: wait for host to broadcast state
      const channel = createGameChannel(
        room.id,
        (receivedState) => setGameState(receivedState),
        onRemoteAction,
      )
      channelRef.current = channel
    }

    setView('playing')
  }

  // Quick matchmaking
  const handleMatchmaking = async () => {
    if (!userId) {
      setError('Debes iniciar sesión para jugar multijugador')
      return
    }

    setView('matchmaking')

    // Try to find an existing room
    const room = await findMatch(userId)
    if (room) {
      handleJoinRoom(room)
      return
    }

    // No room found - create one and wait
    handleCreateRoom()
  }

  // Cancel waiting
  const handleCancel = async () => {
    if (currentRoom && isHost) {
      await deleteRoom(currentRoom.id)
    }
    setCurrentRoom(null)
    setView('lobby')
  }

  if (!userId) {
    return (
      <div className="netrun-theme min-h-screen grid-pattern flex items-center justify-center" style={{ background: 'var(--cyber-bg)' }}>
        <div className="text-center p-8 rounded-lg border border-cyan-500/20 bg-black/60">
          <p className="text-xl font-mono neon-text-cyan mb-4">ACCESO DENEGADO</p>
          <p className="text-xs font-mono mb-6" style={{ color: 'var(--cyber-muted)' }}>
            Debes iniciar sesión para acceder al modo multijugador
          </p>
          <Link href="/card-game" className="cyber-btn text-sm">
            Volver
          </Link>
        </div>
      </div>
    )
  }

  // Playing
  if (view === 'playing' && !gameState) {
    return (
      <div className="netrun-theme min-h-screen grid-pattern flex items-center justify-center" style={{ background: 'var(--cyber-bg)' }}>
        <div className="text-center p-8 rounded-lg border border-cyan-500/20 bg-black/60">
          <div className="cyber-spinner mb-6" />
          <p className="text-lg font-mono neon-text-cyan mb-2">SINCRONIZANDO PARTIDA...</p>
          <p className="text-xs font-mono" style={{ color: 'var(--cyber-muted)' }}>
            Esperando estado inicial del host
          </p>
        </div>
      </div>
    )
  }

  if (view === 'playing' && gameState) {
    return (
      <GameBoard
        initialState={gameState}
        isMultiplayer={true}
        playerSide={isHost ? 'player' : 'opponent'}
        onAction={(newState, action) => {
          setGameState(newState)
          channelRef.current?.sendAction(action)
          channelRef.current?.sendGameState(newState)
        }}
      />
    )
  }

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

        <h1 className="text-2xl font-bold font-mono neon-text-cyan mb-6">
          LOBBY MULTIJUGADOR
        </h1>

        {error && (
          <div className="mb-4 p-3 rounded border border-red-500/30 bg-red-500/10 text-xs font-mono text-red-400">
            {error}
            <button onClick={() => setError(null)} className="ml-3 text-gray-500 hover:text-white">[x]</button>
          </div>
        )}

        {/* Waiting Room */}
        {view === 'waiting' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="cyber-spinner mb-6" />
            <p className="text-lg font-mono neon-text-cyan mb-2">
              ESPERANDO OPONENTE...
            </p>
            <p className="text-xs font-mono mb-6" style={{ color: 'var(--cyber-muted)' }}>
              Sala: {currentRoom?.id?.slice(0, 8)}
            </p>
            <button onClick={handleCancel} className="cyber-btn cyber-btn-red text-xs">
              CANCELAR
            </button>
          </div>
        )}

        {/* Matchmaking */}
        {view === 'matchmaking' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="cyber-spinner mb-6" />
            <p className="text-lg font-mono neon-text-magenta mb-2">
              BUSCANDO OPONENTE...
            </p>
            <p className="text-xs font-mono mb-6" style={{ color: 'var(--cyber-muted)' }}>
              Conectando a la red...
            </p>
            <button onClick={handleCancel} className="cyber-btn cyber-btn-red text-xs">
              CANCELAR
            </button>
          </div>
        )}

        {/* Lobby */}
        {view === 'lobby' && (
          <>
            {/* Deck selection */}
            <div className="mb-6 p-4 rounded-lg border border-gray-700/30 bg-black/30">
              <label className="text-[10px] font-mono block mb-2" style={{ color: 'var(--cyber-muted)' }}>
                TU DECK
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedDeckId(null)}
                  className={`text-xs font-mono px-3 py-1.5 rounded transition-all ${
                    selectedDeckId === null
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      : 'bg-gray-800/50 text-gray-500 border border-gray-700/30'
                  }`}
                >
                  ⚡ Starter
                </button>
                {savedDecks.map(deck => (
                  <button
                    key={deck.id}
                    onClick={() => setSelectedDeckId(deck.id)}
                    className={`text-xs font-mono px-3 py-1.5 rounded transition-all ${
                      selectedDeckId === deck.id
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'bg-gray-800/50 text-gray-500 border border-gray-700/30'
                    }`}
                  >
                    🎴 {deck.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <button
                onClick={handleMatchmaking}
                className="cyber-btn cyber-btn-magenta text-sm py-4"
              >
                ⚡ MATCHMAKING RÁPIDO
              </button>
              <button
                onClick={handleCreateRoom}
                className="cyber-btn text-sm py-4"
              >
                + CREAR SALA
              </button>
            </div>

            {/* Open rooms */}
            <div>
              <h2 className="text-sm font-mono neon-text-green mb-3">
                SALAS ABIERTAS ({rooms.length})
              </h2>

              {rooms.length === 0 ? (
                <div className="text-center py-12 border border-gray-700/20 rounded-lg bg-black/20">
                  <p className="text-sm font-mono" style={{ color: 'var(--cyber-muted)' }}>
                    No hay salas abiertas
                  </p>
                  <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--cyber-muted)' }}>
                    Crea una o usa matchmaking rápido
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rooms.map(room => (
                    <div
                      key={room.id}
                      className="lobby-room rounded-lg p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-mono font-bold" style={{ color: 'var(--cyber-text)' }}>
                          {room.hostName}
                        </p>
                        <p className="text-[10px] font-mono" style={{ color: 'var(--cyber-muted)' }}>
                          Sala: {room.id.slice(0, 8)} | Creada: {new Date(room.createdAt).toLocaleTimeString('es-ES')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleJoinRoom(room)}
                        className="cyber-btn cyber-btn-green text-[10px]"
                      >
                        UNIRSE
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
