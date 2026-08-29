import { GameError } from "./GameError.js";
import type { Card, GameState, PlayerView } from "./GameState.js";

function copyCard(card: Card): Card {
  return card.type === "NUMBER" ? { ...card } : { ...card };
}

export function getPlayerView(state: GameState, viewerPlayerId: string): PlayerView {
  const viewer = state.players.find((player) => player.id === viewerPlayerId);
  if (!viewer) throw new GameError("PLAYER_NOT_FOUND", "Viewer does not belong to this game.");

  const currentPlayerId = state.players[state.currentPlayerIndex]?.id ?? null;
  const topCard = state.openPile.at(-1);

  return {
    game: {
      id: state.id,
      roomCode: state.roomCode,
      status: state.status,
      hostPlayerId: state.hostPlayerId,
      activeValue: state.activeValue,
      currentPlayerId,
      winnerPlayerId: state.winnerPlayerId,
      deckCount: state.deck.length,
      openPileCount: state.openPile.length,
      topCard: topCard ? copyCard(topCard) : null,
      publicLog: structuredClone(state.publicLog),
    },
    self: {
      playerId: viewer.id,
      sessionToken: viewer.sessionToken,
      name: viewer.name,
      hand: viewer.hand.map(copyCard),
      trapCards: viewer.trapCards.map(copyCard),
      handCount: viewer.hand.length,
      alive: viewer.alive,
      connected: viewer.connected,
      pendingCheat: viewer.pendingCheat,
      isCurrentTurn: currentPlayerId === viewer.id,
    },
    players: state.players.map((player) => ({
      playerId: player.id,
      name: player.name,
      handCount: player.hand.length,
      alive: player.alive,
      connected: player.connected,
      isCurrentTurn: currentPlayerId === player.id,
    })),
  };
}
