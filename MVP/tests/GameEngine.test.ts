import { describe, expect, it } from "vitest";
import {
  GameEngine,
  GameError,
  numberCard,
  wildcard,
  type Card,
  type GameState,
  type Player,
} from "../src/game/index.js";

let cardSequence = 0;

function n(value: number, id = `n-${value}-${++cardSequence}`): Card {
  return numberCard(id, value);
}

function w(type: "A" | "B", id = `${type}-${++cardSequence}`): Card {
  return wildcard(id, type);
}

function player(id: string, hand: Card[], overrides: Partial<Player> = {}): Player {
  return {
    id,
    sessionToken: `secret-${id}`,
    name: `Player ${id}`,
    hand,
    trapCards: [w("A", `trap-a-${id}`), w("B", `trap-b-${id}`)],
    alive: true,
    connected: true,
    pendingCheat: false,
    ...overrides,
  };
}

function state(players: Player[], overrides: Partial<GameState> = {}): GameState {
  return {
    id: "game-1",
    roomCode: "ABC123",
    status: "IN_PROGRESS",
    hostPlayerId: players[0]?.id ?? "p1",
    players,
    deck: [n(2), n(3), n(4), n(5), n(6), n(7)],
    openPile: [n(7, "pile-7")],
    activeValue: 7,
    currentPlayerIndex: 0,
    winnerPlayerId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    publicLog: [],
    ...overrides,
  };
}

function expectCode(action: () => unknown, code: GameError["code"]): void {
  try {
    action();
    throw new Error("Expected GameError");
  } catch (error) {
    expect(error).toBeInstanceOf(GameError);
    expect((error as GameError).code).toBe(code);
  }
}

describe("GameEngine card rules", () => {
  it("plays a number equal to or above activeValue", () => {
    const card = n(9, "play-me");
    const engine = new GameEngine(state([player("p1", [card, n(2), n(3)]), player("p2", [n(8)])]));

    engine.playCard("p1", card.id);

    const result = engine.getState();
    expect(result.openPile.at(-1)).toEqual(card);
    expect(result.activeValue).toBe(9);
    expect(result.currentPlayerIndex).toBe(1);
  });

  it("rejects a number below activeValue without mutating state", () => {
    const card = n(6, "too-low");
    const engine = new GameEngine(state([player("p1", [card]), player("p2", [n(8)])]));
    const before = engine.getState();

    expectCode(() => engine.playCard("p1", card.id), "CARD_NOT_PLAYABLE");
    expect(engine.getState()).toEqual(before);
  });

  it("wildcard A keeps activeValue", () => {
    const card = w("A", "wild-a");
    const engine = new GameEngine(state([player("p1", [card, n(2), n(3)]), player("p2", [n(8)])]));

    engine.playCard("p1", card.id);

    expect(engine.getState().activeValue).toBe(7);
  });

  it("wildcard A clears the prior open pile", () => {
    const card = w("A", "wild-a");
    const game = state([player("p1", [card, n(2), n(3)]), player("p2", [n(8)])]);
    game.openPile = [n(3), n(6), n(7)];
    const engine = new GameEngine(game);

    engine.playCard("p1", card.id);

    expect(engine.getState().openPile).toEqual([card]);
  });

  it("wildcard B resets activeValue to 2", () => {
    const card = w("B", "wild-b");
    const engine = new GameEngine(state([player("p1", [card, n(2), n(3)]), player("p2", [n(8)])]));

    engine.playCard("p1", card.id);

    expect(engine.getState().activeValue).toBe(2);
  });

  it("refills a hand only until it reaches the configured size", () => {
    const card = n(8, "play-me");
    const engine = new GameEngine(state([player("p1", [card, n(9), n(10), n(11)]), player("p2", [n(8)])]));

    engine.playCard("p1", card.id);

    expect(engine.getState().players[0]?.hand).toHaveLength(3);
  });
});

