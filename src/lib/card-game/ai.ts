import { GameState, GameAction, PlayerSide } from './types'
import { getValidActions, processAction } from './engine'

// ============================================
// NetRun - AI Opponent
// Evaluates game state to make intelligent decisions
// ============================================

type Difficulty = 'easy' | 'medium' | 'hard'

function evaluateGameState(state: GameState, side: PlayerSide): number {
  const player = side === 'player' ? state.player : state.opponent
  const opponent = side === 'player' ? state.opponent : state.player
  let score = 0

  // HP difference (most important)
  score += (player.systemIntegrity - opponent.systemIntegrity) * 10

  // Field advantage
  score += player.field.length * 5
  score -= opponent.field.length * 5

  // Total strength on field
  const playerStrength = player.field.reduce((sum, c) => sum + c.currentStrength, 0)
  const opponentStrength = opponent.field.reduce((sum, c) => sum + c.currentStrength, 0)
  score += (playerStrength - opponentStrength) * 3

  // Total firewall on field
  const playerFirewall = player.field.reduce((sum, c) => sum + c.currentFirewall, 0)
  const opponentFirewall = opponent.field.reduce((sum, c) => sum + c.currentFirewall, 0)
  score += (playerFirewall - opponentFirewall) * 2

  // Hand size
  score += player.hand.length * 1
  score -= opponent.hand.length * 1

  // Shield bonus
  score += player.shield * 3

  // RAM advantage
  score += player.currentRam * 0.5

  // Win/loss detection
  if (state.winner === side) score += 1000
  if (state.winner === (side === 'player' ? 'opponent' : 'player')) score -= 1000

  return score
}

function scoreAction(state: GameState, action: GameAction, side: PlayerSide): number {
  if (action.type === 'end_turn') return -1 // Slightly prefer doing things before ending turn

  const resultState = processAction(state, action)
  return evaluateGameState(resultState, side)
}

export function getAIAction(
  state: GameState,
  difficulty: Difficulty = 'medium'
): GameAction[] {
  const side: PlayerSide = 'opponent'
  const validActions = getValidActions(state, side)

  if (validActions.length === 0) return []
  if (validActions.length === 1) return validActions // Only end_turn available

  // Score all actions
  const scoredActions = validActions.map(action => ({
    action,
    score: scoreAction(state, action, side),
  }))

  // Sort by score descending
  scoredActions.sort((a, b) => b.score - a.score)

  // Build a sequence of actions (play cards, then attack, then end turn)
  const actionSequence: GameAction[] = []
  let simulatedState = JSON.parse(JSON.stringify(state)) as GameState

  const maxActions = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 4 : 6

  for (let i = 0; i < maxActions; i++) {
    const currentValid = getValidActions(simulatedState, side)
    if (currentValid.length <= 1) break // Only end_turn left

    const scored = currentValid
      .filter(a => a.type !== 'end_turn')
      .map(action => ({
        action,
        score: scoreAction(simulatedState, action, side),
      }))
      .sort((a, b) => b.score - a.score)

    if (scored.length === 0) break

    // Easy: pick randomly from top 3; Medium: pick best or second; Hard: always pick best
    let chosen: GameAction
    if (difficulty === 'easy') {
      const pool = scored.slice(0, Math.min(3, scored.length))
      chosen = pool[Math.floor(Math.random() * pool.length)].action
    } else if (difficulty === 'medium') {
      // 70% best, 30% second best only when close in score
      const isSecondClose = scored.length > 1 && Math.abs(scored[0].score - scored[1].score) <= 8
      if (isSecondClose && Math.random() < 0.3) {
        chosen = scored[1].action
      } else {
        chosen = scored[0].action
      }
    } else {
      chosen = scored[0].action
    }

    actionSequence.push(chosen)
    simulatedState = processAction(simulatedState, chosen)

    // Check if game is over
    if (simulatedState.phase === 'game_over') break
  }

  // Always end with end_turn
  actionSequence.push({ type: 'end_turn', playerSide: side })

  return actionSequence
}

export function getAIDifficulty(playerElo: number): Difficulty {
  if (playerElo < 1000) return 'easy'
  if (playerElo < 1500) return 'medium'
  return 'hard'
}
