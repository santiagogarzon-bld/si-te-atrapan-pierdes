import { useState } from "react";
import { useGameStore } from "../store";

export function LobbyPage() {
  const { room, credentials, startGame, leaveRoom, busy } = useGameStore();
  const [copied, setCopied] = useState(false);
  if (!room || !credentials) return null;
  const isHost = room.hostPlayerId === credentials.playerId;
  const connectedPlayers = room.players.filter((player) => player.connected).length;
  const canStart = isHost && connectedPlayers >= 2 && !busy;

  const copyCode = async () => {
    await navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="lobby-layout">
      <header className="brand-header"><span className="brand-mark">LT</span><span>La Trampa</span><button className="text-button" onClick={() => void leaveRoom()}>Salir</button></header>
      <section className="lobby-card">
        <span className="eyebrow">Sala de espera</span>
        <h1>Reúne a tu mesa</h1>
        <p>Comparte este código. La partida admite hasta 6 jugadores.</p>
        <button className="room-code" onClick={() => void copyCode()}><strong>{room.roomCode}</strong><span>{copied ? "Copiado" : "Copiar código"}</span></button>
        <div className="lobby-list">
          {room.players.map((player, index) => (
            <article key={player.playerId}>
              <span className="seat-number">{String(index + 1).padStart(2, "0")}</span>
              <div className="avatar">{player.name[0]?.toUpperCase()}</div>
              <strong>{player.name}{player.playerId === credentials.playerId ? " (tú)" : ""}</strong>
              <span className={player.connected ? "ready" : "offline-text"}>{player.connected ? "Listo" : "Desconectado"}</span>
              {player.isHost && <span className="host-badge">Host</span>}
            </article>
          ))}
          {Array.from({ length: 6 - room.players.length }, (_, index) => <article className="empty-seat" key={index}>Esperando jugador…</article>)}
        </div>
        {isHost ? (
          <button className="button primary wide" disabled={!canStart} onClick={() => void startGame()}>
            {connectedPlayers < 2 ? "Esperando al menos 2 conectados" : busy ? "Iniciando…" : "Iniciar partida"}
          </button>
        ) : <div className="waiting-message"><span className="pulse" /> Esperando a que el host inicie…</div>}
      </section>
    </div>
  );
}
