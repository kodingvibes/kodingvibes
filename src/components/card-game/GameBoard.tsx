'use client'

import { useState, useEffect, useCallback } from 'react'
import { GameState, PlayerSide, CardInstance } from '@/lib/card-game/types'
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

/** Splits field cards into ATK (programs) and DEF (ice/hardware) rows */
function FieldRows({
  cards,
  size,
  selectedId,
  isAttackTarget,
  onCardClick,
  isPlayerSide,
}: {
  cards: CardInstance[]
  size: 'sm' | 'md' | 'lg'
  selectedId?: string | null
  isAttackTarget?: boolean
  onCardClick: (card: CardInstance) => void
  isPlayerSide?: boolean
}) {
  const atkCards = cards.filter(c => c.definition.type === 'program')
  const defCards = cards.filter(c => c.definition.type !== 'program')

  const renderRow = (rowCards: CardInstance[], label: string, color: string) => (
    <div className="flex items-center gap-0.5 w-full">
      <span
        className="text-[9px] md:text-[10px] font-mono font-bold w-6 text-center flex-shrink-0"
        style={{ color }}
      >
        {label}
      </span>
      <div className="field-row flex-1 flex items-center justify-center">
        {rowCards.map((card) => (
          <GameCard
            key={card.instanceId}
            card={card}
            size={size}
            isExhausted={card.isExhausted}
            isSelected={selectedId === card.instanceId}
            isAttackTarget={isAttackTarget}
            onClick={() => onCardClick(card)}
          />
        ))}
      </div>
    </div>
  )

  // For player: ATK on top (closer to opponent), DEF on bottom (closer to hand)
  // For opponent: DEF on top, ATK on bottom (mirrored)
  const topRow = isPlayerSide
    ? { cards: atkCards, label: 'ATK', color: '#ff4444' }
    : { cards: defCards, label: 'DEF', color: '#4488ff' }
  const bottomRow = isPlayerSide
    ? { cards: defCards, label: 'DEF', color: '#4488ff' }
    : { cards: atkCards, label: 'ATK', color: '#ff4444' }

  return (
    <div className="flex flex-col gap-0.5 w-full">
      {topRow.cards.length > 0 && renderRow(topRow.cards, topRow.label, topRow.color)}
      {bottomRow.cards.length > 0 && renderRow(bottomRow.cards, bottomRow.label, bottomRow.color)}
      {/* If all cards are same type, only one row shows - that's fine */}
    </div>
  )
}

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
  const [showLog, setShowLog] = useState(false)

  const isPlayerTurn = gameState.activePlayer === playerSide

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
    <div className="game-board grid-pattern scanlines netrun-theme flex flex-col h-[calc(100dvh-4rem)] overflow-hidden">
      {/* ===== Opponent Stats ===== */}
      <div className="flex-shrink-0 px-2 pt-1 md:px-4 md:pt-2">
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

      {/* ===== Opponent Hand (compact indicators) ===== */}
      <div className="flex-shrink-0 flex items-center justify-center gap-1.5 py-0.5">
        {opponent.hand.map((card, i) => (
          <div
            key={card.instanceId || i}
            className="opponent-hand-indicator"
          />
        ))}
        {opponent.hand.length === 0 && (
          <span className="text-[8px] font-mono" style={{ color: 'var(--cyber-muted)' }}>
            sin cartas
          </span>
        )}
      </div>

      {/* ===== Opponent Field (ATK / DEF rows) ===== */}
      <div
        className={`flex-1 min-h-0 px-2 md:px-4 flex flex-col justify-center ${
          selectionMode === 'selecting_target' ? '' : ''
        }`}
        onClick={selectionMode === 'selecting_target' && opponent.field.length === 0 ? handleDirectAttack : undefined}
      >
        {opponent.field.length === 0 ? (
          <div className="field-zone-compact w-full flex items-center justify-center p-2">
            <p className="text-xs font-mono" style={{ color: 'var(--cyber-muted)' }}>
              {selectionMode === 'selecting_target' ? '[ ATAQUE DIRECTO ]' : '// vacío'}
            </p>
          </div>
        ) : (
          <FieldRows
            cards={opponent.field}
            size="sm"
            isAttackTarget={selectionMode === 'selecting_target'}
            onCardClick={(card) => {
              if (selectionMode === 'selecting_target') {
                handleAttackTarget(card.instanceId)
              }
            }}
          />
        )}
      </div>

      {/* ===== Center Bar (turn info + actions) ===== */}
      <div className="flex-shrink-0 px-2 md:px-4">
        <div className="board-divider w-full" />
        <div className="flex items-center justify-center gap-2 py-0.5">
          <span className="text-[11px] md:text-xs font-mono" style={{ color: 'var(--cyber-muted)' }}>
            T{gameState.turn}
          </span>
          <span
            className={`text-xs md:text-sm font-bold font-mono turn-indicator ${
              isPlayerTurn ? 'neon-text-cyan' : 'neon-text-magenta'
            }`}
          >
            {isPlayerTurn ? '>> TU TURNO <<' : isAIThinking ? '>> AI... <<' : '>> RIVAL <<'}
          </span>
          {isPlayerTurn && (
            <button
              onClick={handleEndTurn}
              className="cyber-btn text-[11px] py-0.5 px-3"
            >
              FIN
            </button>
          )}
        </div>
        <div className="board-divider w-full" />
      </div>

      {/* ===== Player Field (ATK / DEF rows) ===== */}
      <div className="flex-1 min-h-0 px-2 md:px-4 flex flex-col justify-center">
        {player.field.length === 0 ? (
          <div className="field-zone-compact active w-full flex items-center justify-center p-2">
            <p className="text-xs font-mono" style={{ color: 'var(--cyber-muted)' }}>
              {/* juega cartas aquí */}
            </p>
          </div>
        ) : (
          <FieldRows
            cards={player.field}
            size="sm"
            selectedId={selectedAttacker}
            onCardClick={(card) => handleSelectFieldCard(card.instanceId)}
            isPlayerSide
          />
        )}
      </div>

      {/* ===== Player Hand ===== */}
      <div className="flex-shrink-0 hand-area">
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

      {/* ===== Player Stats ===== */}
      <div className="flex-shrink-0 px-2 pb-1 md:px-4 md:pb-2">
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

      {/* ===== Floating Combat Log ===== */}
      <button
        onClick={() => setShowLog(!showLog)}
        className="floating-log-toggle absolute"
        style={{ bottom: '4rem', right: '0.5rem' }}
      >
        {showLog ? '✕' : '⌘'}
      </button>

      {showLog && (
        <div
          className="floating-log-panel absolute"
          style={{ bottom: '6.5rem', right: '0.5rem' }}
        >
          <CombatLog entries={gameState.combatLog} />
        </div>
      )}

      {/* ===== Selection mode hint ===== */}
      {selectionMode === 'selecting_target' && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50">
          <div
            className="bg-black/90 border border-red-500/50 rounded-lg px-3 py-1.5 text-[10px] font-mono"
            style={{ color: 'var(--neon-red)' }}
          >
            Selecciona objetivo
            <button
              onClick={() => { setSelectionMode('none'); setSelectedAttacker(null) }}
              className="ml-2 text-gray-500 hover:text-white"
            >
              [X]
            </button>
          </div>
        </div>
      )}

      {/* ===== Game Over Modal ===== */}
      {showGameOver && (
        <div className="cyber-modal-overlay" onClick={() => setShowGameOver(false)}>
          <div className="cyber-modal text-center" onClick={e => e.stopPropagation()}>
            <div className="mb-3">
              {gameState.winner === playerSide ? (
                <>
                  <p className="text-3xl mb-2">🏆</p>
                  <h2 className="text-xl font-bold neon-text-cyan font-mono">
                    VICTORIA
                  </h2>
                  <p className="text-xs mt-1" style={{ color: 'var(--cyber-muted)' }}>
                    Has hackeado el sistema enemigo
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl mb-2">💀</p>
                  <h2 className="text-xl font-bold neon-text-red font-mono">
                    DESCONECTADO
                  </h2>
                  <p className="text-xs mt-1" style={{ color: 'var(--cyber-muted)' }}>
                    Tu sistema ha sido comprometido
                  </p>
                </>
              )}
            </div>
            <div className="flex gap-3 justify-center mt-4">
              <button
                onClick={() => window.location.reload()}
                className="cyber-btn text-xs"
              >
                Otra vez
              </button>
              <a href="/card-game" className="cyber-btn cyber-btn-magenta text-xs">
                Menú
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
