import type { PlayerView, PublicGameEvent } from "../types";

function eventText(event: PublicGameEvent, name: (id?: string) => string): string {
  switch (event.type) {
    case "GAME_STARTED": return "La partida comenzó.";
    case "CARD_PLAYED": return `${name(event.playerId)} jugó ${event.cardType === "NUMBER" ? event.value : event.cardType}.`;
    case "PILE_TAKEN": return `${name(event.playerId)} recogió ${event.cardCount} cartas.`;
    case "PLAYER_ACCUSED": return event.correct
      ? `${name(event.accuserPlayerId)} descubrió la trampa de ${name(event.accusedPlayerId)}.`
      : `La acusación de ${name(event.accuserPlayerId)} contra ${name(event.accusedPlayerId)} fue incorrecta.`;
    case "PLAYER_ELIMINATED": return `${name(event.playerId)} fue eliminado.`;
    case "GAME_FINISHED": return `${name(event.winnerPlayerId)} ganó la partida.`;
  }
}

export function GameLog({ game }: { game: PlayerView }) {
  const name = (id?: string) => game.players.find((player) => player.playerId === id)?.name ?? "Jugador";
  return (
    <section className="panel log-panel">
      <div className="section-heading"><h2>Historial</h2><span>Público</span></div>
      <ol className="game-log">
        {game.game.publicLog.slice(-8).reverse().map((event, index) => (
          <li key={`${event.type}-${game.game.publicLog.length - index}`}>{eventText(event, name)}</li>
        ))}
      </ol>
    </section>
  );
}
