import { useState, type FormEvent } from "react";
import { Icon } from "../components/Icon";
import { useGameStore } from "../store";

export function HomePage() {
  const [mode, setMode] = useState<"CREATE" | "JOIN">("CREATE");
  const [name, setName] = useState("");
  const [code, setCode] = useState(
    () =>
      new URLSearchParams(window.location.search)
        .get("sala")
        ?.slice(0, 6)
        .toUpperCase() ?? "",
  );
  const { createRoom, joinRoom, busy, connected } = useGameStore();
  const joining =
    mode === "JOIN" ||
    !!new URLSearchParams(window.location.search).get("sala");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (joining) void joinRoom(name.trim(), code);
    else void createRoom(name.trim());
  };
  return (
    <div className="home-layout">
      <section className="hero-copy">
        <span className="edition-label">
          <span /> EL JUEGO DE LAS BUENAS MALAS IDEAS
        </span>
        <h1>
          Entre amigos,
          <br />
          todo se{" "}
          <em>
            vale<span className="title-spark">✳</span>
          </em>
        </h1>
        <p>
          Una mesa en el bosque. Un puñado de cartas.
          <br className="desktop-break" /> Y ese amigo en el que nunca debiste
          confiar.
        </p>
        <div className="rule-strip">
          <span>
            <Icon name="people" size={16} /> 2–6 jugadores
          </span>
          <i />
          <span>3D en tiempo real</span>
          <i />
          <span>Gratis, sin registro</span>
        </div>
        <section className="entry-card">
          <div className="mode-tabs">
            <button
              type="button"
              className={!joining ? "active" : ""}
              onClick={() => {
                window.history.replaceState({}, "", window.location.pathname);
                setMode("CREATE");
              }}
            >
              Crear una mesa
            </button>
            <button
              type="button"
              className={joining ? "active" : ""}
              onClick={() => setMode("JOIN")}
            >
              Tengo un código <Icon name="arrow" size={15} />
            </button>
          </div>
          <form onSubmit={submit}>
            <label htmlFor="player-name">
              ¿Cómo te llamas?
              <input
                id="player-name"
                autoComplete="nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={24}
                placeholder="Tu apodo en el bosque"
                required
              />
            </label>
            {joining && (
              <label htmlFor="room-code">
                Código de la mesa
                <input
                  id="room-code"
                  className="code-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  minLength={6}
                  maxLength={6}
                  placeholder="ABC123"
                  required
                />
              </label>
            )}
            <button
              className="button primary wide"
              disabled={busy || !connected || name.trim().length < 2}
            >
              {busy
                ? "Preparando tu lugar…"
                : joining
                  ? "Unirme a la mesa"
                  : "Crear partida"}
              <Icon name="arrow" />
            </button>
          </form>
          <p className="privacy-note">
            <Icon name="leaf" size={13} /> Solo tú, tus amigos y una conexión a
            internet.
          </p>
        </section>
      </section>
      <div className="scene-caption">
        <span className="caption-star">✦</span>
        <div>
          <strong>Caras tiernas. Intenciones dudosas.</strong>
          <span>Tu próxima noche de juegos empieza aquí.</span>
        </div>
      </div>
      <footer className="home-footer">
        <span>HECHO PARA JUGAR JUNTOS</span>
        <span>
          Un poco de suerte. Mucha picardía.{" "}
          <span className="footer-suit">♣</span>
        </span>
      </footer>
    </div>
  );
}
