import type { Card } from "../GameState.js";

export function canPlayCard(card: Card, activeValue: number): boolean {
  return card.type !== "NUMBER" || card.value >= activeValue;
}

export function hasPlayableCard(hand: readonly Card[], activeValue: number): boolean {
  return hand.some((card) => canPlayCard(card, activeValue));
}
