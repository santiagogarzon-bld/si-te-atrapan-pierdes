import { GameError } from "../GameError.js";
import type { Card } from "../GameState.js";

export function drawUntilHandSize(hand: Card[], deck: Card[], targetSize: number): void {
  while (hand.length < targetSize && deck.length > 0) {
    const card = deck.pop();
    if (card) hand.push(card);
  }
}

export function drawNumberCard(deck: Card[], random: () => number): Card & { type: "NUMBER" } {
  if (!deck.some((card) => card.type === "NUMBER")) {
    throw new GameError("DECK_HAS_NO_NUMBER_CARDS", "The deck contains no numeric card.");
  }

  for (;;) {
    const card = deck.pop();
    if (!card) {
      throw new GameError("DECK_HAS_NO_NUMBER_CARDS", "The deck contains no numeric card.");
    }
    if (card.type === "NUMBER") return card;

    // Do not reinsert at the draw end: this guarantees progress even with a
    // deterministic RNG while still choosing a random position in the deck.
    const insertionIndex = Math.floor(random() * deck.length);
    deck.splice(insertionIndex, 0, card);
  }
}
