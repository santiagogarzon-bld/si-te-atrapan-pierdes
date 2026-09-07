import type { PlayerView } from "../types";

export function PlayerList({ game, onAccuse }: { game: PlayerView; onAccuse: (id: string) => void }) {
  return (
    <section className="panel players-panel">
      <div className="section-heading"><h2>Jugadores</h2><span>{game.players.filter((p) => p.alive).length} activos</span></div>
      <div className="player-list">
        {game.players.map((player) => (
          <article className={`player-row ${player.isCurrentTurn ? "current" : ""} ${!player.alive ? "eliminated" : ""}`} key={player.playerId}>
            <div className="avatar">{player.name.slice(0, 1).toUpperCase()}</div>
            <div className="player-info">
              <strong>{player.name}{player.playerId === game.self.playerId ? " (tú)" : ""}</strong>
              <span>{player.alive ? `${player.handCount} cartas` : "Eliminado"}</span>
            </div>
            <div className="player-flags">
              {!player.connected && <span title="Desconectado">○</span>}
              {player.isCurrentTurn && <span className="turn-badge">Turno</span>}
              {game.self.alive && player.alive && player.playerId !== game.self.playerId && (
                <button className="accuse-mini" onClick={() => onAccuse(player.playerId)}>Acusar</button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
