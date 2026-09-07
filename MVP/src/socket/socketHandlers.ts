import type { Server, Socket } from "socket.io";
import { z, type ZodType } from "zod";
import { GameError } from "../game/GameError.js";
import { RoomError } from "../rooms/RoomError.js";
import { RoomManager, type Room } from "../rooms/RoomManager.js";
import type {
  Ack,
  ClientError,
  ClientToServerEvents,
  ServerToClientEvents,
  SessionCredentials,
  SocketData,
} from "../shared/contracts.js";

type GameServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

const nameSchema = z.string().trim().min(1, "Escribe un nombre.").max(24, "El nombre admite máximo 24 caracteres.");
const roomCodeSchema = z.string().trim().toUpperCase().regex(/^[A-Z2-9]{6}$/, "El código debe tener 6 caracteres.");
const idSchema = z.string().uuid("El identificador no es válido.");
const emptySchema = z.object({}).strict();
const schemas = {
  create: z.object({ name: nameSchema }).strict(),
  join: z.object({ name: nameSchema, roomCode: roomCodeSchema }).strict(),
  reconnect: z.object({ roomCode: roomCodeSchema, sessionToken: idSchema }).strict(),
  play: z.object({ cardId: idSchema }).strict(),
  swap: z.object({ handCardId: idSchema, trapCardId: idSchema }).strict(),
  accuse: z.object({ accusedPlayerId: idSchema }).strict(),
};

function toClientError(error: unknown): ClientError {
  if (error instanceof z.ZodError) {
    return { code: "INVALID_PAYLOAD", message: error.issues[0]?.message ?? "Datos inválidos." };
  }
  if (error instanceof GameError || error instanceof RoomError) return { code: error.code, message: error.message };
  console.error(error);
  return { code: "INTERNAL_ERROR", message: "Ocurrió un error inesperado." };
}

function success<T>(data: T): Ack<T> {
  return { ok: true, data } as Ack<T>;
}

function roomIdentity(socket: GameSocket, rooms: RoomManager): { room: Room; playerId: string } {
  const { roomCode, playerId } = socket.data;
  if (!roomCode || !playerId) throw new RoomError("NOT_IN_ROOM", "El socket no está asociado a una sala.");
  const room = rooms.requireRoom(roomCode);
  const player = rooms.requirePlayer(room, playerId);
  if (player.socketId !== socket.id) throw new RoomError("INVALID_SESSION", "Esta sesión fue reemplazada por una reconexión.");
  return { room, playerId };
}

function requireUnbound(socket: GameSocket): void {
  if (socket.data.roomCode || socket.data.playerId) {
    throw new RoomError("ALREADY_IN_ROOM", "Debes salir de tu sala actual antes de entrar a otra.");
  }
}

function emitRoom(io: GameServer, rooms: RoomManager, room: Room): void {
  io.to(room.code).emit("ROOM_UPDATED", rooms.getRoomView(room));
}

function emitGame(io: GameServer, room: Room, event: "GAME_STARTED" | "GAME_STATE_UPDATED" = "GAME_STATE_UPDATED"): void {
  if (!room.engine) return;
  for (const player of room.players.values()) {
    if (!player.socketId) continue;
    const socket = io.sockets.sockets.get(player.socketId);
    if (socket) socket.emit(event, room.engine.getPlayerView(player.playerId));
  }
}

async function bindSession(socket: GameSocket, room: Room, playerId: string): Promise<void> {
  if (socket.data.roomCode) await socket.leave(socket.data.roomCode);
  socket.data.roomCode = room.code;
  socket.data.playerId = playerId;
  await socket.join(room.code);
}

function validate<T>(schema: ZodType<T>, payload: unknown): T {
  return schema.parse(payload);
}

