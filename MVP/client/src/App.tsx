import { useEffect } from "react";
import { GamePage } from "./pages/GamePage";
import { HomePage } from "./pages/HomePage";
import { LobbyPage } from "./pages/LobbyPage";
import { useGameStore } from "./store";

export function App() {
  const { initialize, connected, reconnecting, room, game, error, notice, dismissError, dismissNotice } = useGameStore();

  useEffect(() => initialize(), [initialize]);

  return (
    <main className="app-shell">
      <div className={`connection ${connected ? "online" : "offline"}`}>
        <span /> {connected ? "Conectado" : "Reconectando…"}
      </div>
      {reconnecting ? <div className="loading-screen">Recuperando tu partida…</div> : game ? <GamePage /> : room ? <LobbyPage /> : <HomePage />}
      {error && (
        <button className="toast error-toast" onClick={dismissError}>
          <strong>{error.code}</strong><span>{error.message}</span>
        </button>
      )}
      {notice && (
        <button className="toast notice-toast" onClick={dismissNotice}>{notice}</button>
      )}
    </main>
  );
}
