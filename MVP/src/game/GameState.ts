export type CardType = "NUMBER" | "A" | "B";

export interface NumberCard {
  readonly id: string;
  readonly type: "NUMBER";
  readonly value: number;
}

export interface Wildcard {
  readonly id: string;
  readonly type: "A" | "B";
}

export type Card = NumberCard | Wildcard;
export type GameStatus = "WAITING" | "IN_PROGRESS" | "FINISHED";

export interface Player {
  readonly id: string;
  readonly sessionToken: string;
  name: string;
  hand: Card[];
  trapCards: Card[];
  alive: boolean;
  connected: boolean;
  pendingCheat: boolean;
}

export type PublicGameEvent =
  | { type: "GAME_STARTED" }
  | { type: "CARD_PLAYED"; playerId: string; cardType: CardType; value?: number }
  | { type: "PILE_TAKEN"; playerId: string; cardCount: number }
  | { type: "PLAYER_ACCUSED"; accuserPlayerId: string; accusedPlayerId: string; correct: boolean }
  | { type: "PLAYER_ELIMINATED"; playerId: string }
  | { type: "GAME_FINISHED"; winnerPlayerId: string };

export interface GameState {
  readonly id: string;
  readonly roomCode: string;
  status: GameStatus;
  readonly hostPlayerId: string;
  players: Player[];
  deck: Card[];
  openPile: Card[];
  activeValue: number;
  currentPlayerIndex: number;
  winnerPlayerId: string | null;
  readonly createdAt: string;
  publicLog: PublicGameEvent[];
}

export interface PlayerSeed {
  id: string;
  sessionToken: string;
  name: string;
  connected?: boolean;
}

export interface OtherPlayerView {
  playerId: string;
  name: string;
  handCount: number;
  alive: boolean;
  connected: boolean;
  isCurrentTurn: boolean;
}

export interface PlayerView {
  game: {
    id: string;
    roomCode: string;
    status: GameStatus;
    hostPlayerId: string;
    activeValue: number;
    currentPlayerId: string | null;
    winnerPlayerId: string | null;
    deckCount: number;
    openPileCount: number;
    topCard: Card | null;
    publicLog: PublicGameEvent[];
  };
  self: {
    playerId: string;
    sessionToken: string;
    name: string;
    hand: Card[];
    trapCards: Card[];
    handCount: number;
    alive: boolean;
    connected: boolean;
    pendingCheat: boolean;
    isCurrentTurn: boolean;
  };
  players: OtherPlayerView[];
}
