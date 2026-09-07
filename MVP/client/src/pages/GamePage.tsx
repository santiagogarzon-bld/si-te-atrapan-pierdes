import { useState } from "react";
import { AccusationModal } from "../components/AccusationModal";
import { CardButton } from "../components/CardButton";
import { GameLog } from "../components/GameLog";
import { PlayerList } from "../components/PlayerList";
import { useGameStore } from "../store";
import type { Card } from "../types";

function playable(card: Card, activeValue: number): boolean {
  return card.type !== "NUMBER" || card.value >= activeValue;
}

export function GamePage() {
  const { game, busy, playCard, swapTrap, takePile, accuse, leaveRoom } = useGameStore();
  const [handSelection, setHandSelection] = useState<string | null>(null);
  const [trapSelection, setTrapSelection] = useState<string | null>(null);
  const [accusedId, setAccusedId] = useState<string | null>(null);
  if (!game) return null;

  const current = game.players.find((player) => player.playerId === game.game.currentPlayerId);
  const winner = game.players.find((player) => player.playerId === game.game.winnerPlayerId);
  const mayAct = game.self.isCurrentTurn && game.self.alive && game.game.status === "IN_PROGRESS" && !busy;
  const isBlocked = !game.self.hand.some((card) => playable(card, game.game.activeValue));
  const accused = game.players.find((player) => player.playerId === accusedId);

  const executeSwap = async () => {
    if (!handSelection || !trapSelection) return;
    await swapTrap(handSelection, trapSelection);
    setHandSelection(null);
    setTrapSelection(null);
  };

  return (
    <div className="game-layout">
      <header className="game-header">
        <div className="brand"><span className="brand-mark">LT</span><span><strong>La Trampa</strong><small>Sala {game.game.roomCode}</small></span></div>
        <div className={`turn-callout ${game.self.isCurrentTurn ? "your-turn" : ""}`}>
          <span>{game.self.isCurrentTurn ? "Tu turno" : "Turno actual"}</span><strong>{game.self.isCurrentTurn ? "Juega una carta" : current?.name ?? "—"}</strong>
        </div>
        <button className="text-button" onClick={() => void leaveRoom()}>Salir</button>
      </header>

      <aside className="left-column"><PlayerList game={game} onAccuse={setAccusedId} /><GameLog game={game} /></aside>

      <section className="table-area">
        <div className="table-stats">
          <div><span>Valor activo</span><strong>{game.game.activeValue}</strong></div>
          <div><span>Mazo</span><strong>{game.game.deckCount}</strong></div>
          <div><span>Pila abierta</span><strong>{game.game.openPileCount}</strong></div>
        </div>
        <div className="open-pile">
          <span className="eyebrow">Carta superior</span>
          {game.game.topCard && <CardButton card={game.game.topCard} disabled />}
          <p>Juega un número igual o mayor a <strong>{game.game.activeValue}</strong>, o usa un comodín.</p>
        </div>
        {mayAct && isBlocked && <button className="button danger take-pile" onClick={() => void takePile()}>No tengo jugada · Recoger pila</button>}
      </section>

      <section className="hand-area">
        <div className="section-heading">
          <div><span className="eyebrow">Tu mano</span><h2>{game.self.hand.length} cartas</h2></div>
          {!game.self.alive && <span className="eliminated-label">Has sido eliminado</span>}
        </div>
        <div className="card-row hand-cards">
          {game.self.hand.map((card) => {
            const canPlay = playable(card, game.game.activeValue);
            return <CardButton key={card.id} card={card} playable={canPlay} selected={handSelection === card.id} disabled={!game.self.alive || busy} onClick={() => {
              if (mayAct && canPlay && handSelection !== card.id) void playCard(card.id);
              else if (mayAct) setHandSelection(handSelection === card.id ? null : card.id);
            }} />;
          })}
        </div>
        <p className="hand-hint">Durante tu turno, pulsa una carta válida para jugarla. Para intercambiar, activa el modo discreto debajo.</p>
      </section>

      <aside className="trap-panel panel">
        <div className="trap-title"><div><span className="eyebrow">Zona secreta</span><h2>Cartas trampa</h2></div><span className="secret-badge">Solo tú</span></div>
        <p>Selecciona una carta de tu mano y una de esta zona. El intercambio no se anunciará.</p>
        <div className="card-row trap-cards">
          {game.self.trapCards.map((card) => <CardButton compact key={card.id} card={card} selected={trapSelection === card.id} disabled={!mayAct} onClick={() => setTrapSelection(trapSelection === card.id ? null : card.id)} />)}
        </div>
        <div className="swap-controls">
          <select value={handSelection ?? ""} onChange={(event) => setHandSelection(event.target.value || null)} disabled={!mayAct}>
            <option value="">Carta de tu mano…</option>
            {game.self.hand.map((card) => <option value={card.id} key={card.id}>{card.type === "NUMBER" ? card.value : card.type}</option>)}
          </select>
          <button className="button trap-button" disabled={!mayAct || !handSelection || !trapSelection} onClick={() => void executeSwap()}>Intercambiar en secreto</button>
        </div>
        {game.self.pendingCheat && <p className="private-warning">Tu trampa puede ser descubierta hasta que vuelva tu turno.</p>}
      </aside>

      {game.game.status === "FINISHED" && (
        <div className="winner-banner"><span className="eyebrow">Partida terminada</span><h2>{winner?.playerId === game.self.playerId ? "¡Ganaste!" : `${winner?.name ?? "Un jugador"} ganó`}</h2><button className="button secondary" onClick={() => void leaveRoom()}>Volver al inicio</button></div>
      )}
      {accused && <AccusationModal name={accused.name} onCancel={() => setAccusedId(null)} onConfirm={() => { void accuse(accused.playerId); setAccusedId(null); }} />}
    </div>
  );
}
