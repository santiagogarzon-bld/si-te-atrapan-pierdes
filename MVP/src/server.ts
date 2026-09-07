import "dotenv/config";
import { createGameServer } from "./serverApp.js";

const port = Number(process.env.PORT ?? 3000);
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const { httpServer } = createGameServer(clientOrigin);

httpServer.listen(port, () => {
  console.log(`Game server listening on http://localhost:${port}`);
});
