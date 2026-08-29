export type FalseAccusationPenalty = "NONE";

export interface GameConfig {
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly initialHandSize: number;
  readonly copiesPerNumber: number;
  readonly minCardValue: number;
  readonly maxCardValue: number;
  readonly wildcardACount: number;
  readonly wildcardBCount: number;
  readonly trapSlots: number;
  readonly falseAccusationPenalty: FalseAccusationPenalty;
}

export const defaultGameConfig: GameConfig = Object.freeze({
  minPlayers: 2,
  maxPlayers: 6,
  initialHandSize: 3,
  copiesPerNumber: 4,
  minCardValue: 2,
  maxCardValue: 12,
  wildcardACount: 4,
  wildcardBCount: 4,
  trapSlots: 2,
  falseAccusationPenalty: "NONE",
});
