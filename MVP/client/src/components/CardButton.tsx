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
export function CardButton({
  card,
  selected,
  playable = true,
  hidden,
  onClick,
  disabled,
  compact,
}: Props) {
  const label = card.type === "NUMBER" ? String(card.value) : card.type;
  const detail =
    card.type === "A"
      ? "Limpia la pila"
      : card.type === "B"
        ? "Reinicia a 2"
        : "";
  const suit = card.type === "A" ? "✦" : card.type === "B" ? "↻" : "♠";
  return (
    <button
      className={`playing-card ${card.type.toLowerCase()} ${selected ? "selected" : ""} ${!playable ? "blocked" : ""} ${compact ? "compact" : ""}`}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={!!selected}
      aria-label={
        hidden
          ? "Carta oculta"
          : `${card.type === "NUMBER" ? "Carta" : "Comodín"} ${label}${detail ? `: ${detail}` : ""}${!playable ? ", no se puede jugar" : ""}`
      }
      title={
        !playable
          ? "Menor que el valor activo. Puedes intercambiarla en la zona secreta."
          : detail
      }
    >
      {hidden ? (
        <span className="card-back">LT</span>
      ) : (
        <>
          <span className="corner">
            {label}
            <i>{suit}</i>
          </span>
          <strong>{label}</strong>
          <span className="card-suit">{suit}</span>
          <span className="corner bottom">
            {label}
            <i>{suit}</i>
          </span>
          <small>{detail}</small>
        </>
      )}
    </button>
  );
}
