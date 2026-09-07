import { useState } from "react";
import { Icon } from "../components/Icon";
import { useGameStore } from "../store";
export function LobbyPage() {
  const { room, credentials, startGame, leaveRoom, busy, connected } =
    useGameStore();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  if (!room || !credentials) return null;
  const isHost = room.hostPlayerId === credentials.playerId;
  const connectedPlayers = room.players.filter((p) => p.connected).length;
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  };
  return (
    <div className="lobby-layout">
      <section className="lobby-card">
        <button
          className="back-link"
          disabled={busy}
          onClick={() => void leaveRoom()}
        >
          <Icon name="exit" size={16} /> Salir de la mesa
        </button>
        <span className="eyebrow">TU RINCÓN DEL BOSQUE</span>
        <h1>
          Hay sitio
          <br />
          para tus <em>amigos.</em>
        </h1>
        <p>Comparte el código y que empiecen las sospechas.</p>
        <button
          className="room-code"
          onClick={() => void copyCode()}
          title="Copiar código"
        >
          <span>
            CÓDIGO DE LA MESA<strong>{room.roomCode}</strong>
          </span>
          <Icon name="copy" />
          <small>{copied ? "¡Copiado!" : "Copiar"}</small>
        </button>
        {copyError && (
          <p role="status">
            Selecciona y copia el código de arriba para compartirlo.
          </p>
        )}
        <div className="section-heading">
          <h2>En la mesa</h2>
          <span>{room.players.length} / 6 jugadores</span>
        </div>
        <div className="lobby-list">
          {room.players.map((p, i) => (
            <article key={p.playerId}>
              <span className={`avatar avatar-${i}`}>
                {p.name[0]?.toUpperCase()}
              </span>
              <strong>
                {p.name}
                {p.playerId === credentials.playerId && <small> · tú</small>}
              </strong>
              {p.isHost && <span className="host-badge">Anfitrión</span>}
              <span className={p.connected ? "ready" : "offline-text"}>
                {p.connected ? "● Listo" : "Ausente"}
              </span>
            </article>
          ))}
          {room.players.length < 6 && (
            <article className="empty-seat">
              <span>+</span> Guardando un sitio para alguien más…
            </article>
          )}
        </div>
        {isHost ? (
          <button
            className="button primary wide"
            disabled={!connected || connectedPlayers < 2 || busy}
            onClick={() => void startGame()}
          >
            {connectedPlayers < 2
              ? "Esperando a otro jugador…"
              : busy
                ? "Repartiendo las cartas…"
                : "¡A jugar!"}
            <Icon name="arrow" />
          </button>
        ) : (
          <div className="waiting-message">
            <span className="pulse" /> El anfitrión iniciará la partida.
          </div>
        )}
        <p className="privacy-note">
          Los personajes se asignan según el orden de llegada.
        </p>
      </section>
    </div>
  );
}
