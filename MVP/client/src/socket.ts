import { io, type Socket } from "socket.io-client";
import type { ClientEvents, ServerEvents } from "./types";

export const socket: Socket<ServerEvents, ClientEvents> = io(
  import.meta.env.VITE_API_URL || window.location.origin,
  { autoConnect: false, transports: ["websocket", "polling"] },
);
