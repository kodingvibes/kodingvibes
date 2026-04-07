'use client'

import { useState, useEffect, useCallback, useRef, CSSProperties } from 'react'
import { GameState, PlayerSide, CardInstance, GameAction } from '@/lib/card-game/types'
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
  onAction?: (state: GameState, action: GameAction) => void
}

type SelectionMode = 'none' | 'selecting_attacker' | 'selecting_target'

const MAX_FIELD_SIZE = 5

function cardHasPierce(card: CardInstance): boolean {
  return card.definition.abilityEffect?.effect.action === 'pierce'
    || Boolean(card.definition.abilityEffects?.some(e => e.effect.action === 'pierce'))
}

function isDefenderUnit(card: CardInstance): boolean {
  return card.definition.type !== 'event' && card.currentFirewall > 0
}

/** Renders field cards - single row on desktop, two rows (ATK/DEF) on mobile */
function FieldRows({
  cards,
  size,
  selectedId,
  isAttackTarget,
  onCardClick,
  isPlayerSide,
  animatingAction,
  summonCardId,
  attackMotion,
  defendersBlocking,
  onCardDrop,
  onPreviewCard,
  onAttackDragStart,
  onAttackDragMove,
  onAttackDragEnd,
  attackEnabled,
}: {
  cards: CardInstance[]
  size: 'sm' | 'md' | 'lg'
  selectedId?: string | null
  isAttackTarget?: boolean
  onCardClick: (card: CardInstance) => void
  isPlayerSide?: boolean
  animatingAction?: GameAction | null
  summonCardId?: string | null
  attackMotion?: Record<string, CSSProperties>
  defendersBlocking?: boolean
  onCardDrop?: (targetCard: CardInstance, attackerId: string) => void
  onPreviewCard?: (card: CardInstance) => void
  onAttackDragStart?: (attackerId: string, x: number, y: number) => void
  onAttackDragMove?: (x: number, y: number) => void
  onAttackDragEnd?: () => void
  attackEnabled?: boolean
}) {
  const atkCards = cards.filter(c => c.definition.type === 'program')
  const defCards = cards.filter(c => c.definition.type !== 'program')

  const renderRow = (rowCards: CardInstance[], label: string, color: string) => (
    <div className="flex items-center gap-0.5 w-full relative">
      <span
        className="text-[9px] md:text-[10px] font-mono font-bold w-10 text-center flex-shrink-0"
        style={{ color }}
      >
        {label}
      </span>
      <div className="field-row flex-1 flex items-center justify-center relative">
        {rowCards.map((card) => {
          const canAttack = Boolean(isPlayerSide && attackEnabled && !card.isExhausted && card.currentStrength > 0)
          const directAttackReady = Boolean(canAttack && (!defendersBlocking || cardHasPierce(card)))
          const draggable = Boolean(isPlayerSide && canAttack)
          let animationClass = ''
          if (animatingAction?.type === 'attack') {
            if (card.instanceId === animatingAction.attackerInstanceId) {
              animationClass = isPlayerSide ? 'anim-attacking' : 'anim-attacking-right'
            }
            if (card.instanceId === animatingAction.targetInstanceId) {
              animationClass = 'anim-damage'
            }
          }
          if (animatingAction?.type === 'direct_attack' && card.instanceId === animatingAction.attackerInstanceId) {
            animationClass = isPlayerSide ? 'anim-attacking' : 'anim-attacking-right'
          }
          if (summonCardId && card.instanceId === summonCardId) {
            animationClass = 'anim-summon'
          }
          return (
            <div
              key={card.instanceId}
              draggable={draggable}
              onDragStart={(e) => {
                if (!draggable) return
                e.dataTransfer.setData('attackerInstanceId', card.instanceId)
                e.dataTransfer.effectAllowed = 'move'
                onAttackDragStart?.(card.instanceId, e.clientX, e.clientY)
              }}
              onDrag={(e) => {
                if (e.clientX && e.clientY) onAttackDragMove?.(e.clientX, e.clientY)
              }}
              onDragOver={(e) => {
                if (!onCardDrop) return
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
              }}
              onDrop={(e) => {
                if (!onCardDrop) return
                e.preventDefault()
                const attackerId = e.dataTransfer.getData('attackerInstanceId')
                if (attackerId) onCardDrop(card, attackerId)
                onAttackDragEnd?.()
              }}
              onDragEnd={() => onAttackDragEnd?.()}
            >
              <GameCard
                card={card}
                size={size}
                isExhausted={card.isExhausted}
                dimExhausted={Boolean(isPlayerSide && attackEnabled)}
                isSelected={selectedId === card.instanceId}
                isAttackTarget={isAttackTarget}
                canAttack={canAttack}
                directAttackReady={directAttackReady}
                animationClass={animationClass}
                animationStyle={attackMotion?.[card.instanceId]}
                onLongPress={() => onPreviewCard?.(card)}
                onClick={() => onCardClick(card)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop: single combined row */}
      <div className="hidden md:flex items-center gap-0.5 w-full relative">
        <div className="field-row flex-1 flex items-center justify-center relative">
          {/* Attack arrow indicator */}
          {isPlayerSide && selectedId && (
            <div
              className="absolute -right-8 top-1/2 -translate-y-1/2 text-2xl animate-pulse"
              style={{
                color: 'var(--neon-red)',
                textShadow: '0 0 10px var(--neon-red), 0 0 20px var(--neon-red)',
                animation: 'attack-lunge 0.5s ease-in-out infinite',
              }}
            >
              ➔
            </div>
          )}
          {cards.map((card) => {
            // Only programs with strength > 0 can attack
            const canAttack = Boolean(isPlayerSide && attackEnabled && !card.isExhausted && card.currentStrength > 0)
            const directAttackReady = Boolean(canAttack && (!defendersBlocking || cardHasPierce(card)))
            const draggable = Boolean(isPlayerSide && canAttack)
            let animationClass = ''
            if (animatingAction?.type === 'attack') {
              if (card.instanceId === animatingAction.attackerInstanceId) {
                animationClass = isPlayerSide ? 'anim-attacking' : 'anim-attacking-right'
              }
              if (card.instanceId === animatingAction.targetInstanceId) {
                animationClass = 'anim-damage'
              }
            }
            if (animatingAction?.type === 'direct_attack' && card.instanceId === animatingAction.attackerInstanceId) {
              animationClass = isPlayerSide ? 'anim-attacking' : 'anim-attacking-right'
            }
            if (summonCardId && card.instanceId === summonCardId) {
              animationClass = 'anim-summon'
            }
            return (
              <div
                key={card.instanceId}
                draggable={draggable}
                onDragStart={(e) => {
                  if (!draggable) return
                  e.dataTransfer.setData('attackerInstanceId', card.instanceId)
                  e.dataTransfer.effectAllowed = 'move'
                  onAttackDragStart?.(card.instanceId, e.clientX, e.clientY)
                }}
                onDrag={(e) => {
                  if (e.clientX && e.clientY) onAttackDragMove?.(e.clientX, e.clientY)
                }}
                onDragOver={(e) => {
                  if (!onCardDrop) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                }}
                onDrop={(e) => {
                  if (!onCardDrop) return
                  e.preventDefault()
                  const attackerId = e.dataTransfer.getData('attackerInstanceId')
                  if (attackerId) onCardDrop(card, attackerId)
                  onAttackDragEnd?.()
                }}
                onDragEnd={() => onAttackDragEnd?.()}
              >
                <GameCard
                  card={card}
                  size={size}
                  isExhausted={card.isExhausted}
                  dimExhausted={Boolean(isPlayerSide && attackEnabled)}
                  isSelected={selectedId === card.instanceId}
                  isAttackTarget={isAttackTarget}
                  canAttack={canAttack}
                  directAttackReady={directAttackReady}
                  animationClass={animationClass}
                  animationStyle={attackMotion?.[card.instanceId]}
                  onLongPress={() => onPreviewCard?.(card)}
                  onClick={() => onCardClick(card)}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile: two rows - ATK on top, DEF on bottom */}
      <div className="md:hidden flex flex-col gap-1 w-full">
        {atkCards.length > 0 && renderRow(atkCards, 'ATK', '#ff4444')}
        {defCards.length > 0 && renderRow(defCards, 'DEF', '#4488ff')}
      </div>
    </>
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
  const [playingCardId, setPlayingCardId] = useState<string | null>(null)
  const [drawnCardIds, setDrawnCardIds] = useState<string[]>([])
  const [summonCardId, setSummonCardId] = useState<string | null>(null)
  const [activeAnimationAction, setActiveAnimationAction] = useState<GameAction | null>(null)
  const [attackMotion, setAttackMotion] = useState<Record<string, CSSProperties>>({})
  const [fieldDropActive, setFieldDropActive] = useState(false)
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [showGameOver, setShowGameOver] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [previewCard, setPreviewCard] = useState<CardInstance | null>(null)
  const [dragAim, setDragAim] = useState<{
    attackerId: string
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null>(null)
  const [directDropHighlight, setDirectDropHighlight] = useState(false)
  const [dragCanDirect, setDragCanDirect] = useState(false)
  const [viewport, setViewport] = useState({ width: 1920, height: 1080 })
  const prevPlayerHandRef = useRef<string[]>(initialState.player.hand.map(c => c.instanceId))
  const suppressNextEngineAnimationRef = useRef(false)

  const isPlayerTurn = gameState.activePlayer === playerSide

  const createAttackMotion = useCallback((
    attackerId: string,
    targetInstanceId: string | null,
    directTargetSide: PlayerSide
  ): CSSProperties | null => {
    const attackerEl = document.querySelector(`[data-instance-id="${attackerId}"]`) as HTMLElement | null
    if (!attackerEl) return null

    let targetEl: HTMLElement | null = null
    if (targetInstanceId) {
      targetEl = document.querySelector(`[data-instance-id="${targetInstanceId}"]`) as HTMLElement | null
    }
    if (!targetEl) {
      const anchor = directTargetSide === 'opponent' ? 'opponent-name' : 'player-name'
      targetEl = document.querySelector(`[data-attack-anchor="${anchor}"]`) as HTMLElement | null
    }
    if (!targetEl) return null

    const a = attackerEl.getBoundingClientRect()
    const t = targetEl.getBoundingClientRect()
    const dx = t.left + t.width / 2 - (a.left + a.width / 2)
    const dy = t.top + t.height / 2 - (a.top + a.height / 2)

    return {
      ['--attack-x' as string]: `${Math.round(dx)}px`,
      ['--attack-y' as string]: `${Math.round(dy)}px`,
    } as CSSProperties
  }, [])

  const startAttackDragAim = useCallback((attackerId: string, x: number, y: number) => {
    const el = document.querySelector(`[data-instance-id="${attackerId}"]`) as HTMLElement | null
    if (!el) return
    const r = el.getBoundingClientRect()
    const startX = r.left + r.width / 2
    const startY = r.top + r.height / 2

    const p = playerSide === 'player' ? gameState.player : gameState.opponent
    const attacker = p.field.find(c => c.instanceId === attackerId)
    const opp = playerSide === 'player' ? gameState.opponent : gameState.player
    const oppHasDefenders = opp.field.some(isDefenderUnit)
    setDragCanDirect(Boolean(attacker && (!oppHasDefenders || cardHasPierce(attacker))))

    setDragAim({ attackerId, startX, startY, currentX: x, currentY: y })
  }, [gameState.player, gameState.opponent, playerSide])

  const moveAttackDragAim = useCallback((x: number, y: number) => {
    setDragAim(prev => prev ? { ...prev, currentX: x, currentY: y } : prev)
  }, [])

  const endAttackDragAim = useCallback(() => {
    setDragAim(null)
    setDirectDropHighlight(false)
    setDragCanDirect(false)
  }, [])

  // Keep local board state in sync with remote state updates (multiplayer)
  useEffect(() => {
    setGameState(initialState)
    if (isMultiplayer) {
      setSelectionMode('none')
      setSelectedAttacker(null)
    }
  }, [initialState, isMultiplayer])

  // Convert engine action flag into short-lived visual animation state
  useEffect(() => {
    if (!gameState.animatingAction) return
    if (suppressNextEngineAnimationRef.current) {
      suppressNextEngineAnimationRef.current = false
      return
    }
    setActiveAnimationAction(gameState.animatingAction)
    const timer = setTimeout(() => setActiveAnimationAction(null), 450)
    return () => clearTimeout(timer)
  }, [gameState.animatingAction])

  useEffect(() => {
    const updateViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    }
    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  // Build attack motion vectors so attacker moves toward exact target
  useEffect(() => {
    if (!activeAnimationAction || activeAnimationAction.type !== 'attack') {
      setAttackMotion({})
      return
    }

    const attackerId = activeAnimationAction.attackerInstanceId
    const targetId = activeAnimationAction.targetInstanceId
    const style = createAttackMotion(attackerId, targetId, activeAnimationAction.playerSide === 'player' ? 'opponent' : 'player')
    if (!style) return

    setAttackMotion({
      [attackerId]: style,
    })

    const timer = setTimeout(() => setAttackMotion({}), 520)
    return () => clearTimeout(timer)
  }, [activeAnimationAction, createAttackMotion])

  // Build attack motion for direct attacks (to opponent/player name anchor)
  useEffect(() => {
    if (!activeAnimationAction || activeAnimationAction.type !== 'direct_attack') return
    const attackerId = activeAnimationAction.attackerInstanceId
    const style = createAttackMotion(
      attackerId,
      null,
      activeAnimationAction.playerSide === 'player' ? 'opponent' : 'player'
    )
    if (!style) return
    setAttackMotion({ [attackerId]: style })
    const timer = setTimeout(() => setAttackMotion({}), 520)
    return () => clearTimeout(timer)
  }, [activeAnimationAction, createAttackMotion])

  // Detect drawn cards to animate deck -> hand
  useEffect(() => {
    const currentHandIds = gameState.player.hand.map(c => c.instanceId)
    const previousHandIds = prevPlayerHandRef.current
    const newCards = currentHandIds.filter(id => !previousHandIds.includes(id))
    prevPlayerHandRef.current = currentHandIds
    if (newCards.length > 0) {
      setDrawnCardIds(newCards)
      const timer = setTimeout(() => setDrawnCardIds([]), 700)
      return () => clearTimeout(timer)
    }
  }, [gameState.player.hand])

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

        if (action.type === 'attack' || action.type === 'direct_attack') {
          const directTargetSide = action.playerSide === 'player' ? 'opponent' : 'player'
          const style = action.type === 'attack'
            ? createAttackMotion(action.attackerInstanceId, action.targetInstanceId, directTargetSide)
            : createAttackMotion(action.attackerInstanceId, null, directTargetSide)

          suppressNextEngineAnimationRef.current = true
          setActiveAnimationAction(action)
          if (style) setAttackMotion({ [action.attackerInstanceId]: style })

          const resolveTimer = setTimeout(() => {
            if (cancelled) return
            currentState = processAction(currentState, action)
            setGameState({ ...currentState })
          }, 1000)
          timerIds.push(resolveTimer)

          const clearAnimTimer = setTimeout(() => {
            if (cancelled) return
            setActiveAnimationAction(null)
            setAttackMotion({})
          }, 1100)
          timerIds.push(clearAnimTimer)
        } else {
          currentState = processAction(currentState, action)
          setGameState({ ...currentState })
        }

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
  }, [gameState.activePlayer, isMultiplayer, gameState.phase, createAttackMotion]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle playing a card from hand with animation
  const handlePlayCard = useCallback((instanceId: string) => {
    if (!isPlayerTurn || gameState.phase === 'game_over') return
    if (!canPlayCard(gameState, playerSide, instanceId)) return

    // Start the play animation
    setPlayingCardId(instanceId)
    
    // After animation completes, actually play the card
    setTimeout(() => {
      const newState = processAction(gameState, {
        type: 'play_card',
        cardInstanceId: instanceId,
        playerSide,
      })
      setGameState(newState)
      setSummonCardId(instanceId)
      onAction?.(newState, {
        type: 'play_card',
        cardInstanceId: instanceId,
        playerSide,
      })
      setPlayingCardId(null)
      setTimeout(() => setSummonCardId(null), 450)
    }, 500)
  }, [gameState, isPlayerTurn, playerSide, onAction])

  // Handle selecting a card on field to attack with
  const handleSelectFieldCard = useCallback((instanceId: string) => {
    if (!isPlayerTurn || gameState.phase === 'game_over') return

    const player = playerSide === 'player' ? gameState.player : gameState.opponent
    const card = player.field.find(c => c.instanceId === instanceId)
    if (!card || card.isExhausted) return
    if (card.currentStrength <= 0) return

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
    const attackerId = selectedAttacker

    // If shielded defenders exist (firewall > 0), only they can be targeted unless attacker can pierce
    const playerState = playerSide === 'player' ? gameState.player : gameState.opponent
    const attacker = playerState.field.find(c => c.instanceId === attackerId)
    const attackerCanPierce = Boolean(attacker && cardHasPierce(attacker))
    const opp = playerSide === 'player' ? gameState.opponent : gameState.player
    const defenders = opp.field.filter(isDefenderUnit)
    if (defenders.length > 0 && !attackerCanPierce && !defenders.some(c => c.instanceId === targetInstanceId)) {
      return
    }

    const style = createAttackMotion(attackerId, targetInstanceId, playerSide === 'player' ? 'opponent' : 'player')

    const executeAttack = () => {
      const newState = processAction(gameState, {
        type: 'attack',
        attackerInstanceId: attackerId,
        targetInstanceId,
        playerSide,
      })
      setGameState(newState)
      onAction?.(newState, {
        type: 'attack',
        attackerInstanceId: attackerId,
        targetInstanceId,
        playerSide,
      })
    }

    // lock selection immediately to avoid double click actions
    setSelectionMode('none')
    setSelectedAttacker(null)

    suppressNextEngineAnimationRef.current = true
    setActiveAnimationAction({
      type: 'attack',
      attackerInstanceId: attackerId,
      targetInstanceId,
      playerSide,
    })
    if (style) {
      setAttackMotion({ [attackerId]: style })
    }

    setTimeout(executeAttack, 420)
    setTimeout(() => {
      setActiveAnimationAction(null)
      setAttackMotion({})
    }, 520)
  }, [gameState, selectedAttacker, playerSide, onAction, createAttackMotion])

  const performAttackFromDrag = useCallback((attackerId: string, targetId: string) => {
    const playerState = playerSide === 'player' ? gameState.player : gameState.opponent
    const attacker = playerState.field.find(c => c.instanceId === attackerId)
    if (!attacker || attacker.isExhausted || attacker.currentStrength <= 0) return
    const attackerCanPierce = cardHasPierce(attacker)

    // enforce defense targeting rule
    const opp = playerSide === 'player' ? gameState.opponent : gameState.player
    const defenders = opp.field.filter(isDefenderUnit)
    if (defenders.length > 0 && !attackerCanPierce && !defenders.some(c => c.instanceId === targetId)) return

    const style = createAttackMotion(attackerId, targetId, playerSide === 'player' ? 'opponent' : 'player')

    const executeAttack = () => {
      const newState = processAction(gameState, {
        type: 'attack',
        attackerInstanceId: attackerId,
        targetInstanceId: targetId,
        playerSide,
      })
      setGameState(newState)
      onAction?.(newState, {
        type: 'attack',
        attackerInstanceId: attackerId,
        targetInstanceId: targetId,
        playerSide,
      })
    }

    setSelectionMode('none')
    setSelectedAttacker(null)

    suppressNextEngineAnimationRef.current = true
    setActiveAnimationAction({
      type: 'attack',
      attackerInstanceId: attackerId,
      targetInstanceId: targetId,
      playerSide,
    })
    if (style) {
      setAttackMotion({ [attackerId]: style })
    }
    setTimeout(executeAttack, 420)
    setTimeout(() => {
      setActiveAnimationAction(null)
      setAttackMotion({})
    }, 520)
  }, [gameState, playerSide, onAction, createAttackMotion])

  const performDirectAttackFromDrag = useCallback((attackerId: string) => {
    const playerState = playerSide === 'player' ? gameState.player : gameState.opponent
    const attacker = playerState.field.find(c => c.instanceId === attackerId)
    if (!attacker || attacker.isExhausted || attacker.currentStrength <= 0) return
    const attackerCanPierce = cardHasPierce(attacker)

    const opp = playerSide === 'player' ? gameState.opponent : gameState.player
    const defenders = opp.field.filter(isDefenderUnit)
    if (defenders.length > 0 && !attackerCanPierce) return

    const style = createAttackMotion(attackerId, null, playerSide === 'player' ? 'opponent' : 'player')

    const executeDirect = () => {
      const newState = processAction(gameState, {
        type: 'direct_attack',
        attackerInstanceId: attackerId,
        playerSide,
      })
      setGameState(newState)
      onAction?.(newState, {
        type: 'direct_attack',
        attackerInstanceId: attackerId,
        playerSide,
      })
    }

    setSelectionMode('none')
    setSelectedAttacker(null)

    suppressNextEngineAnimationRef.current = true
    setActiveAnimationAction({
      type: 'direct_attack',
      attackerInstanceId: attackerId,
      playerSide,
    })
    if (style) {
      setAttackMotion({ [attackerId]: style })
    }
    setTimeout(executeDirect, 420)
    setTimeout(() => {
      setActiveAnimationAction(null)
      setAttackMotion({})
    }, 520)
  }, [gameState, playerSide, onAction, createAttackMotion])

  // Handle direct attack
  const handleDirectAttack = useCallback(() => {
    if (!selectedAttacker) return
    const attackerId = selectedAttacker

    const playerState = playerSide === 'player' ? gameState.player : gameState.opponent
    const attacker = playerState.field.find(c => c.instanceId === attackerId)
    const attackerCanPierce = Boolean(attacker && cardHasPierce(attacker))
    const opponent = playerSide === 'player' ? gameState.opponent : gameState.player
    const hasDefenders = opponent.field.some(isDefenderUnit)
    if (hasDefenders && !attackerCanPierce) return

    const style = createAttackMotion(attackerId, null, playerSide === 'player' ? 'opponent' : 'player')

    const executeDirect = () => {
      const newState = processAction(gameState, {
        type: 'direct_attack',
        attackerInstanceId: attackerId,
        playerSide,
      })
      setGameState(newState)
      onAction?.(newState, {
        type: 'direct_attack',
        attackerInstanceId: attackerId,
        playerSide,
      })
    }

    setSelectionMode('none')
    setSelectedAttacker(null)

    suppressNextEngineAnimationRef.current = true
    setActiveAnimationAction({
      type: 'direct_attack',
      attackerInstanceId: attackerId,
      playerSide,
    })
    if (style) {
      setAttackMotion({ [attackerId]: style })
    }
    setTimeout(executeDirect, 420)
    setTimeout(() => {
      setActiveAnimationAction(null)
      setAttackMotion({})
    }, 520)
  }, [gameState, selectedAttacker, playerSide, onAction, createAttackMotion])

  // End turn
  const handleEndTurn = useCallback(() => {
    if (!isPlayerTurn) return

    const newState = processAction(gameState, {
      type: 'end_turn',
      playerSide,
    })
    setGameState(newState)
    onAction?.(newState, {
      type: 'end_turn',
      playerSide,
    })
    setSelectionMode('none')
    setSelectedAttacker(null)
  }, [gameState, isPlayerTurn, playerSide, onAction])

  const player = playerSide === 'player' ? gameState.player : gameState.opponent
  const opponent = playerSide === 'player' ? gameState.opponent : gameState.player

  const hasDefenders = opponent.field.some(isDefenderUnit)
  const selectedAttackerCard = selectedAttacker
    ? player.field.find(c => c.instanceId === selectedAttacker)
    : null
  const selectedCanDirect = selectionMode === 'selecting_target'
    && Boolean(selectedAttackerCard)
    && (!hasDefenders || (selectedAttackerCard ? cardHasPierce(selectedAttackerCard) : false))

  return (
    <div className="game-board netrun-theme flex flex-col h-[calc(100dvh-4rem)] overflow-hidden relative">
      {/* Animated background layers */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Player zone glow */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3" style={{
          background: 'radial-gradient(ellipse at 50% 100%, rgba(0, 255, 255, 0.08) 0%, transparent 70%)',
        }} />
        {/* Opponent zone glow */}
        <div className="absolute top-0 left-0 right-0 h-1/3" style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 0, 255, 0.08) 0%, transparent 70%)',
        }} />
      </div>

      {/* ===== Opponent Stats ===== */}
      <div
        className="flex-shrink-0 px-2 pt-1 md:px-4 md:pt-2 relative z-10"
        onDragOver={(e) => {
          if (dragCanDirect) {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            setDirectDropHighlight(true)
          }
        }}
        onDragLeave={() => setDirectDropHighlight(false)}
        onDrop={(e) => {
          if (!dragCanDirect) return
          e.preventDefault()
          const attackerId = e.dataTransfer.getData('attackerInstanceId')
          if (attackerId) performDirectAttackFromDrag(attackerId)
          endAttackDragAim()
        }}
      >
        <PlayerStats
          name={isMultiplayer ? 'Oponente' : 'Corp AI'}
          hp={opponent.systemIntegrity}
          maxHp={20}
          ram={opponent.currentRam}
          maxRam={opponent.maxRam}
          shield={opponent.shield}
          deckCount={opponent.deck.length}
          graveyardCount={opponent.graveyard.length}
          isActive={!isPlayerTurn}
          side="opponent"
          directDropHighlight={directDropHighlight}
        />
      </div>

      {/* ===== Opponent Hand (compact indicators) ===== */}
      <div className="flex-shrink-0 flex items-center justify-center gap-1.5 py-0.5 relative z-10">
        {opponent.hand.map((card, i) => (
          <div
            key={card.instanceId || i}
            className="opponent-hand-indicator"
            style={{ animation: 'none' }}
          />
        ))}
        {opponent.hand.length === 0 && (
          <span className="text-[8px] font-mono" style={{ color: 'var(--cyber-muted)' }}>
            {'// sin cartas'}
          </span>
        )}
      </div>

      {/* ===== Opponent Field (ATK / DEF rows) ===== */}
      <div
        className={`flex-1 min-h-0 px-2 md:px-4 flex flex-col justify-center relative z-10 ${
          selectionMode === 'selecting_target' ? '' : ''
        }`}
        onClick={selectedCanDirect ? handleDirectAttack : undefined}
      >
      {opponent.field.length === 0 ? (
          <div className="field-zone-compact w-full flex items-center justify-center p-2">
            <p
              className={`text-xs font-mono ${selectionMode === 'selecting_target' ? 'anim-power' : ''}`}
              style={{
                color: selectionMode === 'selecting_target' ? 'var(--neon-red)' : 'var(--cyber-muted)',
                textShadow: selectionMode === 'selecting_target' ? '0 0 10px var(--neon-red)' : 'none',
              }}
              >
              {selectionMode === 'selecting_target'
                ? (selectedCanDirect ? '⚠️ ATAQUE DIRECTO DISPONIBLE' : '🛡️ DEBES ATACAR CARTAS CON ESCUDO')
                : '// campo vacío'}
            </p>
          </div>
        ) : (
          <FieldRows
            cards={opponent.field}
            size="sm"
            isAttackTarget={selectionMode === 'selecting_target'}
            animatingAction={activeAnimationAction}
            summonCardId={summonCardId}
            attackMotion={attackMotion}
            onCardDrop={(targetCard, attackerId) => performAttackFromDrag(attackerId, targetCard.instanceId)}
            onPreviewCard={setPreviewCard}
            onAttackDragStart={startAttackDragAim}
            onAttackDragMove={moveAttackDragAim}
            onAttackDragEnd={endAttackDragAim}
            attackEnabled={false}
            onCardClick={(card) => {
              if (selectionMode === 'selecting_target') {
                handleAttackTarget(card.instanceId)
              }
            }}
            isPlayerSide={false}
          />
        )}
      </div>

      {/* ===== Center Bar (turn info + actions) - TRUE CENTER OF BOARD ===== */}
      <div className="flex-shrink-0 relative z-30">
        {/* Glowing horizon line at center */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px" style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 0, 255, 0.8) 20%, rgba(0, 255, 255, 1) 50%, rgba(255, 0, 255, 0.8) 80%, transparent 100%)',
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
        }} />
        
        <div className="relative px-4 py-2 flex items-center justify-center gap-3 md:gap-4" style={{
          background: 'linear-gradient(180deg, rgba(10, 10, 26, 0.9) 0%, rgba(5, 5, 16, 0.95) 100%)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(0, 255, 255, 0.2)',
          borderBottom: '1px solid rgba(255, 0, 255, 0.2)',
        }}>
          <span
            className="text-xs md:text-sm font-bold px-3 py-1 rounded"
            style={{
              fontFamily: 'var(--font-michroma)',
              background: 'rgba(0, 0, 0, 0.6)',
              border: '1px solid rgba(0, 255, 255, 0.4)',
              color: 'var(--neon-cyan)',
              textShadow: '0 0 8px var(--neon-cyan)',
            }}
          >
            T{gameState.turn}
          </span>
          
          <span
            className={`text-base md:text-lg font-bold px-6 py-2 rounded-lg ${
              isPlayerTurn ? 'anim-turn-start' : ''
            }`}
            style={{
              fontFamily: 'var(--font-michroma)',
              background: isPlayerTurn
                ? 'rgba(0, 255, 255, 0.2)'
                : isAIThinking
                  ? 'rgba(255, 0, 255, 0.2)'
                  : 'rgba(255, 0, 255, 0.15)',
              border: isPlayerTurn
                ? '2px solid var(--neon-cyan)'
                : '2px solid var(--neon-magenta)',
              color: isPlayerTurn ? 'var(--neon-cyan)' : 'var(--neon-magenta)',
              textShadow: '0 0 15px currentColor',
              boxShadow: isPlayerTurn
                ? '0 0 30px rgba(0, 255, 255, 0.5), inset 0 0 15px rgba(0, 255, 255, 0.1)'
                : '0 0 20px rgba(255, 0, 255, 0.3)',
            }}
          >
            {isPlayerTurn ? '⚡ TU TURNO' : isAIThinking ? '🤖 AI...' : '🔴 RIVAL'}
          </span>
          
          {isPlayerTurn && (
            <button
              onClick={handleEndTurn}
              className="cyber-btn text-sm py-2 px-6 font-bold rounded-lg transition-all duration-300 hover:scale-105"
              style={{
                fontFamily: 'var(--font-michroma)',
                background: 'linear-gradient(135deg, rgba(5, 10, 25, 0.95), rgba(0, 90, 110, 0.55))',
                border: '2px solid rgba(0, 255, 255, 0.65)',
                color: '#e8ffff',
                textShadow: '0 0 8px rgba(0, 255, 255, 0.7)',
                boxShadow: '0 0 18px rgba(0, 255, 255, 0.35), inset 0 0 8px rgba(0, 255, 255, 0.15)',
              }}
            >
              TERMINAR TURNO
            </button>
          )}
        </div>
      </div>

      {/* ===== Player Field - Drop zone for cards ===== */}
      <div
        className={`flex-1 min-h-0 px-2 md:px-4 flex flex-col justify-center relative z-10 ${fieldDropActive ? 'field-drop-active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          setFieldDropActive(true)
        }}
        onDragLeave={() => setFieldDropActive(false)}
        onDrop={(e) => {
          e.preventDefault()
          setFieldDropActive(false)
          const cardInstanceId = e.dataTransfer.getData('cardInstanceId')
          if (cardInstanceId && player.field.length < MAX_FIELD_SIZE) {
            handlePlayCard(cardInstanceId)
          }
        }}
      >
        {player.field.length === 0 ? (
          <div className="field-zone-compact active w-full flex items-center justify-center p-2">
            <p className="text-xs font-mono" style={{ color: 'var(--cyber-muted)', opacity: 0.5 }}>
              Arrastra cartas aquí
            </p>
          </div>
        ) : (
          <FieldRows
            cards={player.field}
            size="sm"
            selectedId={selectedAttacker}
            animatingAction={activeAnimationAction}
            summonCardId={summonCardId}
            attackMotion={attackMotion}
            defendersBlocking={hasDefenders}
            onCardDrop={(targetCard, attackerId) => {
              // allow dragging onto own field only if attacker belongs to opponent in multiplayer edge cases
              if (playerSide !== 'player') performAttackFromDrag(attackerId, targetCard.instanceId)
            }}
            onPreviewCard={setPreviewCard}
            onAttackDragStart={startAttackDragAim}
            onAttackDragMove={moveAttackDragAim}
            onAttackDragEnd={endAttackDragAim}
            attackEnabled={isPlayerTurn}
            onCardClick={(card) => handleSelectFieldCard(card.instanceId)}
            isPlayerSide
          />
        )}
      </div>

      {/* ===== Player Hand - TRUE FAN layout ===== */}
      <div className="flex-shrink-0 relative z-40 -mt-2 overflow-visible">
        <div className="hand-area hand-fan relative flex justify-center items-end" style={{
          perspective: '1200px',
          minHeight: '200px',
        }}>
          {player.hand.map((card, idx) => {
            const playable = isPlayerTurn && canPlayCard(gameState, playerSide, card.instanceId)
            const isPlaying = playingCardId === card.instanceId
            const totalCards = player.hand.length
            
            // Calculate fan position - center the hand
            const offset = idx - Math.floor((totalCards - 1) / 2)
            
            // Tighter fan angles
            const rotation = offset * (totalCards > 5 ? 2 : 3)
            const translateX = offset * (totalCards > 5 ? 12 : 16)
            const translateY = Math.abs(offset) * (totalCards > 5 ? 4 : 5)
            const scale = isPlaying ? 1.2 : 1 - Math.abs(offset) * 0.03
            const zIndex = 100 + totalCards - Math.abs(offset) + (isPlaying ? 200 : 0)
            
            return (
              <div
                key={card.instanceId}
                className="transition-all duration-500 origin-bottom"
                style={{
                  transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotation}deg) scale(${scale})`,
                  zIndex,
                  filter: playable ? 'none' : 'grayscale(0.8) brightness(0.5)',
                  opacity: playable || isPlaying ? 1 : 0.65,
                  cursor: playable ? 'grab' : 'not-allowed',
                }}
                draggable={playable}
                onDragStart={(e) => {
                  if (playable) {
                    e.dataTransfer.setData('cardInstanceId', card.instanceId)
                    e.dataTransfer.effectAllowed = 'move'
                  }
                }}
              >
                <div
                  style={{
                    animation: isPlaying
                      ? 'card-play-to-field 0.5s ease-in forwards'
                      : drawnCardIds.includes(card.instanceId)
                        ? `card-draw-from-deck 0.6s ease-out ${idx * 0.05}s both`
                        : 'none',
                  }}
                >
                  <GameCard
                    card={card}
                    size="md"
                    isPlayable={playable}
                    isPlaying={isPlaying}
                    onLongPress={() => setPreviewCard(card)}
                    onClick={() => playable ? handlePlayCard(card.instanceId) : undefined}
                  />
                </div>
                {playable && !isPlaying && (
                  <div
                    className="absolute inset-0 rounded-lg pointer-events-none"
                    style={{
                      animation: 'card-float 2.5s ease-in-out infinite',
                      animationDelay: `${idx * 0.3}s`,
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ===== Player Stats ===== */}
      <div className="flex-shrink-0 px-2 pb-1 md:px-4 md:pb-2 relative z-20">
        <PlayerStats
          name="Runner"
          hp={player.systemIntegrity}
          maxHp={20}
          ram={player.currentRam}
          maxRam={player.maxRam}
          shield={player.shield}
          deckCount={player.deck.length}
          graveyardCount={player.graveyard.length}
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

      {/* ===== Drag Aim Arrow (Hearthstone-like) ===== */}
      {dragAim && (
        <svg
          className="pointer-events-none fixed inset-0 z-[120]"
          width="100vw"
          height="100vh"
          viewBox={`0 0 ${viewport.width} ${viewport.height}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="attackAimGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255, 0, 68, 0.2)" />
              <stop offset="40%" stopColor="rgba(255, 0, 68, 0.6)" />
              <stop offset="100%" stopColor="rgba(255, 170, 170, 1)" />
            </linearGradient>
            <filter id="attackAimGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <marker id="attackAimArrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
              <path d="M0,0 L12,6 L0,12 L3,6 z" fill="rgba(255, 120, 120, 1)" />
            </marker>
          </defs>
          <line
            x1={dragAim.startX}
            y1={dragAim.startY}
            x2={dragAim.currentX}
            y2={dragAim.currentY}
            stroke="url(#attackAimGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            markerEnd="url(#attackAimArrow)"
            filter="url(#attackAimGlow)"
          />
        </svg>
      )}

      {/* ===== Card Preview Modal (1s press) ===== */}
      {previewCard && (
        <div className="cyber-modal-overlay" onClick={() => setPreviewCard(null)}>
          <div className="cyber-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 text-center">
              <p className="text-xs" style={{ color: 'var(--cyber-muted)' }}>Vista de carta</p>
            </div>
            <div className="flex justify-center">
              <GameCard card={previewCard} size="xl" />
            </div>
            <div className="mt-4 text-center">
              <button className="cyber-btn text-xs" onClick={() => setPreviewCard(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Game Over Modal - EPIC ===== */}
      {showGameOver && (
        <div
          className="cyber-modal-overlay relative z-50"
          onClick={() => setShowGameOver(false)}
          style={{
            animation: gameState.winner === playerSide ? 'none' : 'glitch 0.5s steps(2, start)',
          }}
        >
          <div
            className="cyber-modal text-center relative overflow-hidden"
            onClick={e => e.stopPropagation()}
            style={{
              background: gameState.winner === playerSide
                ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 100, 100, 0.3))'
                : 'linear-gradient(135deg, rgba(255, 0, 0, 0.2), rgba(100, 0, 0, 0.3))',
              border: gameState.winner === playerSide
                ? '2px solid var(--neon-cyan)'
                : '2px solid var(--neon-red)',
              boxShadow: gameState.winner === playerSide
                ? '0 0 60px rgba(0, 255, 255, 0.4), inset 0 0 40px rgba(0, 255, 255, 0.1)'
                : '0 0 60px rgba(255, 0, 68, 0.4), inset 0 0 40px rgba(255, 0, 68, 0.1)',
            }}
          >
            {/* Animated background particles for victory */}
            {gameState.winner === playerSide && (
              <>
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-cyan-400"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animation: `float ${2 + Math.random() * 3}s ease-in-out infinite`,
                      animationDelay: `${Math.random() * 2}s`,
                      opacity: Math.random() * 0.5 + 0.3,
                    }}
                  />
                ))}
              </>
            )}

            {/* Defeat glitch overlay */}
            {gameState.winner !== playerSide && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 0, 0, 0.1) 2px, rgba(255, 0, 0, 0.1) 4px)',
                  animation: 'scanline 0.5s linear infinite',
                }}
              />
            )}

            <div className="mb-4 relative z-10">
              {gameState.winner === playerSide ? (
                <>
                  <p className="text-5xl mb-3 animate-bounce">🏆</p>
                  <h2
                    className="text-3xl font-bold font-mono mb-2"
                    style={{
                      background: 'linear-gradient(135deg, #00ffff 0%, #ffffff 50%, #00ff41 100%)',
                      backgroundSize: '200% 200%',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      animation: 'gradient-shift 3s ease infinite',
                      filter: 'drop-shadow(0 0 20px rgba(0, 255, 255, 0.6))',
                    }}
                  >
                    ⚡ VICTORIA
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--cyber-text)' }}>
                    Has hackeado el sistema enemigo
                  </p>
                  <p className="text-xs mt-2 font-mono" style={{ color: 'var(--neon-green)' }}>
                    SISTEMA COMPROMETIDO ✓
                  </p>
                </>
              ) : (
                <>
                  <p className="text-5xl mb-3">💀</p>
                  <h2
                    className="text-3xl font-bold font-mono mb-2 anim-glitch"
                    style={{
                      color: 'var(--neon-red)',
                      textShadow: '0 0 20px rgba(255, 0, 68, 0.8)',
                    }}
                  >
                    ⚠️ DESCONECTADO
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--cyber-text)' }}>
                    Tu sistema ha sido comprometido
                  </p>
                  <p className="text-xs mt-2 font-mono" style={{ color: 'var(--neon-red)' }}>
                    ERROR CRÍTICO DEL SISTEMA
                  </p>
                </>
              )}
            </div>

            {/* Stats summary */}
            <div className="mb-4 p-3 rounded" style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <div className="flex justify-center gap-6 text-xs font-mono">
                <div>
                  <p className="text-[10px]" style={{ color: 'var(--cyber-muted)' }}>TURNOS</p>
                  <p className="text-lg font-bold neon-text-cyan">{gameState.turn}</p>
                </div>
                <div>
                  <p className="text-[10px]" style={{ color: 'var(--cyber-muted)' }}>TU HP</p>
                  <p className="text-lg font-bold" style={{ color: player.systemIntegrity > 10 ? 'var(--neon-green)' : 'var(--neon-red)' }}>
                    {player.systemIntegrity}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-center mt-4 relative z-10">
              <button
                onClick={() => window.location.reload()}
                className="cyber-btn cyber-btn-green text-sm py-2 px-6"
                style={{
                  boxShadow: '0 0 15px rgba(0, 255, 65, 0.4)',
                }}
              >
                ↻ REINTENTAR
              </button>
              <a
                href="/card-game"
                className="cyber-btn cyber-btn-magenta text-sm py-2 px-6"
                style={{
                  boxShadow: '0 0 15px rgba(255, 0, 255, 0.4)',
                }}
              >
                ← MENÚ
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
