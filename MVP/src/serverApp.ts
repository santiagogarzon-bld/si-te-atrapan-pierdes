import cors from "cors";
import express from "express";
import { createServer as createHttpServer, type Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { RoomManager } from "./rooms/RoomManager.js";
import { registerSocketHandlers } from "./socket/socketHandlers.js";
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from "./shared/contracts.js";

export interface GameServer {
  app: express.Express;
  httpServer: HttpServer;
  io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
  rooms: RoomManager;
}

export function createGameServer(clientOrigin = "http://localhost:5173"): GameServer {
  const app = express();
  app.use(cors({ origin: clientOrigin }));
  app.use(express.json());
  app.get("/health", (_request, response) => response.json({ ok: true }));

  const httpServer = createHttpServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    cors: { origin: clientOrigin, methods: ["GET", "POST"] },
  });
  const rooms = registerSocketHandlers(io);
  return { app, httpServer, io, rooms };
}
