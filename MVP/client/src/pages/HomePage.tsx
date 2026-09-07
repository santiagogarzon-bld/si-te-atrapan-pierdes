import { useState, type FormEvent } from "react";
import { useGameStore } from "../store";

export function HomePage() {
  const [mode, setMode] = useState<"CREATE" | "JOIN">("CREATE");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const { createRoom, joinRoom, busy, connected } = useGameStore();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === "CREATE") void createRoom(name);
    else void joinRoom(name, code);
  };

  return (
    <div className="home-layout">
      <section className="hero-copy">
        <span className="eyebrow">Juego multijugador de engaño</span>
        <h1>La<br/><em>Trampa</em></h1>
        <p>Juega tus cartas, esconde tus comodines y descubre quién está haciendo trampa antes de que sea tarde.</p>
        <div className="rule-strip"><span>2–6 jugadores</span><span>Tiempo real</span><span>Sin registro</span></div>
      </section>
      <section className="entry-card">
        <div className="mode-tabs">
          <button className={mode === "CREATE" ? "active" : ""} onClick={() => setMode("CREATE")}>Crear partida</button>
          <button className={mode === "JOIN" ? "active" : ""} onClick={() => setMode("JOIN")}>Unirme</button>
        </div>
        <form onSubmit={submit}>
          <label>Tu nombre<input value={name} onChange={(event) => setName(event.target.value)} maxLength={24} placeholder="Ej. Valentina" autoFocus required /></label>
          {mode === "JOIN" && <label>Código de sala<input className="code-input" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" required /></label>}
          <button className="button primary wide" disabled={busy || !connected}>{busy ? "Conectando…" : mode === "CREATE" ? "Crear sala" : "Entrar a la sala"}<span>→</span></button>
        </form>
        <p className="privacy-note">No necesitas cuenta. Tu sesión se guarda solamente en este navegador.</p>
      </section>
    </div>
  );
}
