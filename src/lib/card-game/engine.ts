import {
  GameState, GameAction, PlayerState, PlayerSide,
  CardInstance, CardDefinition, CombatLogEntry, AbilityEffect, Buff,
} from './types'
import { getCardById } from './cards'

// ============================================
// NetRun - Game Engine
// Core logic for card game mechanics
// ============================================

const MAX_FIELD_SIZE = 5
const MAX_HAND_SIZE = 8
const STARTING_HP = 20
const STARTING_RAM = 1
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

function getSideName(side: PlayerSide): string {
  return side === 'player' ? 'Runner' : 'Corp'
}

function drawCards(state: GameState, side: PlayerSide, count: number): void {
  const player = getPlayerState(state, side)
  const sideName = getSideName(side)
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
  const sideName = getSideName(side)

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

function isDefenderUnit(card: CardInstance): boolean {
  return card.definition.type !== 'event' && card.currentFirewall > 0
}

function isDirectSystemDamageAbility(action: AbilityEffect['effect']['action']): boolean {
  return action === 'damage_opponent' || action === 'drain' || action === 'damage_and_steal_ram'
}

function hasAbilityAction(card: CardInstance, action: 'pierce' | 'double_strike'): boolean {
  return card.definition.abilityEffect?.effect.action === action
    || card.definition.abilityEffects?.some(e => e.effect.action === action)
    || false
}

function applyCardStatDelta(card: CardInstance, stat: 'strength' | 'firewall', value: number): number {
  if (stat === 'strength') {
    const before = card.currentStrength
    card.currentStrength = Math.max(0, card.currentStrength + value)
    return card.currentStrength - before
  } else {
    const before = card.currentFirewall
    card.currentFirewall = Math.max(0, card.currentFirewall + value)
    return card.currentFirewall - before
  }
}

function addTimedCardStatBuff(
  card: CardInstance,
  stat: 'strength' | 'firewall',
  value: number,
  turnsRemaining: number,
): void {
  const buffType: Buff['type'] = stat === 'strength' ? 'strength' : 'firewall'
  card.buffs.push({
    type: buffType,
    value,
    turnsRemaining,
  })
}

function tickCardBuffs(card: CardInstance): void {
  const updatedBuffs: Buff[] = []

  for (const buff of card.buffs) {
    if (buff.turnsRemaining === null) {
      updatedBuffs.push(buff)
      continue
    }

    const nextTurns = buff.turnsRemaining - 1
    if (nextTurns > 0) {
      updatedBuffs.push({ ...buff, turnsRemaining: nextTurns })
      continue
    }

    if (buff.type === 'strength') {
      card.currentStrength = Math.max(0, card.currentStrength - buff.value)
    } else if (buff.type === 'firewall') {
      card.currentFirewall = Math.max(0, card.currentFirewall - buff.value)
    }
  }

  card.buffs = updatedBuffs
}

// Resolve a single ability effect
function resolveSingleEffect(
  state: GameState,
  card: CardInstance,
  side: PlayerSide,
  effect: AbilityEffect,
  options?: {
    blockDirectOpponentDamage?: boolean
  }
): void {
  const player = getPlayerState(state, side)
  const opponentSide = getOpponentSide(side)
  const opponent = getPlayerState(state, opponentSide)
  const cardName = card.definition.name

  if (options?.blockDirectOpponentDamage && isDirectSystemDamageAbility(effect.effect.action)) {
    return
  }

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
      const selfAppliedDelta = applyCardStatDelta(card, effect.effect.stat, effect.effect.value)
      if (effect.effect.durationTurns && effect.effect.durationTurns > 0 && selfAppliedDelta !== 0) {
        addTimedCardStatBuff(card, effect.effect.stat, selfAppliedDelta, effect.effect.durationTurns)
      }
      addLog(state, `⬆️ ${cardName} gana +${effect.effect.value} ${effect.effect.stat === 'strength' ? 'fuerza' : 'firewall'}`, 'ability')
      break

    case 'buff_all_allies':
      for (const ally of player.field) {
        const allyAppliedDelta = applyCardStatDelta(ally, effect.effect.stat, effect.effect.value)
        if (effect.effect.durationTurns && effect.effect.durationTurns > 0 && allyAppliedDelta !== 0) {
          addTimedCardStatBuff(ally, effect.effect.stat, allyAppliedDelta, effect.effect.durationTurns)
        }
      }
      addLog(state, `⬆️ ${cardName}: +${effect.effect.value} ${effect.effect.stat === 'strength' ? 'fuerza' : 'firewall'} a todos los aliados`, 'ability')
      break

    case 'debuff_enemy':
      if (opponent.field.length > 0) {
        const target = opponent.field[Math.floor(Math.random() * opponent.field.length)]
        const debuffValue = -effect.effect.value
        const targetAppliedDelta = applyCardStatDelta(target, effect.effect.stat, debuffValue)
        if (effect.effect.durationTurns && effect.effect.durationTurns > 0 && targetAppliedDelta !== 0) {
          addTimedCardStatBuff(target, effect.effect.stat, targetAppliedDelta, effect.effect.durationTurns)
        }
        addLog(state, `⬇️ ${cardName} reduce ${effect.effect.value} ${effect.effect.stat === 'strength' ? 'fuerza' : 'firewall'} de ${target.definition.name}`, 'ability')
      }
      break

    case 'destroy_random_enemy':
      if (opponent.field.length > 0) {
        const idx = Math.floor(Math.random() * opponent.field.length)
        const destroyed = opponent.field.splice(idx, 1)[0]
        resolveAbility(state, destroyed, opponentSide, 'on_death')
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
      addLog(state, `🔋 ${cardName} roba ${stolen} RAM`, 'ability')
      break
    }

    case 'damage_and_steal_ram': {
      const stolen = Math.min(opponent.currentRam, effect.effect.ram)
      opponent.currentRam -= stolen
      player.currentRam = Math.min(MAX_RAM, player.currentRam + stolen)
      applyDamage(state, opponentSide, effect.effect.damage)
      addLog(state, `🔋 ${cardName} roba ${stolen} RAM y hace ${effect.effect.damage} de daño`, 'ability')
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
  trigger: 'on_play' | 'on_attack' | 'on_defend' | 'on_death',
  options?: {
    blockDirectOpponentDamage?: boolean
  }
): void {
  const effects = card.definition.abilityEffects
  if (!effects || effects.length === 0) {
    // Fallback to single abilityEffect for backward compatibility
    const single = card.definition.abilityEffect
    if (!single || single.type !== trigger) return
    resolveSingleEffect(state, card, side, single, options)
    return
  }

  for (const effect of effects) {
    if (effect.type !== trigger) continue
    resolveSingleEffect(state, card, side, effect, options)
  }
}

export function processAction(state: GameState, action: GameAction): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state))
  newState.animatingAction = action

  if (newState.phase === 'game_over') return newState
  if (action.playerSide !== newState.activePlayer) {
    addLog(newState, `Acción inválida: no es turno de ${getSideName(action.playerSide)}`, 'info')
    return newState
  }

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
      if (attacker.currentStrength <= 0) {
        addLog(newState, `${attacker.definition.name} no tiene ataque para iniciar combate`, 'info')
        break
      }

      const hasPierce = hasAbilityAction(attacker, 'pierce')
      const hasDoubleStrike = hasAbilityAction(attacker, 'double_strike')

      const defenders = opponent.field.filter(isDefenderUnit)

      if (action.targetInstanceId) {
        // Attack a specific target
        const targetIdx = opponent.field.findIndex(c => c.instanceId === action.targetInstanceId)
        if (targetIdx === -1) break
        const target = opponent.field[targetIdx]

        if (defenders.length > 0 && !hasPierce && !defenders.some(c => c.instanceId === action.targetInstanceId)) {
          addLog(newState, 'Debes atacar primero cartas con escudo (firewall > 0)', 'info')
          break
        }

        const attackerName = attacker.definition.name
        const targetName = target.definition.name

        addLog(newState, `⚔️ ${attackerName} ataca a ${targetName}`, 'attack')

        // Resolve on_attack abilities. If defenders are up and attacker has no pierce,
        // prevent on-attack effects that would deal direct system damage.
        resolveAbility(newState, attacker, side, 'on_attack', {
          blockDirectOpponentDamage: defenders.length > 0 && !hasPierce,
        })

        // Combat resolution - attacker's strength reduces target's firewall directly
        const originalFirewall = target.currentFirewall
        const damageToFirewall = attacker.currentStrength
        const damageToAttacker = target.currentStrength

        // Reduce firewall by attacker's strength
        target.currentFirewall = Math.max(0, target.currentFirewall - damageToFirewall)
        addLog(newState, `${attackerName} reduce firewall de ${targetName} en ${damageToFirewall} (${originalFirewall} → ${target.currentFirewall})`, 'attack')

        // Resolve on_defend abilities whenever a card is attacked
        resolveAbility(newState, target, opponentSide, 'on_defend')

        if (target.currentFirewall <= 0 && damageToFirewall > 0) {
          // Target destroyed
          resolveAbility(newState, target, opponentSide, 'on_death')
          opponent.field.splice(targetIdx, 1)
          opponent.graveyard.push(target)
          addLog(newState, `💥 ${targetName} ha sido destruida`, 'attack')
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

        // Double strike (extra combat trigger without direct overflow damage)
        if (hasDoubleStrike && isCardAlive(newState, side, attacker.instanceId)) {
          addLog(newState, `⚡ ${attackerName} activa doble golpe`, 'attack')
        }
      } else {
        // Direct attack (no target): cards with firewall > 0 gate direct attacks unless attacker can pierce
        if (defenders.length > 0 && !hasPierce) {
          addLog(newState, 'Debes eliminar cartas con escudo antes de atacar directo', 'info')
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
      if (attacker.currentStrength <= 0) {
        addLog(newState, `${attacker.definition.name} no tiene ataque para atacar directamente`, 'info')
        break
      }
      const hasPierce = hasAbilityAction(attacker, 'pierce')
      const hasDoubleStrike = hasAbilityAction(attacker, 'double_strike')

      const defenders = opponent.field.filter(isDefenderUnit)

      if (defenders.length > 0 && !hasPierce) {
        addLog(newState, 'Debes atacar a cartas con escudo primero', 'info')
        break
      }

      addLog(newState, `⚔️ ${attacker.definition.name} ataca directamente al sistema`, 'attack')
      resolveAbility(newState, attacker, side, 'on_attack')
      applyDamage(newState, opponentSide, attacker.currentStrength)

      if (hasDoubleStrike) {
        applyDamage(newState, opponentSide, attacker.currentStrength)
        addLog(newState, `⚡ ${attacker.definition.name} golpea de nuevo`, 'attack')
      }

      attacker.isExhausted = true
      break
    }

    case 'end_turn': {
      const currentSide = action.playerSide
      const currentPlayer = getPlayerState(newState, currentSide)
      const nextSide = getOpponentSide(currentSide)
      const nextPlayer = getPlayerState(newState, nextSide)

      // Process temporary buff durations for the player ending their turn
      for (const card of currentPlayer.field) {
        tickCardBuffs(card)
      }

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
  const defenders = opponent.field.filter(isDefenderUnit)

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
    if (!card.isExhausted && card.currentStrength > 0) {
      const canPierce = hasAbilityAction(card, 'pierce')
      if (opponent.field.length > 0) {
        const targets = defenders.length > 0 ? defenders : opponent.field
        for (const target of targets) {
          actions.push({
            type: 'attack',
            attackerInstanceId: card.instanceId,
            targetInstanceId: target.instanceId,
            playerSide: side,
          })
        }
      }

      if (canPierce || defenders.length === 0) {
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
  if (state.phase === 'game_over' || state.activePlayer !== side) return false
  const player = getPlayerState(state, side)
  const card = player.hand.find(c => c.instanceId === instanceId)
  if (!card) return false
  if (player.currentRam < card.definition.ramCost) return false
  if (card.definition.type !== 'event' && player.field.length >= MAX_FIELD_SIZE) return false
  return true
}

export function canAttack(state: GameState, side: PlayerSide, instanceId: string): boolean {
  if (state.phase === 'game_over' || state.activePlayer !== side) return false
  const player = getPlayerState(state, side)
  const card = player.field.find(c => c.instanceId === instanceId)
  return !!card && !card.isExhausted && card.currentStrength > 0
}
