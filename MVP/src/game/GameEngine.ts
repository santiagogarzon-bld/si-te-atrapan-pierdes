import { randomUUID } from "node:crypto";
import { createMainDeck, shuffle, wildcard, type IdFactory } from "./cardFactory.js";
import { GameError } from "./GameError.js";
import type { Card, GameState, Player, PlayerSeed, PlayerView, PublicGameEvent } from "./GameState.js";
import { defaultGameConfig, type GameConfig } from "./gameConfig.js";
import { getPlayerView } from "./getPlayerView.js";
import { advanceTurn } from "./rules/advanceTurn.js";
import { canPlayCard, hasPlayableCard } from "./rules/canPlayCard.js";
import { findSurvivalWinner } from "./rules/checkWinner.js";
import { drawNumberCard, drawUntilHandSize } from "./rules/drawCards.js";

export interface EngineDependencies {
  random?: () => number;
  createId?: IdFactory;
  now?: () => Date;
}

export interface CreateGameInput {
  id?: string;
  roomCode: string;
  hostPlayerId: string;
  players: PlayerSeed[];
}

export interface AccusationResult {
  correct: boolean;
  eliminatedPlayerId: string | null;
}

/**
 * Synchronous, transport-agnostic authority for all game mutations.
 * A room-level queue can serialize calls to this class when a network layer is added.
 */
export class GameEngine {
  readonly config: GameConfig;
  private readonly random: () => number;
  private readonly createId: IdFactory;
  private state: GameState;

  constructor(state: GameState, config: GameConfig = defaultGameConfig, dependencies: EngineDependencies = {}) {
    this.state = structuredClone(state);
    this.config = Object.freeze({ ...config });
    this.random = dependencies.random ?? Math.random;
    this.createId = dependencies.createId ?? randomUUID;
  }

  static create(
    input: CreateGameInput,
    config: GameConfig = defaultGameConfig,
    dependencies: EngineDependencies = {},
  ): GameEngine {
    const createId = dependencies.createId ?? randomUUID;
    const now = dependencies.now ?? (() => new Date());
    const players: Player[] = input.players.map((seed) => ({
      id: seed.id,
      sessionToken: seed.sessionToken,
      name: seed.name,
      hand: [],
      trapCards: [],
      alive: true,
      connected: seed.connected ?? true,
      pendingCheat: false,
    }));

    return new GameEngine(
      {
        id: input.id ?? createId(),
        roomCode: input.roomCode,
        status: "WAITING",
        hostPlayerId: input.hostPlayerId,
        players,
        deck: [],
        openPile: [],
        activeValue: config.minCardValue,
        currentPlayerIndex: 0,
        winnerPlayerId: null,
        createdAt: now().toISOString(),
        publicLog: [],
      },
      config,
      { ...dependencies, createId },
    );
  }

  getState(): GameState {
    return structuredClone(this.state);
  }

  getPlayerView(viewerPlayerId: string): PlayerView {
    return getPlayerView(this.state, viewerPlayerId);
  }

  startGame(requestingPlayerId: string): void {
    if (this.state.status !== "WAITING") {
      throw new GameError("GAME_ALREADY_STARTED", "This game cannot be started again.");
    }
    if (requestingPlayerId !== this.state.hostPlayerId) {
      throw new GameError("ONLY_HOST_CAN_START", "Only the host can start the game.");
    }
    if (this.state.players.length < this.config.minPlayers) {
      throw new GameError("NOT_ENOUGH_PLAYERS", "The game does not have enough players.");
    }
    if (this.state.players.length > this.config.maxPlayers) {
      throw new GameError("TOO_MANY_PLAYERS", "The game has too many players.");
    }

    const deck = createMainDeck(this.config, this.createId);
    shuffle(deck, this.random);
    for (const player of this.state.players) {
      player.hand = [];
      player.trapCards = [wildcard(this.createId(), "A"), wildcard(this.createId(), "B")];
      player.alive = true;
      player.pendingCheat = false;
    }
    for (let round = 0; round < this.config.initialHandSize; round += 1) {
      for (const player of this.state.players) {
        const card = deck.pop();
        if (card) player.hand.push(card);
      }
    }

    const firstCard = drawNumberCard(deck, this.random);
    this.state.deck = deck;
    this.state.openPile = [firstCard];
    this.state.activeValue = firstCard.value;
    this.state.currentPlayerIndex = 0;
    this.state.winnerPlayerId = null;
    this.state.status = "IN_PROGRESS";
    this.state.publicLog = [{ type: "GAME_STARTED" }];
  }

