import { GameError } from "../GameError.js";
import type { GameState } from "../GameState.js";

export function advanceTurn(state: GameState): void {
  const playerCount = state.players.length;
  for (let offset = 1; offset <= playerCount; offset += 1) {
    const index = (state.currentPlayerIndex + offset) % playerCount;
    const player = state.players[index];
    if (player?.alive) {
      state.currentPlayerIndex = index;
      // A cheat expires immediately before this player's next turn starts.
      player.pendingCheat = false;
      return;
    }
  }
  throw new GameError("PLAYER_NOT_FOUND", "There is no active player to receive the turn.");
}
