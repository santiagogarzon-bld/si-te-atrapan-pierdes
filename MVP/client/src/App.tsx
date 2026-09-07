import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { GamePage } from "./pages/GamePage";
import { HomePage } from "./pages/HomePage";
import { LobbyPage } from "./pages/LobbyPage";
import { Icon } from "./components/Icon";
import { Modal } from "./components/Modal";
import { useGameStore } from "./store";
const TableScene = lazy(() =>
  import("./components/scene/TableScene").then((m) => ({
    default: m.TableScene,
  })),
);

export function App() {
  const {
    initialize,
    connected,
    reconnecting,
    room,
    game,
    error,
    notice,
    dismissError,
    dismissNotice,
  } = useGameStore();
  const [rules, setRules] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [sound, setSound] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const audio = useRef<AudioContext | null>(null);
  const view = game ? "game" : room ? "lobby" : "home";
  useEffect(() => initialize(), [initialize]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(dismissNotice, 4200);
    return () => clearTimeout(timer);
  }, [notice, dismissNotice]);
  const publicEvent = game
    ? `${game.game.id}:${game.game.publicLog.length}`
    : "";
  useEffect(() => {
    if (!sound || !publicEvent || !audio.current) return;
    const ctx = audio.current;
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(
      game?.self.isCurrentTurn ? 660 : 440,
      ctx.currentTime,
    );
    osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.055, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.start();
    osc.stop(ctx.currentTime + 0.23);
  }, [publicEvent, sound]);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  const toggleSound = () => {
    if (!sound) {
      audio.current ??= new AudioContext();
      void audio.current.resume();
    }
    setSound(!sound);
  };
  return (
    <main
      className={`app-shell view-${view} ${reducedMotion ? "reduce-motion" : ""}`}
    >
      <Suspense
        fallback={<div className="scene-loading">Preparando la mesa…</div>}
      >
        <TableScene
          game={game}
          room={room}
          view={view}
          reducedMotion={reducedMotion}
          resetKey={resetKey}
        />
      </Suspense>
      <header className="site-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => e.preventDefault()}
          aria-label="La Trampa"
        >
          <span className="brand-mark">♠</span>
          <span>
            la trampa<span className="brand-dot">.</span>
            <small>EL CLUB DEL BOSQUE</small>
          </span>
        </a>
        <nav>
          <button className="nav-link" onClick={() => setRules(true)}>
            <Icon name="book" size={17} /> Cómo jugar
          </button>
          <span className={`connection ${connected ? "online" : "offline"}`}>
            <span />
            {connected ? "En línea" : "Conectando…"}
          </span>
        </nav>
      </header>
      {reconnecting ? (
        <div className="loading-screen">Recuperando tu partida…</div>
      ) : game ? (
        <GamePage />
      ) : room ? (
        <LobbyPage />
      ) : (
        <HomePage />
      )}
      <div className="scene-toolbar">
        <span className="camera-hint">Arrastra para explorar</span>
        <button
          className="icon-button"
          onClick={() => setResetKey((k) => k + 1)}
          title="Restablecer cámara"
          aria-label="Restablecer cámara"
        >
          <Icon name="reset" size={18} />
        </button>
        <button
          className={`icon-button ${sound ? "enabled" : ""}`}
          onClick={toggleSound}
          title={sound ? "Silenciar" : "Activar sonido"}
          aria-label={sound ? "Silenciar" : "Activar sonido"}
          aria-pressed={sound}
        >
          <Icon name={sound ? "sound" : "mute"} size={18} />
        </button>
        <button
          className={`icon-button ${reducedMotion ? "enabled" : ""}`}
          onClick={() => setReducedMotion(!reducedMotion)}
          title="Reducir movimiento"
          aria-label="Reducir movimiento"
          aria-pressed={reducedMotion}
        >
          <Icon name="spark" size={18} />
        </button>
      </div>
      {error && (
        <button
          role="alert"
          className="toast error-toast"
          onClick={dismissError}
        >
          <strong>No se pudo completar</strong>
          <span>{error.message}</span>
          <small>Pulsa para cerrar</small>
        </button>
      )}
      {notice && (
        <button
          role="status"
          className="toast notice-toast"
          onClick={dismissNotice}
        >
          {notice}
          <Icon name="close" size={14} />
        </button>
      )}
      {rules && (
        <Modal
          title="Amigos, cartas y alguna trampa."
          onClose={() => setRules(false)}
        >
          <ol className="rules-list">
            <li>
              <strong>Reúne a tus amigos.</strong> Crea una sala y comparte el
              código. Juegan de 2 a 6 personas.
            </li>
            <li>
              <strong>Supera la mesa.</strong> Juega un número igual o mayor al
              valor activo. Robas hasta tener 3 cartas mientras quede mazo.
            </li>
            <li>
              <strong>Cambia las reglas.</strong> A limpia la pila y mantiene el
              valor. B reinicia el valor a 2. Ambos se pueden jugar siempre.
            </li>
            <li>
              <strong>Sé un poco astuto.</strong> En tu turno puedes
              intercambiar una carta de tu mano con una carta secreta.
            </li>
            <li>
              <strong>Abre bien los ojos.</strong> Puedes acusar una trampa
              hasta que vuelva el turno de quien la hizo. Si aciertas, queda
              eliminado; si fallas, no hay penalización.
            </li>
            <li>
              <strong>Gana la partida.</strong> Quédate sin cartas o sé el
              último jugador vivo. Si no tienes jugada válida, recoge la pila.
            </li>
          </ol>
          <button
            className="button primary wide"
            onClick={() => setRules(false)}
          >
            Entendido, a la mesa <Icon name="arrow" />
          </button>
        </Modal>
      )}
    </main>
  );
}
