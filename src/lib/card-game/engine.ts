import {
  GameState, GameAction, PlayerState, PlayerSide,
  CardInstance, CardDefinition, CombatLogEntry, AbilityEffect,
} from './types'
import { getCardById } from './cards'

// ============================================
// NetRun - Game Engine
// Core logic for card game mechanics
// ============================================

const MAX_FIELD_SIZE = 5
const MAX_HAND_SIZE = 8
const STARTING_HP = 20
const STARTING_RAM = 3
const STARTING_HAND = 4
const MAX_RAM = 10

let instanceCounter = 0

function generateInstanceId(): string {
  return `inst_${Date.now()}_${++instanceCounter}`
}

function createCardInstance(definition: CardDefinition): CardInstance {
  return {
    instanceId: generateInstanceId(),
    definition,
    currentStrength: definition.strength,
    currentFirewall: definition.firewall,
    isExhausted: false,
    buffs: [],
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function buildDeck(cardIds: string[]): CardInstance[] {
  const instances = cardIds
    .map(id => {
      const def = getCardById(id)
      if (!def) return null
      return createCardInstance(def)
    })
    .filter((c): c is CardInstance => c !== null)
  return shuffleArray(instances)
}

export function createInitialGameState(
  playerDeckIds: string[],
  opponentDeckIds: string[],
  isMultiplayer: boolean = false,
  gameId?: string
): GameState {
  instanceCounter = 0

  const playerDeck = buildDeck(playerDeckIds)
  const opponentDeck = buildDeck(opponentDeckIds)

  // Draw initial hands
  const playerHand = playerDeck.splice(0, STARTING_HAND)
  const opponentHand = opponentDeck.splice(0, STARTING_HAND)

  return {
    id: gameId || `game_${Date.now()}`,
    phase: 'main',
    turn: 1,
    activePlayer: 'player',
    player: {
      systemIntegrity: STARTING_HP,
      maxRam: STARTING_RAM,
      currentRam: STARTING_RAM,
      hand: playerHand,
      field: [],
      deck: playerDeck,
      graveyard: [],
      shield: 0,
    },
    opponent: {
      systemIntegrity: STARTING_HP,
      maxRam: STARTING_RAM,
      currentRam: STARTING_RAM,
      hand: opponentHand,
      field: [],
      deck: opponentDeck,
      graveyard: [],
      shield: 0,
    },
    combatLog: [{
      turn: 1,
      message: '🖥️ Sistema inicializado. ¡Que comience el NetRun!',
      type: 'system',
    }],
    winner: null,
    isMultiplayer,
    animatingAction: null,
  }
}

function addLog(state: GameState, message: string, type: CombatLogEntry['type']): void {
  state.combatLog.push({ turn: state.turn, message, type })
}

function getPlayerState(state: GameState, side: PlayerSide): PlayerState {
  return side === 'player' ? state.player : state.opponent
}

function getOpponentSide(side: PlayerSide): PlayerSide {
  return side === 'player' ? 'opponent' : 'player'
}

function drawCards(state: GameState, side: PlayerSide, count: number): void {
  const player = getPlayerState(state, side)
  const sideName = side === 'player' ? 'Runner' : 'Corp'
  for (let i = 0; i < count; i++) {
    if (player.deck.length === 0) {
      addLog(state, `${sideName} no tiene más cartas en el deck`, 'info')
      applyDamage(state, side, 1)
      if (state.phase === 'game_over') return
      continue
    }
    if (player.hand.length >= MAX_HAND_SIZE) {
      const burned = player.deck.shift()!
      player.graveyard.push(burned)
      addLog(state, `${sideName} quemó ${burned.definition.name} (mano llena)`, 'info')
      continue
    }
    const card = player.deck.shift()!
    player.hand.push(card)
  }
}

function applyDamage(state: GameState, side: PlayerSide, damage: number): void {
  const player = getPlayerState(state, side)
  const sideName = side === 'player' ? 'Runner' : 'Corp'

  if (player.shield > 0) {
    const absorbed = Math.min(player.shield, damage)
    player.shield -= absorbed
    damage -= absorbed
    if (absorbed > 0) {
      addLog(state, `Escudo de ${sideName} absorbe ${absorbed} daño`, 'info')
    }
  }

  if (damage > 0) {
    player.systemIntegrity = Math.max(0, player.systemIntegrity - damage)
    addLog(state, `${sideName} recibe ${damage} de daño (${player.systemIntegrity} HP)`, 'damage')
  }

  if (player.systemIntegrity <= 0) {
    state.phase = 'game_over'
    state.winner = getOpponentSide(side)
    addLog(state, `💀 ${sideName} ha sido desconectado. ¡${state.winner === 'player' ? 'Runner' : 'Corp'} gana!`, 'system')
  }
}

function isCardAlive(state: GameState, side: PlayerSide, instanceId: string): boolean {
  const player = getPlayerState(state, side)
  return player.field.some(c => c.instanceId === instanceId)
}

// Resolve a single ability effect
function resolveSingleEffect(
  state: GameState,
  card: CardInstance,
  side: PlayerSide,
  effect: AbilityEffect,
): void {
  const player = getPlayerState(state, side)
  const opponentSide = getOpponentSide(side)
  const opponent = getPlayerState(state, opponentSide)
  const cardName = card.definition.name

  switch (effect.effect.action) {
    case 'damage_opponent':
      applyDamage(state, opponentSide, effect.effect.value)
      addLog(state, `⚡ ${cardName} hace ${effect.effect.value} de daño directo`, 'ability')
      break

    case 'heal_player':
      player.systemIntegrity = Math.min(STARTING_HP, player.systemIntegrity + effect.effect.value)
      addLog(state, `💚 ${cardName} restaura ${effect.effect.value} de integridad`, 'ability')
      break

    case 'draw_cards':
      addLog(state, `📥 ${cardName} permite robar ${effect.effect.value} cartas`, 'ability')
      drawCards(state, side, effect.effect.value)
      break

    case 'buff_self':
      if (effect.effect.stat === 'strength') {
        card.currentStrength += effect.effect.value
      } else {
        card.currentFirewall += effect.effect.value
      }
      addLog(state, `⬆️ ${cardName} gana +${effect.effect.value} ${effect.effect.stat === 'strength' ? 'fuerza' : 'firewall'}`, 'ability')
      break

    case 'buff_all_allies':
      for (const ally of player.field) {
        if (effect.effect.stat === 'strength') {
          ally.currentStrength += effect.effect.value
        } else {
          ally.currentFirewall += effect.effect.value
        }
      }
      addLog(state, `⬆️ ${cardName}: +${effect.effect.value} ${effect.effect.stat === 'strength' ? 'fuerza' : 'firewall'} a todos los aliados`, 'ability')
      break

    case 'debuff_enemy':
      if (opponent.field.length > 0) {
        const target = opponent.field[Math.floor(Math.random() * opponent.field.length)]
        if (effect.effect.stat === 'strength') {
          target.currentStrength = Math.max(0, target.currentStrength - effect.effect.value)
        } else {
          target.currentFirewall = Math.max(0, target.currentFirewall - effect.effect.value)
        }
        addLog(state, `⬇️ ${cardName} reduce ${effect.effect.value} ${effect.effect.stat === 'strength' ? 'fuerza' : 'firewall'} de ${target.definition.name}`, 'ability')
      }
      break

    case 'destroy_random_enemy':
      if (opponent.field.length > 0) {
        const idx = Math.floor(Math.random() * opponent.field.length)
        const destroyed = opponent.field.splice(idx, 1)[0]
        opponent.graveyard.push(destroyed)
        addLog(state, `💥 ${cardName} destruye ${destroyed.definition.name}`, 'ability')
      }
      break

    case 'gain_ram':
      player.currentRam = Math.min(MAX_RAM, player.currentRam + effect.effect.value)
      addLog(state, `💾 ${cardName} otorga ${effect.effect.value} RAM`, 'ability')
      break

    case 'steal_ram': {
      const stolen = Math.min(opponent.currentRam, effect.effect.value)
      opponent.currentRam -= stolen
      player.currentRam = Math.min(MAX_RAM, player.currentRam + stolen)
      applyDamage(state, opponentSide, effect.effect.value)
      addLog(state, `🔋 ${cardName} roba ${stolen} RAM y hace ${effect.effect.value} de daño`, 'ability')
      break
    }

    case 'shield':
      player.shield += effect.effect.value
      addLog(state, `🛡️ ${cardName} otorga escudo ${effect.effect.value}`, 'ability')
      break

    case 'drain': {
      const drainDmg = effect.effect.value
      applyDamage(state, opponentSide, drainDmg)
      player.systemIntegrity = Math.min(STARTING_HP, player.systemIntegrity + drainDmg)
      addLog(state, `🩸 ${cardName} drena ${drainDmg} (daño + curación)`, 'ability')
      break
    }

    case 'pierce':
    case 'double_strike':
      // Handled in combat resolution
      break
  }
}

function resolveAbility(
  state: GameState,
  card: CardInstance,
  side: PlayerSide,
  trigger: 'on_play' | 'on_attack' | 'on_defend' | 'on_death'
): void {
  const effects = card.definition.abilityEffects
  if (!effects || effects.length === 0) {
    // Fallback to single abilityEffect for backward compatibility
    const single = card.definition.abilityEffect
    if (!single || single.type !== trigger) return
    resolveSingleEffect(state, card, side, single)
    return
  }

  for (const effect of effects) {
    if (effect.type !== trigger) continue
    resolveSingleEffect(state, card, side, effect)
  }
}

export function processAction(state: GameState, action: GameAction): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state))
  newState.animatingAction = action

  if (newState.phase === 'game_over') return newState

  switch (action.type) {
    case 'play_card': {
      const side = action.playerSide
      const player = getPlayerState(newState, side)
      const cardIdx = player.hand.findIndex(c => c.instanceId === action.cardInstanceId)

      if (cardIdx === -1) break

      const card = player.hand[cardIdx]
      const cost = card.definition.ramCost

      if (player.currentRam < cost) {
        addLog(newState, `RAM insuficiente para jugar ${card.definition.name}`, 'info')
        break
      }

      if (card.definition.type === 'event') {
        // Events are played and go to graveyard immediately
        player.hand.splice(cardIdx, 1)
        player.currentRam -= cost
        addLog(newState, `🎴 ${side === 'player' ? 'Runner' : 'Corp'} juega evento: ${card.definition.name}`, 'play')
        resolveAbility(newState, card, side, 'on_play')
        player.graveyard.push(card)
      } else {
        // Programs, ICE, Hardware go to field
        if (player.field.length >= MAX_FIELD_SIZE) {
          addLog(newState, `Campo lleno. No se puede jugar ${card.definition.name}`, 'info')
          break
        }

        player.hand.splice(cardIdx, 1)
        player.currentRam -= cost
        card.isExhausted = true // Can't attack the turn it's played
        player.field.push(card)
        addLog(newState, `🎴 ${side === 'player' ? 'Runner' : 'Corp'} despliega: ${card.definition.name}`, 'play')
        resolveAbility(newState, card, side, 'on_play')
      }
      break
    }

    case 'attack': {
      const side = action.playerSide
      const player = getPlayerState(newState, side)
      const opponentSide = getOpponentSide(side)
      const opponent = getPlayerState(newState, opponentSide)

      const attacker = player.field.find(c => c.instanceId === action.attackerInstanceId)
      if (!attacker || attacker.isExhausted) break

      const hasPierce = attacker.definition.abilityEffect?.effect.action === 'pierce'
        || attacker.definition.abilityEffects?.some(e => e.effect.action === 'pierce')
      const hasDoubleStrike = attacker.definition.abilityEffect?.effect.action === 'double_strike'
        || attacker.definition.abilityEffects?.some(e => e.effect.action === 'double_strike')

      if (action.targetInstanceId) {
        // Attack a specific target
        const targetIdx = opponent.field.findIndex(c => c.instanceId === action.targetInstanceId)
        if (targetIdx === -1) break
        const target = opponent.field[targetIdx]

        const attackerName = attacker.definition.name
        const targetName = target.definition.name

        addLog(newState, `⚔️ ${attackerName} ataca a ${targetName}`, 'attack')

        // Resolve on_attack abilities
        resolveAbility(newState, attacker, side, 'on_attack')

        // Combat resolution - capture firewall BEFORE reducing it
        const effectiveFirewall = hasPierce ? 0 : target.currentFirewall
        const originalFirewall = target.currentFirewall
        const damageToTarget = Math.max(0, attacker.currentStrength - effectiveFirewall)
        const damageToAttacker = Math.max(0, target.currentStrength - attacker.currentFirewall)

        target.currentFirewall = Math.max(0, target.currentFirewall - damageToTarget)
        if (damageToTarget > 0) {
          addLog(newState, `${attackerName} reduce firewall de ${targetName} en ${damageToTarget}`, 'attack')
        }

        if (target.currentFirewall <= 0 && damageToTarget > 0) {
          // Target destroyed
          resolveAbility(newState, target, opponentSide, 'on_death')
          opponent.field.splice(targetIdx, 1)
          opponent.graveyard.push(target)
          addLog(newState, `💥 ${targetName} ha sido destruida`, 'attack')

          // Overflow damage: excess strength beyond original firewall
          const overflow = hasPierce
            ? attacker.currentStrength
            : Math.max(0, attacker.currentStrength - originalFirewall)
          if (overflow > 0) {
            applyDamage(newState, opponentSide, Math.floor(overflow / 2))
          }
        } else {
          // Resolve on_defend abilities
          resolveAbility(newState, target, opponentSide, 'on_defend')
        }

        // Damage to attacker from counter
        if (damageToAttacker > 0) {
          attacker.currentFirewall = Math.max(0, attacker.currentFirewall - damageToAttacker)
          if (attacker.currentFirewall <= 0) {
            const atkIdx = player.field.findIndex(c => c.instanceId === attacker.instanceId)
            if (atkIdx !== -1) {
              resolveAbility(newState, attacker, side, 'on_death')
              player.field.splice(atkIdx, 1)
              player.graveyard.push(attacker)
              addLog(newState, `💥 ${attackerName} ha sido destruida en combate`, 'attack')
            }
          }
        }

        // Double strike - only if attacker survived
        if (hasDoubleStrike
          && isCardAlive(newState, side, attacker.instanceId)
          && !opponent.field.find(c => c.instanceId === action.targetInstanceId)
        ) {
          applyDamage(newState, opponentSide, attacker.currentStrength)
          addLog(newState, `⚡ ${attackerName} golpea de nuevo directamente`, 'attack')
        }
      } else {
        // Direct attack (no target, hits opponent if no field)
        if (opponent.field.length > 0) {
          addLog(newState, `No puedes atacar directamente mientras haya defensas`, 'info')
          break
        }
        addLog(newState, `⚔️ ${attacker.definition.name} ataca directamente`, 'attack')
        resolveAbility(newState, attacker, side, 'on_attack')
        applyDamage(newState, opponentSide, attacker.currentStrength)

        if (hasDoubleStrike) {
          applyDamage(newState, opponentSide, attacker.currentStrength)
          addLog(newState, `⚡ ${attacker.definition.name} golpea de nuevo`, 'attack')
        }
      }

      attacker.isExhausted = true
      break
    }

    case 'direct_attack': {
      const side = action.playerSide
      const player = getPlayerState(newState, side)
      const opponentSide = getOpponentSide(side)
      const opponent = getPlayerState(newState, opponentSide)

      const attacker = player.field.find(c => c.instanceId === action.attackerInstanceId)
      if (!attacker || attacker.isExhausted) break

      if (opponent.field.length > 0) {
        addLog(newState, `Debes atacar a las defensas primero`, 'info')
        break
      }

      addLog(newState, `⚔️ ${attacker.definition.name} ataca directamente al sistema`, 'attack')
      resolveAbility(newState, attacker, side, 'on_attack')
      applyDamage(newState, opponentSide, attacker.currentStrength)
      attacker.isExhausted = true
      break
    }

    case 'end_turn': {
      const currentSide = action.playerSide
      const nextSide = getOpponentSide(currentSide)
      const nextPlayer = getPlayerState(newState, nextSide)

      // Increment turn when going back to player's turn
      if (nextSide === 'player') {
        newState.turn++
      }

      newState.activePlayer = nextSide

      // Refresh RAM
      nextPlayer.maxRam = Math.min(MAX_RAM, nextPlayer.maxRam + 1)
      nextPlayer.currentRam = nextPlayer.maxRam

      // Unexhaust all cards
      for (const card of nextPlayer.field) {
        card.isExhausted = false
      }

      // Process buff durations
      for (const card of nextPlayer.field) {
        card.buffs = card.buffs.filter(b => {
          if (b.turnsRemaining !== null) {
            b.turnsRemaining--
            return b.turnsRemaining > 0
          }
          return true
        })
      }

      // Draw a card
      drawCards(newState, nextSide, 1)

      newState.phase = 'main'
      addLog(newState, `--- Turno ${newState.turn}: ${nextSide === 'player' ? 'Runner' : 'Corp'} ---`, 'system')
      break
    }

    case 'draw_card': {
      drawCards(newState, action.playerSide, 1)
      break
    }
  }

  return newState
}

