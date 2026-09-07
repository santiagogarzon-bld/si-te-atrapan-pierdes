export type Card =
  | { id: string; type: "NUMBER"; value: number }
  | { id: string; type: "A" | "B" };

export interface PublicGameEvent {
  type: "GAME_STARTED" | "CARD_PLAYED" | "PILE_TAKEN" | "PLAYER_ACCUSED" | "PLAYER_ELIMINATED" | "GAME_FINISHED";
  playerId?: string;
  cardType?: "NUMBER" | "A" | "B";
  value?: number;
  cardCount?: number;
  accuserPlayerId?: string;
  accusedPlayerId?: string;
  correct?: boolean;
  winnerPlayerId?: string;
}

export interface PlayerView {
  game: {
    id: string;
    roomCode: string;
    status: "WAITING" | "IN_PROGRESS" | "FINISHED";
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
  players: Array<{
    playerId: string;
    name: string;
    handCount: number;
    alive: boolean;
    connected: boolean;
    isCurrentTurn: boolean;
  }>;
}

export interface RoomView {
  roomCode: string;
  status: "WAITING" | "IN_PROGRESS" | "FINISHED";
  hostPlayerId: string;
  players: Array<{ playerId: string; name: string; connected: boolean; isHost: boolean }>;
}

export interface Credentials { roomCode: string; playerId: string; sessionToken: string }
export interface ClientError { code: string; message: string }
export type Ack<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: ClientError }
  : { ok: true; data: T } | { ok: false; error: ClientError };

export interface ServerEvents {
  ROOM_CREATED: (payload: { room: RoomView; credentials: Credentials }) => void;
  ROOM_UPDATED: (room: RoomView) => void;
  GAME_STARTED: (view: PlayerView) => void;
  GAME_STATE_UPDATED: (view: PlayerView) => void;
  PLAYER_JOINED: (payload: { playerId: string; name: string }) => void;
  PLAYER_LEFT: (payload: { playerId: string; name: string }) => void;
  PLAYER_RECONNECTED: (payload: { playerId: string; name: string }) => void;
  PLAYER_ELIMINATED: (payload: { playerId: string }) => void;
  GAME_FINISHED: (payload: { winnerPlayerId: string }) => void;
  GAME_ERROR: (error: ClientError) => void;
}

export interface ClientEvents {
  CREATE_ROOM: (payload: { name: string }, ack: (result: Ack<Credentials>) => void) => void;
  JOIN_ROOM: (payload: { name: string; roomCode: string }, ack: (result: Ack<Credentials>) => void) => void;
  RECONNECT_PLAYER: (payload: { roomCode: string; sessionToken: string }, ack: (result: Ack<Credentials>) => void) => void;
  START_GAME: (payload: Record<string, never>, ack: (result: Ack) => void) => void;
  PLAY_CARD: (payload: { cardId: string }, ack: (result: Ack) => void) => void;
  SWAP_TRAP_CARD: (payload: { handCardId: string; trapCardId: string }, ack: (result: Ack) => void) => void;
  TAKE_PILE: (payload: Record<string, never>, ack: (result: Ack) => void) => void;
  ACCUSE_PLAYER: (payload: { accusedPlayerId: string }, ack: (result: Ack) => void) => void;
  LEAVE_ROOM: (payload: Record<string, never>, ack: (result: Ack) => void) => void;
}
