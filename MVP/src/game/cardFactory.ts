import type { Card, NumberCard, Wildcard } from "./GameState.js";
import type { GameConfig } from "./gameConfig.js";

export type IdFactory = () => string;

export function numberCard(id: string, value: number): NumberCard {
  return { id, type: "NUMBER", value };
}

export function wildcard(id: string, type: "A" | "B"): Wildcard {
  return { id, type };
}

export function createMainDeck(config: GameConfig, createId: IdFactory): Card[] {
  const deck: Card[] = [];
  for (let value = config.minCardValue; value <= config.maxCardValue; value += 1) {
    for (let copy = 0; copy < config.copiesPerNumber; copy += 1) {
      deck.push(numberCard(createId(), value));
    }
  }
  for (let index = 0; index < config.wildcardACount; index += 1) {
    deck.push(wildcard(createId(), "A"));
  }
  for (let index = 0; index < config.wildcardBCount; index += 1) {
    deck.push(wildcard(createId(), "B"));
  }
  return deck;
}

export function shuffle<T>(values: T[], random: () => number): void {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex]!, values[index]!];
  }
}
