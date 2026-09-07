import { create } from "zustand";
import { socket } from "./socket";
import type { ClientError, Credentials, PlayerView, RoomView } from "./types";

const SESSION_KEY = "la-trampa-session";

function storedCredentials(): Credentials | null {
  try {
    const value = localStorage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) as Credentials : null;
  } catch {
    return null;
  }
}

function persist(credentials: Credentials | null): void {
  if (credentials) localStorage.setItem(SESSION_KEY, JSON.stringify(credentials));
  else localStorage.removeItem(SESSION_KEY);
}

type AnyAck = { ok: true } | { ok: true; data: unknown } | { ok: false; error: ClientError };

function messageFromAck(ack: AnyAck): string | null {
  return ack.ok ? null : ack.error.message;
}

interface GameStore {
  initialized: boolean;
  connected: boolean;
  reconnecting: boolean;
  busy: boolean;
  room: RoomView | null;
  game: PlayerView | null;
  credentials: Credentials | null;
  error: ClientError | null;
  notice: string | null;
  initialize: () => void;
  createRoom: (name: string) => Promise<boolean>;
  joinRoom: (name: string, roomCode: string) => Promise<boolean>;
  startGame: () => Promise<void>;
  playCard: (cardId: string) => Promise<void>;
  swapTrap: (handCardId: string, trapCardId: string) => Promise<void>;
  takePile: () => Promise<void>;
  accuse: (accusedPlayerId: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  dismissError: () => void;
  dismissNotice: () => void;
}

export const useGameStore = create<GameStore>((set, get) => {
  const handleAck = (ack: AnyAck): boolean => {
    const message = messageFromAck(ack);
    if (message) {
      set({ error: (ack as { ok: false; error: ClientError }).error, busy: false });
      return false;
    }
    set({ busy: false });
    return true;
  };

  return {
    initialized: false,
    connected: false,
    reconnecting: false,
    busy: false,
    room: null,
    game: null,
    credentials: storedCredentials(),
    error: null,
    notice: null,

    initialize: () => {
      if (get().initialized) return;
      set({ initialized: true });
      socket.on("connect", () => {
        set({ connected: true });
        const credentials = get().credentials;
        if (!credentials) return;
        set({ reconnecting: true });
        socket.emit("RECONNECT_PLAYER", credentials, (ack) => {
          if (!ack.ok) {
            persist(null);
            set({ credentials: null, room: null, game: null, error: ack.error, reconnecting: false });
            return;
          }
          set({ reconnecting: false });
        });
      });
      socket.on("disconnect", () => set({ connected: false }));
      socket.on("ROOM_CREATED", ({ room, credentials }) => {
        persist(credentials);
        set({ room, credentials, game: null });
      });
      socket.on("ROOM_UPDATED", (room) => set({ room }));
      socket.on("GAME_STARTED", (game) => set({ game, notice: "La partida comenzó." }));
      socket.on("GAME_STATE_UPDATED", (game) => set({ game }));
      socket.on("PLAYER_JOINED", ({ name }) => set({ notice: `${name} entró a la sala.` }));
      socket.on("PLAYER_LEFT", ({ name }) => set({ notice: `${name} salió de la sala.` }));
      socket.on("PLAYER_RECONNECTED", ({ name }) => set({ notice: `${name} se reconectó.` }));
      socket.on("PLAYER_ELIMINATED", ({ playerId }) => {
        const name = get().game?.players.find((player) => player.playerId === playerId)?.name ?? "Un jugador";
        set({ notice: `${name} fue eliminado.` });
      });
      socket.on("GAME_FINISHED", ({ winnerPlayerId }) => {
        const name = get().game?.players.find((player) => player.playerId === winnerPlayerId)?.name ?? "Un jugador";
        set({ notice: `${name} ganó la partida.` });
      });
      socket.on("GAME_ERROR", (error) => set({ error, busy: false }));
      socket.connect();
    },

    createRoom: (name) => new Promise((resolve) => {
      set({ busy: true, error: null });
      socket.emit("CREATE_ROOM", { name }, (ack) => {
        if (ack.ok) {
          persist(ack.data);
          set({ credentials: ack.data });
        }
        resolve(handleAck(ack));
      });
    }),

    joinRoom: (name, roomCode) => new Promise((resolve) => {
      set({ busy: true, error: null });
      socket.emit("JOIN_ROOM", { name, roomCode: roomCode.toUpperCase() }, (ack) => {
        if (ack.ok) {
          persist(ack.data);
          set({ credentials: ack.data });
        }
        resolve(handleAck(ack));
      });
    }),

    startGame: () => new Promise((resolve) => {
      set({ busy: true, error: null });
      socket.emit("START_GAME", {}, (ack) => { handleAck(ack); resolve(); });
    }),
    playCard: (cardId) => new Promise((resolve) => {
      set({ busy: true, error: null });
      socket.emit("PLAY_CARD", { cardId }, (ack) => { handleAck(ack); resolve(); });
    }),
    swapTrap: (handCardId, trapCardId) => new Promise((resolve) => {
      set({ busy: true, error: null });
      socket.emit("SWAP_TRAP_CARD", { handCardId, trapCardId }, (ack) => { handleAck(ack); resolve(); });
    }),
    takePile: () => new Promise((resolve) => {
      set({ busy: true, error: null });
      socket.emit("TAKE_PILE", {}, (ack) => { handleAck(ack); resolve(); });
    }),
    accuse: (accusedPlayerId) => new Promise((resolve) => {
      set({ busy: true, error: null });
      socket.emit("ACCUSE_PLAYER", { accusedPlayerId }, (ack) => { handleAck(ack); resolve(); });
    }),
    leaveRoom: () => new Promise((resolve) => {
      socket.emit("LEAVE_ROOM", {}, () => {
        persist(null);
        set({ room: null, game: null, credentials: null, busy: false });
        resolve();
      });
    }),
    dismissError: () => set({ error: null }),
    dismissNotice: () => set({ notice: null }),
  };
});