  playCard(playerId: string, cardId: string): void {
    const player = this.requireCurrentPlayer(playerId);
    const cardIndex = player.hand.findIndex((card) => card.id === cardId);
    if (cardIndex < 0) throw new GameError("CARD_NOT_FOUND", "The card is not in this player's hand.");
    const card = player.hand[cardIndex]!;
    if (!canPlayCard(card, this.state.activeValue)) {
      throw new GameError("CARD_NOT_PLAYABLE", "The card is below the active value.");
    }

    player.hand.splice(cardIndex, 1);
    if (card.type === "A") {
      this.state.openPile = [card];
    } else {
      this.state.openPile.push(card);
      if (card.type === "NUMBER") this.state.activeValue = card.value;
      else this.state.activeValue = this.config.minCardValue;
    }
    this.logCardPlayed(playerId, card);
    drawUntilHandSize(player.hand, this.state.deck, this.config.initialHandSize);

    if (player.hand.length === 0) {
      this.finishGame(player.id);
      return;
    }
    advanceTurn(this.state);
  }

  takePile(playerId: string): void {
    const player = this.requireCurrentPlayer(playerId);
    if (hasPlayableCard(player.hand, this.state.activeValue)) {
      throw new GameError("PILE_TAKE_NOT_ALLOWED", "A player with a valid move cannot take the pile.");
    }
    if (!this.state.deck.some((card) => card.type === "NUMBER")) {
      throw new GameError("DECK_HAS_NO_NUMBER_CARDS", "A numeric card is required to start the new pile.");
    }

    const takenCount = this.state.openPile.length;
    player.hand.push(...this.state.openPile);
    this.state.openPile = [];
    const firstCard = drawNumberCard(this.state.deck, this.random);
    this.state.openPile.push(firstCard);
    this.state.activeValue = firstCard.value;
    this.state.publicLog.push({ type: "PILE_TAKEN", playerId, cardCount: takenCount });
    advanceTurn(this.state);
  }

  swapTrapCard(playerId: string, handCardId: string, trapCardId: string): void {
    const player = this.requireCurrentPlayer(playerId);
    const handIndex = player.hand.findIndex((card) => card.id === handCardId);
    const trapIndex = player.trapCards.findIndex((card) => card.id === trapCardId);
    if (handIndex < 0 || trapIndex < 0) {
      throw new GameError("INVALID_TRAP_SWAP", "Both cards must belong to their stated zones.");
    }

    const handCard = player.hand[handIndex]!;
    player.hand[handIndex] = player.trapCards[trapIndex]!;
    player.trapCards[trapIndex] = handCard;
    player.pendingCheat = true;
    // Deliberately no public event: the swap is secret.
  }

  accusePlayer(accuserPlayerId: string, accusedPlayerId: string): AccusationResult {
    this.requireInProgress();
    const accuser = this.requireAlivePlayer(accuserPlayerId);
    const accused = this.requireAlivePlayer(accusedPlayerId);
    if (accuser.id === accused.id) {
      throw new GameError("INVALID_ACCUSATION", "A player cannot accuse themselves.");
    }

    const correct = accused.pendingCheat;
    this.state.publicLog.push({
      type: "PLAYER_ACCUSED",
      accuserPlayerId,
      accusedPlayerId,
      correct,
    });
    if (!correct) {
      // The configured NONE penalty intentionally leaves all player state untouched.
      return { correct: false, eliminatedPlayerId: null };
    }

    const accusedWasCurrent = this.state.players[this.state.currentPlayerIndex]?.id === accused.id;
    accused.alive = false;
    accused.pendingCheat = false;
    this.state.publicLog.push({ type: "PLAYER_ELIMINATED", playerId: accused.id });

    const survivalWinner = findSurvivalWinner(this.state);
    if (survivalWinner) {
      this.finishGame(survivalWinner);
    } else if (accusedWasCurrent) {
      advanceTurn(this.state);
    }
    return { correct: true, eliminatedPlayerId: accused.id };
  }

  private requireInProgress(): void {
    if (this.state.status !== "IN_PROGRESS") {
      throw new GameError("GAME_NOT_STARTED", "The game is not in progress.");
    }
  }

  private requireAlivePlayer(playerId: string): Player {
    const player = this.state.players.find((candidate) => candidate.id === playerId);
    if (!player) throw new GameError("PLAYER_NOT_FOUND", "Player does not belong to this game.");
    if (!player.alive) throw new GameError("PLAYER_ELIMINATED", "Eliminated players cannot act.");
    return player;
  }

  private requireCurrentPlayer(playerId: string): Player {
    this.requireInProgress();
    const player = this.requireAlivePlayer(playerId);
    if (this.state.players[this.state.currentPlayerIndex]?.id !== playerId) {
      throw new GameError("NOT_YOUR_TURN", "It is not this player's turn.");
    }
    return player;
  }

  private finishGame(winnerPlayerId: string): void {
    this.state.winnerPlayerId = winnerPlayerId;
    this.state.status = "FINISHED";
    this.state.publicLog.push({ type: "GAME_FINISHED", winnerPlayerId });
  }

  private logCardPlayed(playerId: string, card: Card): void {
    const event: PublicGameEvent = card.type === "NUMBER"
      ? { type: "CARD_PLAYED", playerId, cardType: card.type, value: card.value }
      : { type: "CARD_PLAYED", playerId, cardType: card.type };
    this.state.publicLog.push(event);
  }
}
