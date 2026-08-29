import type { GameState } from "../GameState.js";

export function findSurvivalWinner(state: GameState): string | null {
  const alive = state.players.filter((player) => player.alive);
  return alive.length === 1 ? alive[0]?.id ?? null : null;
}
