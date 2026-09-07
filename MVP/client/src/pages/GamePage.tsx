import { useEffect, useState } from "react";
import { AccusationModal } from "../components/AccusationModal";
import { CardButton } from "../components/CardButton";
import { GameLog } from "../components/GameLog";
import { PlayerList } from "../components/PlayerList";
import { Icon } from "../components/Icon";
import { Modal } from "../components/Modal";
import { useGameStore } from "../store";
import type { Card } from "../types";
const playable = (card: Card, active: number) =>
  card.type !== "NUMBER" || card.value >= active;
export function GamePage() {
  const {
    game,
    busy,
    connected,
    playCard,
    swapTrap,
    takePile,
    accuse,
    leaveRoom,
  } = useGameStore();
  const [handSelection, setHandSelection] = useState<string | null>(null);
  const [trapSelection, setTrapSelection] = useState<string | null>(null);
  const [accusedId, setAccusedId] = useState<string | null>(null);
  const [secretOpen, setSecretOpen] = useState(false);
  useEffect(() => {
    setHandSelection(null);
    setTrapSelection(null);
    setSecretOpen(false);
  }, [game?.game.currentPlayerId]);
  if (!game) return null;
  const current = game.players.find(
    (p) => p.playerId === game.game.currentPlayerId,
  );
  const winner = game.players.find(
    (p) => p.playerId === game.game.winnerPlayerId,
  );
  const mayAct =
    connected &&
    game.self.isCurrentTurn &&
    game.self.alive &&
    game.game.status === "IN_PROGRESS" &&
    !busy;
  const isBlocked = !game.self.hand.some((c) =>
    playable(c, game.game.activeValue),
  );
  const selected = game.self.hand.find((c) => c.id === handSelection);
  const accused = game.players.find((p) => p.playerId === accusedId);
  const executeSwap = async () => {
    if (!handSelection || !trapSelection || !mayAct) return;
    await swapTrap(handSelection, trapSelection);
    setHandSelection(null);
    setTrapSelection(null);
  };
  return (
    <div className="game-layout">
      <header className="game-header">
        <span className="table-id">
          MESA <strong>{game.game.roomCode}</strong>
        </span>
        <div
          className={`turn-callout ${game.self.isCurrentTurn ? "your-turn" : ""}`}
        >
          <span className="pulse" />
          <span>
            {game.game.status === "FINISHED"
              ? "Partida terminada"
              : !connected
                ? "Reconectando con la mesa…"
                : game.self.isCurrentTurn
                  ? "Tu turno. Haz tu jugada."
                  : `Turno de ${current?.name ?? "…"}`}
          </span>
        </div>
        <button className="back-link" onClick={() => void leaveRoom()}>
          <Icon name="exit" size={16} /> Salir
        </button>
      </header>
      <aside className="left-column">
        <PlayerList game={game} onAccuse={setAccusedId} />
        <GameLog game={game} />
      </aside>
      <section className="table-area" aria-label="Estado de la mesa">
        <div className="table-stats">
          <div>
            <span>Valor activo</span>
            <strong>
              {game.game.activeValue}
              <small> o mayor</small>
            </strong>
          </div>
          <div>
            <span>En el mazo</span>
            <strong>{game.game.deckCount}</strong>
          </div>
          <div>
            <span>En la pila</span>
            <strong>{game.game.openPileCount}</strong>
          </div>
        </div>
        <div className="top-card-info">
          En la mesa:{" "}
          <strong>
            {game.game.topCard
              ? game.game.topCard.type === "NUMBER"
                ? game.game.topCard.value
                : `Comodín ${game.game.topCard.type}`
              : "Sin carta"}
          </strong>
        </div>
        {mayAct && isBlocked && (
          <button
            className="button danger take-pile"
            onClick={() => void takePile()}
          >
            Sin jugada · Recoger pila ({game.game.openPileCount})
          </button>
        )}
      </section>
      <section className="hand-area">
        <div className="hand-heading">
          <div>
            <span className="eyebrow">TUS CARTAS</span>
            <h2>
              {!game.self.alive
                ? "Estás de espectador"
                : secretOpen
                  ? "Que nadie te vea…"
                  : game.self.isCurrentTurn
                    ? "Tu próxima gran jugada."
                    : "Prepara tu estrategia."}
            </h2>
          </div>
          <button
            className={`secret-toggle ${secretOpen ? "active" : ""}`}
            onClick={() => setSecretOpen(!secretOpen)}
            aria-expanded={secretOpen}
          >
            <Icon name="eye" size={17} /> Zona secreta{" "}
            <span>{game.self.trapCards.length}</span>
          </button>
        </div>
        <div className="hand-content">
          <div className="card-row hand-cards">
            {game.self.hand.map((c) => (
              <CardButton
                key={c.id}
                card={c}
                playable={secretOpen || playable(c, game.game.activeValue)}
                selected={handSelection === c.id}
                disabled={!mayAct}
                onClick={() =>
                  setHandSelection(handSelection === c.id ? null : c.id)
                }
              />
            ))}
          </div>
          <div className="hand-action">
            <p>
              {!game.self.alive
                ? "Puedes seguir viendo la partida."
                : secretOpen
                  ? "Elige una carta de tu mano y una secreta para intercambiarlas."
                  : "Selecciona una carta y confirma tu jugada."}
            </p>
            {!secretOpen && (
              <button
                className="button primary"
                disabled={
                  !mayAct ||
                  !selected ||
                  !playable(selected, game.game.activeValue)
                }
                onClick={async () => {
                  if (!selected || !mayAct) return;
                  await playCard(selected.id);
                  setHandSelection(null);
                }}
              >
                Jugar carta <Icon name="arrow" size={17} />
              </button>
            )}
          </div>
        </div>
      </section>
      {secretOpen && (
        <aside className="trap-panel panel">
          <div className="trap-title">
            <div>
              <span className="eyebrow">SOLO TÚ PUEDES VERLAS</span>
              <h2>Un pequeño secreto.</h2>
            </div>
            <button
              className="icon-button"
              aria-label="Cerrar zona secreta"
              onClick={() => setSecretOpen(false)}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
          <div className="card-row trap-cards">
            {game.self.trapCards.map((c) => (
              <CardButton
                compact
                key={c.id}
                card={c}
                selected={trapSelection === c.id}
                disabled={!mayAct}
                onClick={() =>
                  setTrapSelection(trapSelection === c.id ? null : c.id)
                }
              />
            ))}
          </div>
          <button
            className="button trap-button wide"
            disabled={!mayAct || !selected || !trapSelection}
            onClick={() => void executeSwap()}
          >
            Intercambiar en secreto <Icon name="spark" size={17} />
          </button>
          <p>El intercambio no se anuncia a los demás.</p>
          {game.self.pendingCheat && (
            <p className="private-warning">
              Pueden descubrirte hasta que vuelva tu turno.
            </p>
          )}
        </aside>
      )}
      {game.game.status === "FINISHED" && (
        <Modal
          title={
            winner?.playerId === game.self.playerId
              ? "¡El bosque tiene un campeón!"
              : `¡${winner?.name ?? "Un jugador"} ganó!`
          }
          onClose={() => void leaveRoom()}
        >
          <div className="winner-trophy">♛</div>
          <p>
            {winner?.playerId === game.self.playerId
              ? "Jugaste bien tus cartas. Disfruta la victoria."
              : "Las cartas hablaron. ¿Listos para una revancha?"}
          </p>
          <button
            className="button primary wide"
            onClick={() => void leaveRoom()}
          >
            Volver al inicio <Icon name="arrow" />
          </button>
        </Modal>
      )}
      {accused && (
        <AccusationModal
          name={accused.name}
          onCancel={() => setAccusedId(null)}
          onConfirm={() => {
            if (connected && !busy) void accuse(accused.playerId);
            setAccusedId(null);
          }}
        />
      )}
    </div>
  );
}