// Get all valid actions for a player
export function getValidActions(state: GameState, side: PlayerSide): GameAction[] {
  if (state.phase === 'game_over' || state.activePlayer !== side) return []

  const actions: GameAction[] = []
  const player = getPlayerState(state, side)
  const opponent = getPlayerState(state, getOpponentSide(side))

  // Play cards from hand
  for (const card of player.hand) {
    if (player.currentRam >= card.definition.ramCost) {
      if (card.definition.type === 'event' || player.field.length < MAX_FIELD_SIZE) {
        actions.push({ type: 'play_card', cardInstanceId: card.instanceId, playerSide: side })
      }
    }
  }

  // Attack with field cards
  for (const card of player.field) {
    if (!card.isExhausted) {
      if (opponent.field.length > 0) {
        for (const target of opponent.field) {
          actions.push({
            type: 'attack',
            attackerInstanceId: card.instanceId,
            targetInstanceId: target.instanceId,
            playerSide: side,
          })
        }
      } else {
        actions.push({
          type: 'direct_attack',
          attackerInstanceId: card.instanceId,
          playerSide: side,
        })
      }
    }
  }

  // End turn is always available
  actions.push({ type: 'end_turn', playerSide: side })

  return actions
}

export function canPlayCard(state: GameState, side: PlayerSide, instanceId: string): boolean {
  const player = getPlayerState(state, side)
  const card = player.hand.find(c => c.instanceId === instanceId)
  if (!card) return false
  if (player.currentRam < card.definition.ramCost) return false
  if (card.definition.type !== 'event' && player.field.length >= MAX_FIELD_SIZE) return false
  return true
}

export function canAttack(state: GameState, side: PlayerSide, instanceId: string): boolean {
  const player = getPlayerState(state, side)
  const card = player.field.find(c => c.instanceId === instanceId)
  return !!card && !card.isExhausted
}
