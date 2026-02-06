'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { GameState, PlayerSide } from '@/lib/card-game/types'
import { processAction, canPlayCard } from '@/lib/card-game/engine'
import { getAIAction } from '@/lib/card-game/ai'
import GameCard from './GameCard'
import PlayerStats from './PlayerStats'
import CombatLog from './CombatLog'

interface GameBoardProps {
  initialState: GameState
  onGameEnd?: (winner: PlayerSide) => void
  isMultiplayer?: boolean
  playerSide?: PlayerSide
  onAction?: (state: GameState) => void
}

type SelectionMode = 'none' | 'selecting_attacker' | 'selecting_target'

export default function GameBoard({
  initialState,
  onGameEnd,
  isMultiplayer = false,
  playerSide = 'player',
  onAction,
}: GameBoardProps) {
  const [gameState, setGameState] = useState<GameState>(initialState)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('none')
  const [selectedAttacker, setSelectedAttacker] = useState<string | null>(null)
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [showGameOver, setShowGameOver] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  const isPlayerTurn = gameState.activePlayer === playerSide

  // Scroll combat log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [gameState.combatLog.length])

  // Check game over
  useEffect(() => {
    if (gameState.winner) {
      setShowGameOver(true)
      onGameEnd?.(gameState.winner)
    }
  }, [gameState.winner, onGameEnd])

  // AI turn
  useEffect(() => {
    if (isMultiplayer) return
    if (gameState.activePlayer !== 'opponent' || gameState.phase === 'game_over') return

    let cancelled = false
    setIsAIThinking(true)
    const actions = getAIAction(gameState)
    const timerIds: ReturnType<typeof setTimeout>[] = []

    let currentState = gameState
    let delay = 800

    actions.forEach((action, idx) => {
      const timerId = setTimeout(() => {
        if (cancelled) return
        currentState = processAction(currentState, action)
        setGameState({ ...currentState })
        if (idx === actions.length - 1) {
          setIsAIThinking(false)
        }
      }, delay)
      timerIds.push(timerId)
      delay += 600
    })

    return () => {
      cancelled = true
      timerIds.forEach(id => clearTimeout(id))
    }
  }, [gameState.activePlayer, isMultiplayer, gameState.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle playing a card from hand
  const handlePlayCard = useCallback((instanceId: string) => {
    if (!isPlayerTurn || gameState.phase === 'game_over') return
    if (!canPlayCard(gameState, playerSide, instanceId)) return

    const newState = processAction(gameState, {
      type: 'play_card',
      cardInstanceId: instanceId,
      playerSide,
    })
    setGameState(newState)
    onAction?.(newState)
    setSelectionMode('none')
    setSelectedAttacker(null)
  }, [gameState, isPlayerTurn, playerSide, onAction])

  // Handle selecting a card on field to attack with
  const handleSelectFieldCard = useCallback((instanceId: string) => {
    if (!isPlayerTurn || gameState.phase === 'game_over') return

    const player = playerSide === 'player' ? gameState.player : gameState.opponent
    const card = player.field.find(c => c.instanceId === instanceId)
    if (!card || card.isExhausted) return

    if (selectionMode === 'selecting_attacker' && selectedAttacker === instanceId) {
      // Deselect
      setSelectionMode('none')
      setSelectedAttacker(null)
      return
    }

    setSelectionMode('selecting_target')
    setSelectedAttacker(instanceId)
  }, [gameState, isPlayerTurn, playerSide, selectionMode, selectedAttacker])

  // Handle attacking a target
  const handleAttackTarget = useCallback((targetInstanceId: string) => {
    if (!selectedAttacker) return

    const newState = processAction(gameState, {
      type: 'attack',
      attackerInstanceId: selectedAttacker,
      targetInstanceId,
      playerSide,
    })
    setGameState(newState)
    onAction?.(newState)
    setSelectionMode('none')
    setSelectedAttacker(null)
  }, [gameState, selectedAttacker, playerSide, onAction])

  // Handle direct attack
  const handleDirectAttack = useCallback(() => {
    if (!selectedAttacker) return

    const opponent = playerSide === 'player' ? gameState.opponent : gameState.player
    if (opponent.field.length > 0) return

    const newState = processAction(gameState, {
      type: 'direct_attack',
      attackerInstanceId: selectedAttacker,
      playerSide,
    })
    setGameState(newState)
    onAction?.(newState)
    setSelectionMode('none')
    setSelectedAttacker(null)
  }, [gameState, selectedAttacker, playerSide, onAction])

  // End turn
  const handleEndTurn = useCallback(() => {
    if (!isPlayerTurn) return

    const newState = processAction(gameState, {
      type: 'end_turn',
      playerSide,
    })
    setGameState(newState)
    onAction?.(newState)
    setSelectionMode('none')
    setSelectedAttacker(null)
  }, [gameState, isPlayerTurn, playerSide, onAction])

  const player = playerSide === 'player' ? gameState.player : gameState.opponent
  const opponent = playerSide === 'player' ? gameState.opponent : gameState.player

  return (
    <div className="game-board grid-pattern scanlines netrun-theme flex flex-col" style={{ minHeight: '100dvh' }}>
      {/* Opponent Area */}
      <div className="px-2 pt-2 md:px-4 md:pt-3">
        <PlayerStats
          name={isMultiplayer ? 'Oponente' : 'Corp AI'}
          hp={opponent.systemIntegrity}
          maxHp={20}
          ram={opponent.currentRam}
          maxRam={opponent.maxRam}
          shield={opponent.shield}
          deckCount={opponent.deck.length}
          handCount={opponent.hand.length}
          isActive={!isPlayerTurn}
          side="opponent"
        />
      </div>

      {/* Opponent Hand (face down) */}
      <div className="hand-area py-1">
        {opponent.hand.map((card, i) => (
          <GameCard
            key={card.instanceId || i}
            card={card}
            showBack={true}
            size="sm"
          />
        ))}
      </div>

      {/* Opponent Field */}
      <div className="px-2 md:px-4">
        <div
          className={`field-zone flex items-center justify-center gap-2 p-2 flex-wrap ${
            selectionMode === 'selecting_target' ? 'active' : ''
          }`}
          onClick={selectionMode === 'selecting_target' && opponent.field.length === 0 ? handleDirectAttack : undefined}
        >
          {opponent.field.length === 0 ? (
            <p className="text-[10px] font-mono" style={{ color: 'var(--cyber-muted)' }}>
              {selectionMode === 'selecting_target' ? '[ CLICK PARA ATAQUE DIRECTO ]' : '// campo vacío'}
            </p>
          ) : (
            opponent.field.map((card) => (
              <GameCard
                key={card.instanceId}
                card={card}
                isExhausted={card.isExhausted}
                isAttackTarget={selectionMode === 'selecting_target'}
                onClick={() => {
                  if (selectionMode === 'selecting_target') {
                    handleAttackTarget(card.instanceId)
                  }
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Center: divider + turn info + combat log */}
      <div className="flex-1 flex flex-col items-center justify-center px-2 md:px-4 py-2 gap-2 min-h-0">
        <div className="board-divider w-full" />

        <div className="flex items-center gap-3 flex-wrap justify-center">
          <span className="text-[10px] font-mono" style={{ color: 'var(--cyber-muted)' }}>
            TURNO {gameState.turn}
          </span>
          <span
            className={`text-xs font-bold font-mono turn-indicator ${isPlayerTurn ? 'neon-text-cyan' : 'neon-text-magenta'}`}
          >
            {isPlayerTurn ? '>> TU TURNO <<' : isAIThinking ? '>> AI PENSANDO... <<' : '>> TURNO RIVAL <<'}
          </span>
          {isPlayerTurn && (
            <button
              onClick={handleEndTurn}
              className="cyber-btn text-[10px] py-1 px-3"
            >
              Fin Turno
            </button>
          )}
        </div>

        {/* Combat Log */}
        <div ref={logRef} className="w-full max-w-lg">
          <CombatLog entries={gameState.combatLog} />
        </div>

        <div className="board-divider w-full" />
      </div>

      {/* Player Field */}
      <div className="px-2 md:px-4">
        <div className="field-zone active flex items-center justify-center gap-2 p-2 flex-wrap">
          {player.field.length === 0 ? (
            <p className="text-[10px] font-mono" style={{ color: 'var(--cyber-muted)' }}>
              {/* juega cartas aquí */}
            </p>
          ) : (
            player.field.map((card) => (
              <GameCard
                key={card.instanceId}
                card={card}
                isExhausted={card.isExhausted}
                isSelected={selectedAttacker === card.instanceId}
                onClick={() => handleSelectFieldCard(card.instanceId)}
              />
            ))
          )}
        </div>
      </div>

      {/* Player Hand */}
      <div className="hand-area py-1 pb-2">
        {player.hand.map((card) => {
          const playable = isPlayerTurn && canPlayCard(gameState, playerSide, card.instanceId)
          return (
            <GameCard
              key={card.instanceId}
              card={card}
              isPlayable={playable}
              onClick={() => playable ? handlePlayCard(card.instanceId) : undefined}
            />
          )
        })}
      </div>

      {/* Player Stats */}
      <div className="px-2 pb-2 md:px-4 md:pb-3">
        <PlayerStats
          name="Runner"
          hp={player.systemIntegrity}
          maxHp={20}
          ram={player.currentRam}
          maxRam={player.maxRam}
          shield={player.shield}
          deckCount={player.deck.length}
          handCount={player.hand.length}
          isActive={isPlayerTurn}
          side="player"
        />
      </div>

      {/* Game Over Modal */}
      {showGameOver && (
        <div className="cyber-modal-overlay" onClick={() => setShowGameOver(false)}>
          <div className="cyber-modal text-center" onClick={e => e.stopPropagation()}>
            <div className="mb-4">
              {gameState.winner === playerSide ? (
                <>
                  <p className="text-4xl mb-2">🏆</p>
                  <h2 className="text-2xl font-bold neon-text-cyan font-mono">
                    VICTORIA
                  </h2>
                  <p className="text-sm mt-2" style={{ color: 'var(--cyber-muted)' }}>
                    Has hackeado el sistema enemigo
                  </p>
                </>
              ) : (
                <>
                  <p className="text-4xl mb-2">💀</p>
                  <h2 className="text-2xl font-bold neon-text-red font-mono">
                    DESCONECTADO
                  </h2>
                  <p className="text-sm mt-2" style={{ color: 'var(--cyber-muted)' }}>
                    Tu sistema ha sido comprometido
                  </p>
                </>
              )}
            </div>
            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={() => window.location.reload()}
                className="cyber-btn text-sm"
              >
                Jugar de nuevo
              </button>
              <a href="/card-game" className="cyber-btn cyber-btn-magenta text-sm">
                Menú Principal
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Selection mode hint */}
      {selectionMode === 'selecting_target' && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-black/80 border border-red-500/50 rounded-lg px-4 py-2 text-xs font-mono" style={{ color: 'var(--neon-red)' }}>
            Selecciona un objetivo para atacar
            <button
              onClick={() => { setSelectionMode('none'); setSelectedAttacker(null) }}
              className="ml-3 text-gray-500 hover:text-white"
            >
              [Cancelar]
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
