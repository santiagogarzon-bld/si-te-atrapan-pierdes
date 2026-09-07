import type { Card } from "../types";

interface Props {
  card: Card;
  selected?: boolean;
  playable?: boolean;
  hidden?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export function CardButton({ card, selected, playable = true, hidden, onClick, disabled, compact }: Props) {
  const label = card.type === "NUMBER" ? String(card.value) : card.type;
  const detail = card.type === "A" ? "Mantiene · limpia" : card.type === "B" ? "Reinicia a 2" : "";
  return (
    <button
      className={`playing-card ${card.type.toLowerCase()} ${selected ? "selected" : ""} ${!playable ? "blocked" : ""} ${compact ? "compact" : ""}`}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      title={!playable ? "Esta carta está bloqueada por el valor activo" : detail}
    >
      {hidden ? <span className="card-back">?</span> : <><span className="corner">{label}</span><strong>{label}</strong><small>{detail}</small></>}
    </button>
  );
}