export function registerSocketHandlers(io: GameServer, rooms = new RoomManager()): RoomManager {
  io.on("connection", (socket) => {
    socket.on("CREATE_ROOM", async (raw, ack) => {
      try {
        requireUnbound(socket);
        const payload = validate(schemas.create, raw);
        const session = rooms.createRoom(payload.name, socket.id);
        await bindSession(socket, session.room, session.player.playerId);
        socket.emit("ROOM_CREATED", { room: rooms.getRoomView(session.room), credentials: session.credentials });
        ack(success(session.credentials));
      } catch (error) {
        const clientError = toClientError(error);
        socket.emit("GAME_ERROR", clientError);
        ack({ ok: false, error: clientError });
      }
    });

    socket.on("JOIN_ROOM", async (raw, ack) => {
      try {
        requireUnbound(socket);
        const payload = validate(schemas.join, raw);
        const session = rooms.joinRoom(payload.roomCode, payload.name, socket.id);
        await bindSession(socket, session.room, session.player.playerId);
        socket.to(session.room.code).emit("PLAYER_JOINED", {
          playerId: session.player.playerId,
          name: session.player.name,
        });
        emitRoom(io, rooms, session.room);
        ack(success(session.credentials));
      } catch (error) {
        const clientError = toClientError(error);
        socket.emit("GAME_ERROR", clientError);
        ack({ ok: false, error: clientError });
      }
    });

    socket.on("RECONNECT_PLAYER", async (raw, ack) => {
      try {
        requireUnbound(socket);
        const payload = validate(schemas.reconnect, raw);
        const session = rooms.reconnect(payload.roomCode, payload.sessionToken, socket.id);
        if (session.previousSocketId && session.previousSocketId !== socket.id) {
          const oldSocket = io.sockets.sockets.get(session.previousSocketId);
          if (oldSocket) {
            oldSocket.data = {};
            oldSocket.disconnect(true);
          }
        }
        await bindSession(socket, session.room, session.player.playerId);
        io.to(session.room.code).emit("PLAYER_RECONNECTED", {
          playerId: session.player.playerId,
          name: session.player.name,
        });
        emitRoom(io, rooms, session.room);
        if (session.room.engine) socket.emit("GAME_STATE_UPDATED", session.room.engine.getPlayerView(session.player.playerId));
        ack(success(session.credentials));
      } catch (error) {
        const clientError = toClientError(error);
        socket.emit("GAME_ERROR", clientError);
        ack({ ok: false, error: clientError });
      }
    });

    socket.on("START_GAME", async (raw, ack) => {
      try {
        validate(emptySchema, raw);
        const { room, playerId } = roomIdentity(socket, rooms);
        await rooms.runExclusive(room, () => rooms.startGame(room.code, playerId));
        emitRoom(io, rooms, room);
        emitGame(io, room, "GAME_STARTED");
        ack({ ok: true });
      } catch (error) {
        const clientError = toClientError(error);
        socket.emit("GAME_ERROR", clientError);
        ack({ ok: false, error: clientError });
      }
    });

    socket.on("PLAY_CARD", async (raw, ack) => {
      try {
        const payload = validate(schemas.play, raw);
        const { room, playerId } = roomIdentity(socket, rooms);
        await rooms.runExclusive(room, () => {
          if (!room.engine) throw new GameError("GAME_NOT_STARTED", "La partida no ha comenzado.");
          room.engine.playCard(playerId, payload.cardId);
        });
        emitGame(io, room);
        const state = room.engine!.getState();
        if (state.status === "FINISHED") io.to(room.code).emit("GAME_FINISHED", { winnerPlayerId: state.winnerPlayerId! });
        ack({ ok: true });
      } catch (error) {
        const clientError = toClientError(error);
        socket.emit("GAME_ERROR", clientError);
        ack({ ok: false, error: clientError });
      }
    });

    socket.on("SWAP_TRAP_CARD", async (raw, ack) => {
      try {
        const payload = validate(schemas.swap, raw);
        const { room, playerId } = roomIdentity(socket, rooms);
        await rooms.runExclusive(room, () => {
          if (!room.engine) throw new GameError("GAME_NOT_STARTED", "La partida no ha comenzado.");
          room.engine.swapTrapCard(playerId, payload.handCardId, payload.trapCardId);
        });
        // Only the actor receives the changed private state. No public signal is emitted.
        socket.emit("GAME_STATE_UPDATED", room.engine!.getPlayerView(playerId));
        ack({ ok: true });
      } catch (error) {
        const clientError = toClientError(error);
        socket.emit("GAME_ERROR", clientError);
        ack({ ok: false, error: clientError });
      }
    });

    socket.on("TAKE_PILE", async (raw, ack) => {
      try {
        validate(emptySchema, raw);
        const { room, playerId } = roomIdentity(socket, rooms);
        await rooms.runExclusive(room, () => {
          if (!room.engine) throw new GameError("GAME_NOT_STARTED", "La partida no ha comenzado.");
          room.engine.takePile(playerId);
        });
        emitGame(io, room);
        ack({ ok: true });
      } catch (error) {
        const clientError = toClientError(error);
        socket.emit("GAME_ERROR", clientError);
        ack({ ok: false, error: clientError });
      }
    });

    socket.on("ACCUSE_PLAYER", async (raw, ack) => {
      try {
        const payload = validate(schemas.accuse, raw);
        const { room, playerId } = roomIdentity(socket, rooms);
        const result = await rooms.runExclusive(room, () => {
          if (!room.engine) throw new GameError("GAME_NOT_STARTED", "La partida no ha comenzado.");
          return room.engine.accusePlayer(playerId, payload.accusedPlayerId);
        });
        emitGame(io, room);
        if (result.eliminatedPlayerId) io.to(room.code).emit("PLAYER_ELIMINATED", { playerId: result.eliminatedPlayerId });
        const state = room.engine!.getState();
        if (state.status === "FINISHED") io.to(room.code).emit("GAME_FINISHED", { winnerPlayerId: state.winnerPlayerId! });
        ack({ ok: true });
      } catch (error) {
        const clientError = toClientError(error);
        socket.emit("GAME_ERROR", clientError);
        ack({ ok: false, error: clientError });
      }
    });

    socket.on("LEAVE_ROOM", async (raw, ack) => {
      try {
        validate(emptySchema, raw);
        const { room, playerId } = roomIdentity(socket, rooms);
        const result = rooms.leave(room.code, playerId);
        socket.data = {};
        await socket.leave(room.code);
        socket.to(room.code).emit("PLAYER_LEFT", { playerId, name: result.player.name });
        if (result.room) emitRoom(io, rooms, result.room);
        ack({ ok: true });
      } catch (error) {
        const clientError = toClientError(error);
        socket.emit("GAME_ERROR", clientError);
        ack({ ok: false, error: clientError });
      }
    });

    socket.on("disconnect", () => {
      const session = rooms.disconnect(socket.id);
      if (!session) return;
      emitRoom(io, rooms, session.room);
      emitGame(io, session.room);
    });
  });

  return rooms;
}
