import type { PlayerView } from "../game/GameState.js";

export interface LobbyPlayerView {
  playerId: string;
  name: string;
  connected: boolean;
  isHost: boolean;
}

export interface RoomView {
  roomCode: string;
  status: "WAITING" | "IN_PROGRESS" | "FINISHED";
  hostPlayerId: string;
  players: LobbyPlayerView[];
}

export interface SessionCredentials {
  roomCode: string;
  playerId: string;
  sessionToken: string;
}

export type ErrorCode =
  | "INVALID_PAYLOAD"
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "ROOM_ALREADY_STARTED"
  | "NAME_ALREADY_USED"
  | "INVALID_SESSION"
  | "NOT_IN_ROOM"
  | "INTERNAL_ERROR"
  | string;

export interface ClientError {
  code: ErrorCode;
  message: string;
}

export type Ack<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: ClientError };

export interface ClientToServerEvents {
  CREATE_ROOM: (payload: { name: string }, ack: (result: Ack<SessionCredentials>) => void) => void;
  JOIN_ROOM: (payload: { name: string; roomCode: string }, ack: (result: Ack<SessionCredentials>) => void) => void;
  RECONNECT_PLAYER: (
    payload: { roomCode: string; sessionToken: string },
    ack: (result: Ack<SessionCredentials>) => void,
  ) => void;
  START_GAME: (payload: Record<string, never>, ack: (result: Ack) => void) => void;
  PLAY_CARD: (payload: { cardId: string }, ack: (result: Ack) => void) => void;
  SWAP_TRAP_CARD: (payload: { handCardId: string; trapCardId: string }, ack: (result: Ack) => void) => void;
  TAKE_PILE: (payload: Record<string, never>, ack: (result: Ack) => void) => void;
  ACCUSE_PLAYER: (payload: { accusedPlayerId: string }, ack: (result: Ack) => void) => void;
  LEAVE_ROOM: (payload: Record<string, never>, ack: (result: Ack) => void) => void;
}

export interface ServerToClientEvents {
  ROOM_CREATED: (payload: { room: RoomView; credentials: SessionCredentials }) => void;
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

export interface SocketData {
  roomCode?: string;
  playerId?: string;
}
