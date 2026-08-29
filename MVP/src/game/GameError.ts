export type GameErrorCode =
  | "GAME_ALREADY_STARTED"
  | "GAME_NOT_STARTED"
  | "NOT_ENOUGH_PLAYERS"
  | "TOO_MANY_PLAYERS"
  | "ONLY_HOST_CAN_START"
  | "PLAYER_NOT_FOUND"
  | "PLAYER_ELIMINATED"
  | "NOT_YOUR_TURN"
  | "CARD_NOT_FOUND"
  | "CARD_NOT_PLAYABLE"
  | "PILE_TAKE_NOT_ALLOWED"
  | "INVALID_TRAP_SWAP"
  | "INVALID_ACCUSATION"
  | "DECK_HAS_NO_NUMBER_CARDS";

export class GameError extends Error {
  constructor(
    public readonly code: GameErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "GameError";
  }
}
