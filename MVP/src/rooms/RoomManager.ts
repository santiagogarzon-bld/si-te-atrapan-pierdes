import { randomBytes, randomUUID } from "node:crypto";
import { GameEngine } from "../game/GameEngine.js";
import { defaultGameConfig } from "../game/gameConfig.js";
import type { RoomView, SessionCredentials } from "../shared/contracts.js";
import { RoomError } from "./RoomError.js";

export interface RoomPlayer {
  playerId: string;
  sessionToken: string;
  name: string;
  connected: boolean;
  socketId: string | null;
}

export interface Room {
  id: string;
  code: string;
  hostPlayerId: string;
  players: Map<string, RoomPlayer>;
  engine: GameEngine | null;
  queue: Promise<void>;
}

export interface RoomSession {
  room: Room;
  player: RoomPlayer;
  credentials: SessionCredentials;
  previousSocketId: string | null;
}

export class RoomManager {
  private readonly rooms = new Map<string, Room>();

  createRoom(name: string, socketId: string): RoomSession {
    const player = this.createPlayer(name, socketId);
    const code = this.createUniqueRoomCode();
    const room: Room = {
      id: randomUUID(),
      code,
      hostPlayerId: player.playerId,
      players: new Map([[player.playerId, player]]),
      engine: null,
      queue: Promise.resolve(),
    };
    this.rooms.set(code, room);
    return this.session(room, player);
  }

  joinRoom(rawCode: string, name: string, socketId: string): RoomSession {
    const room = this.requireRoom(rawCode);
    if (room.engine) throw new RoomError("ROOM_ALREADY_STARTED", "La partida ya comenzó.");
    if (room.players.size >= defaultGameConfig.maxPlayers) throw new RoomError("ROOM_FULL", "La sala está llena.");
    const normalizedName = name.trim();
    if ([...room.players.values()].some((player) => player.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase())) {
      throw new RoomError("NAME_ALREADY_USED", "Ese nombre ya está siendo usado en la sala.");
    }
    const player = this.createPlayer(normalizedName, socketId);
    room.players.set(player.playerId, player);
    return this.session(room, player);
  }

  reconnect(rawCode: string, sessionToken: string, socketId: string): RoomSession {
    const room = this.requireRoom(rawCode);
    const player = [...room.players.values()].find((candidate) => candidate.sessionToken === sessionToken);
    if (!player) throw new RoomError("INVALID_SESSION", "La sesión no pertenece a esta sala.");
    const previousSocketId = player.socketId;
    player.connected = true;
    player.socketId = socketId;
    room.engine?.setPlayerConnected(player.playerId, true);
    return this.session(room, player, previousSocketId);
  }

  disconnect(socketId: string): RoomSession | null {
    for (const room of this.rooms.values()) {
      const player = [...room.players.values()].find((candidate) => candidate.socketId === socketId);
      if (!player) continue;
      player.connected = false;
      player.socketId = null;
      room.engine?.setPlayerConnected(player.playerId, false);
      return this.session(room, player);
    }
    return null;
  }

  leave(roomCode: string, playerId: string): { room: Room | null; player: RoomPlayer } {
    const room = this.requireRoom(roomCode);
    const player = this.requirePlayer(room, playerId);
    if (room.engine) {
      player.connected = false;
      player.socketId = null;
      room.engine.setPlayerConnected(playerId, false);
      return { room, player };
    }
    room.players.delete(playerId);
    if (room.players.size === 0) {
      this.rooms.delete(room.code);
      return { room: null, player };
    }
    if (room.hostPlayerId === playerId) room.hostPlayerId = room.players.values().next().value!.playerId;
    return { room, player };
  }

  startGame(roomCode: string, playerId: string): GameEngine {
    const room = this.requireRoom(roomCode);
    if (room.engine) throw new RoomError("ROOM_ALREADY_STARTED", "La partida ya comenzó.");
    if (room.hostPlayerId !== playerId) throw new RoomError("ONLY_HOST_CAN_START", "Solo el host puede iniciar.");
    if ([...room.players.values()].filter((player) => player.connected).length < defaultGameConfig.minPlayers) {
      throw new RoomError("NOT_ENOUGH_PLAYERS", "Se necesitan al menos dos jugadores conectados.");
    }
    const engine = GameEngine.create({
      id: room.id,
      roomCode: room.code,
      hostPlayerId: room.hostPlayerId,
      players: [...room.players.values()].map((player) => ({
        id: player.playerId,
        sessionToken: player.sessionToken,
        name: player.name,
        connected: player.connected,
      })),
    });
    engine.startGame(playerId);
    room.engine = engine;
    return engine;
  }

  requireRoom(rawCode: string): Room {
    const code = rawCode.trim().toUpperCase();
    const room = this.rooms.get(code);
    if (!room) throw new RoomError("ROOM_NOT_FOUND", "No existe una sala con ese código.");
    return room;
  }

  requirePlayer(room: Room, playerId: string): RoomPlayer {
    const player = room.players.get(playerId);
    if (!player) throw new RoomError("PLAYER_NOT_FOUND", "El jugador no pertenece a la sala.");
    return player;
  }

  getRoomView(room: Room): RoomView {
    const status = room.engine?.getState().status ?? "WAITING";
    return {
      roomCode: room.code,
      status,
      hostPlayerId: room.hostPlayerId,
      players: [...room.players.values()].map((player) => ({
        playerId: player.playerId,
        name: player.name,
        connected: player.connected,
        isHost: player.playerId === room.hostPlayerId,
      })),
    };
  }

  runExclusive<T>(room: Room, action: () => T | Promise<T>): Promise<T> {
    const result = room.queue.then(action, action);
    room.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  private createPlayer(name: string, socketId: string): RoomPlayer {
    return {
      playerId: randomUUID(),
      sessionToken: randomUUID(),
      name: name.trim(),
      connected: true,
      socketId,
    };
  }

  private createUniqueRoomCode(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (;;) {
      const bytes = randomBytes(6);
      const code = [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
      if (!this.rooms.has(code)) return code;
    }
  }

  private session(room: Room, player: RoomPlayer, previousSocketId: string | null = null): RoomSession {
    return {
      room,
      player,
      credentials: { roomCode: room.code, playerId: player.playerId, sessionToken: player.sessionToken },
      previousSocketId,
    };
  }
}