describe("taking the pile", () => {
  it("lets a blocked player take the complete pile and starts a numeric pile", () => {
    const blocked = player("p1", [n(2), n(3), n(4)]);
    const game = state([blocked, player("p2", [n(10)])]);
    game.openPile = [n(8), n(9)];
    game.activeValue = 10;
    game.deck = [w("A"), n(6, "new-start"), w("B")];
    const engine = new GameEngine(game, undefined, { random: () => 0 });

    engine.takePile("p1");

    const result = engine.getState();
    expect(result.players[0]?.hand).toHaveLength(5);
    expect(result.openPile).toEqual([n(6, "new-start")]);
    expect(result.activeValue).toBe(6);
    expect(result.currentPlayerIndex).toBe(1);
  });

  it("rejects taking the pile when the player has any valid move", () => {
    const engine = new GameEngine(state([player("p1", [n(2), n(7), n(3)]), player("p2", [n(10)])]));
    const before = engine.getState();

    expectCode(() => engine.takePile("p1"), "PILE_TAKE_NOT_ALLOWED");
    expect(engine.getState()).toEqual(before);
  });
});

describe("trap swaps and accusations", () => {
  it("swaps one hand card with one trap card and marks a pending cheat", () => {
    const handCard = n(6, "hand-six");
    const actor = player("p1", [handCard, n(8), n(9)]);
    const trapCard = actor.trapCards[0]!;
    const engine = new GameEngine(state([actor, player("p2", [n(10)])]));

    engine.swapTrapCard("p1", handCard.id, trapCard.id);

    const result = engine.getState().players[0]!;
    expect(result.hand.some((card) => card.id === trapCard.id)).toBe(true);
    expect(result.trapCards.some((card) => card.id === handCard.id)).toBe(true);
    expect(result.pendingCheat).toBe(true);
    expect(engine.getState().publicLog).toEqual([]);
  });

  it("rejects a swap using card IDs from the wrong zones", () => {
    const actor = player("p1", [n(8, "hand-card")]);
    const engine = new GameEngine(state([actor, player("p2", [n(10)])]));

    expectCode(() => engine.swapTrapCard("p1", actor.trapCards[0]!.id, actor.hand[0]!.id), "INVALID_TRAP_SWAP");
  });

  it("a correct accusation eliminates the accused", () => {
    const accused = player("p1", [n(8)], { pendingCheat: true });
    const engine = new GameEngine(state([accused, player("p2", [n(10)]), player("p3", [n(11)])]));

    const result = engine.accusePlayer("p2", "p1");

    expect(result).toEqual({ correct: true, eliminatedPlayerId: "p1" });
    expect(engine.getState().players[0]?.alive).toBe(false);
  });

  it("an incorrect accusation has no elimination penalty", () => {
    const engine = new GameEngine(state([player("p1", [n(8)]), player("p2", [n(10)])]));

    const result = engine.accusePlayer("p2", "p1");

    expect(result).toEqual({ correct: false, eliminatedPlayerId: null });
    expect(engine.getState().players.every((candidate) => candidate.alive)).toBe(true);
  });

  it("allows any living player to accuse any other living player", () => {
    const target = player("p3", [n(9)], { pendingCheat: true });
    const engine = new GameEngine(state([player("p1", [n(8)]), player("p2", [n(10)]), target]));

    expect(engine.accusePlayer("p2", "p3").correct).toBe(true);
  });

  it("expires pendingCheat exactly when that player's next turn begins", () => {
    const playable = n(8, "p1-play");
    const p1 = player("p1", [playable, n(10), n(11)], { pendingCheat: true });
    const p2Card = n(9, "p2-play");
    const p2 = player("p2", [p2Card, n(10), n(11)]);
    const engine = new GameEngine(state([p1, p2]));

    engine.playCard("p1", playable.id);
    expect(engine.getState().players[0]?.pendingCheat).toBe(true);
    engine.playCard("p2", p2Card.id);

    expect(engine.getState().currentPlayerIndex).toBe(0);
    expect(engine.getState().players[0]?.pendingCheat).toBe(false);
  });
});

