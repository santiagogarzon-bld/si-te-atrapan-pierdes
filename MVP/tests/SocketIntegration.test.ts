import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { io as createClient, type Socket as ClientSocket } from "socket.io-client";
import { createGameServer, type GameServer } from "../src/serverApp.js";
import type {
  Ack,
  ClientToServerEvents,
  ServerToClientEvents,
  SessionCredentials,
} from "../src/shared/contracts.js";
import type { PlayerView } from "../src/game/GameState.js";

type TestSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

let server: GameServer | null = null;
const sockets: TestSocket[] = [];

function waitFor<T>(subscribe: (resolve: (value: T) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for socket event")), 3000);
    subscribe((value) => {
      clearTimeout(timer);
      resolve(value);
    });
  });
}

function connect(url: string): Promise<TestSocket> {
  const socket = createClient(url, { transports: ["websocket"], forceNew: true });
  sockets.push(socket);
  return waitFor<TestSocket>((resolve) => socket.once("connect", () => resolve(socket)));
}

function createRoom(socket: TestSocket, name: string): Promise<Ack<SessionCredentials>> {
  return waitFor((resolve) => socket.emit("CREATE_ROOM", { name }, resolve));
}

function joinRoom(socket: TestSocket, roomCode: string, name: string): Promise<Ack<SessionCredentials>> {
  return waitFor((resolve) => socket.emit("JOIN_ROOM", { roomCode, name }, resolve));
}

function gameEvent(socket: TestSocket, event: "GAME_STARTED" | "GAME_STATE_UPDATED"): Promise<PlayerView> {
  return waitFor((resolve) => socket.once(event, resolve));
}

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.disconnect();
  if (server) {
    await new Promise<void>((resolve) => server!.io.close(() => resolve()));
    server = null;
  }
});

describe("Socket.IO multiplayer integration", () => {
  it("synchronizes a game without leaking private cards, serializes duplicates, and reconnects", async () => {
    server = createGameServer("*");
    await new Promise<void>((resolve) => server!.httpServer.listen(0, "127.0.0.1", resolve));
    const port = (server.httpServer.address() as AddressInfo).port;
    const url = `http://127.0.0.1:${port}`;
    const host = await connect(url);
    const guest = await connect(url);

    const hostAck = await createRoom(host, "Ana");
    expect(hostAck.ok).toBe(true);
    if (!hostAck.ok) return;
    const guestAck = await joinRoom(guest, hostAck.data.roomCode, "Beto");
    expect(guestAck.ok).toBe(true);

    const hostStarted = gameEvent(host, "GAME_STARTED");
    const guestStarted = gameEvent(guest, "GAME_STARTED");
    const startAck = await waitFor<Ack>((resolve) => host.emit("START_GAME", {}, resolve));
    expect(startAck.ok).toBe(true);
    const [hostView, guestView] = await Promise.all([hostStarted, guestStarted]);

    const hostSerialized = JSON.stringify(hostView);
    for (const card of [...guestView.self.hand, ...guestView.self.trapCards]) {
      expect(hostSerialized).not.toContain(card.id);
    }
    expect(hostSerialized).not.toContain(guestView.self.sessionToken);
    expect(hostView.players.find((player) => player.playerId === guestView.self.playerId)).not.toHaveProperty("pendingCheat");

    const room = server.rooms.requireRoom(hostAck.data.roomCode);
    const engine = room.engine!;
    const before = engine.getState();
    const playable = hostView.self.hand.find((card) => card.type !== "NUMBER" || card.value >= hostView.game.activeValue);
    const results = playable
      ? await Promise.all([
          waitFor<Ack>((resolve) => host.emit("PLAY_CARD", { cardId: playable.id }, resolve)),
          waitFor<Ack>((resolve) => host.emit("PLAY_CARD", { cardId: playable.id }, resolve)),
        ])
      : await Promise.all([
          waitFor<Ack>((resolve) => host.emit("TAKE_PILE", {}, resolve)),
          waitFor<Ack>((resolve) => host.emit("TAKE_PILE", {}, resolve)),
        ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toHaveLength(1);
    expect(engine.getState()).not.toEqual(before);

    host.disconnect();
    const replacement = await connect(url);
    const restoredState = gameEvent(replacement, "GAME_STATE_UPDATED");
    const reconnectAck = await waitFor<Ack<SessionCredentials>>((resolve) => replacement.emit("RECONNECT_PLAYER", {
      roomCode: hostAck.data.roomCode,
      sessionToken: hostAck.data.sessionToken,
    }, resolve));
    expect(reconnectAck.ok).toBe(true);
    const restored = await restoredState;
    expect(restored.self.playerId).toBe(hostAck.data.playerId);
    expect(restored.self.hand).toEqual(engine.getPlayerView(hostAck.data.playerId).self.hand);
  });
});