describe("turns, wins, and privacy", () => {
  it("skips eliminated players while advancing turns", () => {
    const card = n(8, "p1-play");
    const p2 = player("p2", [n(9)], { alive: false });
    const engine = new GameEngine(state([player("p1", [card, n(9), n(10)]), p2, player("p3", [n(10)])]));

    engine.playCard("p1", card.id);

    expect(engine.getState().players[engine.getState().currentPlayerIndex]?.id).toBe("p3");
  });

  it("wins by discard when the hand is empty after drawing", () => {
    const lastCard = n(8, "last-card");
    const game = state([player("p1", [lastCard]), player("p2", [n(9)])], { deck: [] });
    const engine = new GameEngine(game);

    engine.playCard("p1", lastCard.id);

    expect(engine.getState()).toMatchObject({ status: "FINISHED", winnerPlayerId: "p1" });
  });

  it("declares the last living player the winner", () => {
    const cheater = player("p1", [n(8)], { pendingCheat: true });
    const engine = new GameEngine(state([cheater, player("p2", [n(9)])]));

    engine.accusePlayer("p2", "p1");

    expect(engine.getState()).toMatchObject({ status: "FINISHED", winnerPlayerId: "p2" });
  });

  it("never exposes another player's private fields in a player view", () => {
    const privateCard = n(12, "private-hand-card");
    const privateTrap = n(4, "private-trap-card");
    const p2 = player("p2", [privateCard], {
      trapCards: [privateTrap, w("B", "private-wild")],
      pendingCheat: true,
      sessionToken: "ultra-secret-token",
    });
    const engine = new GameEngine(state([player("p1", [n(8)]), p2]));

    const view = engine.getPlayerView("p1");
    const other = view.players.find((candidate) => candidate.playerId === "p2")!;
    const serialized = JSON.stringify(view);

    expect(Object.keys(other).sort()).toEqual(
      ["alive", "connected", "handCount", "isCurrentTurn", "name", "playerId"].sort(),
    );
    expect(serialized).not.toContain("private-hand-card");
    expect(serialized).not.toContain("private-trap-card");
    expect(serialized).not.toContain("private-wild");
    expect(serialized).not.toContain("ultra-secret-token");
    expect(serialized).not.toContain("pendingCheat\":true");
  });

  it("returns defensive copies instead of mutable engine internals", () => {
    const engine = new GameEngine(state([player("p1", [n(8)]), player("p2", [n(9)])]));
    const snapshot = engine.getState();
    snapshot.players[0]!.hand.length = 0;

    expect(engine.getState().players[0]?.hand).toHaveLength(1);
  });
});

describe("game setup", () => {
  it("creates the configured deck, external trap cards, and a numeric initial pile", () => {
    let id = 0;
    const engine = GameEngine.create(
      {
        id: "new-game",
        roomCode: "ROOM42",
        hostPlayerId: "p1",
        players: [
          { id: "p1", sessionToken: "s1", name: "One" },
          { id: "p2", sessionToken: "s2", name: "Two" },
        ],
      },
      undefined,
      { createId: () => `generated-${++id}`, random: () => 0.5 },
    );

    engine.startGame("p1");
    const result = engine.getState();

    expect(result.status).toBe("IN_PROGRESS");
    expect(result.players.every((candidate) => candidate.hand.length === 3)).toBe(true);
    expect(result.players.every((candidate) => candidate.trapCards.map((card) => card.type).join() === "A,B")).toBe(true);
    expect(result.openPile).toHaveLength(1);
    expect(result.openPile[0]?.type).toBe("NUMBER");
    expect(result.deck).toHaveLength(45); // 52 main cards - 6 dealt - 1 initial card
  });

  it("allows only the host to start", () => {
    const engine = GameEngine.create({
      roomCode: "ROOM42",
      hostPlayerId: "p1",
      players: [
        { id: "p1", sessionToken: "s1", name: "One" },
        { id: "p2", sessionToken: "s2", name: "Two" },
      ],
    });

    expectCode(() => engine.startGame("p2"), "ONLY_HOST_CAN_START");
  });
});
