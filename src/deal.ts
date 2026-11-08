import type { Card } from "./card.ts";
import type { CardStack } from "./stack.ts";

import { InvalidArgumentError } from "./errors.ts";
import {
  countProblem,
  optionsProblem,
  shortfall,
  sizeProblem,
  stackProblem,
} from "./internal/checks.ts";
import { display } from "./internal/display.ts";
import { copyStack } from "./internal/stack.ts";

/** The most hands a deal can have: the longest an array can be. */
const MAX_HANDS = 2 ** 32 - 1;

/**
 * The named value {@link deal} takes as a hand size, besides a number of
 * cards.
 *
 * `HandSize.MAXIMIZE` deals out the whole deck as evenly as possible, with any
 * extra cards going to the first hands, whatever the packet size.
 *
 * @example
 * ```ts
 * import { deal, HandSize } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * const { hands, remainder } = deal(standard52(), 3, HandSize.MAXIMIZE);
 * hands.map((hand) => hand.length); // => [18, 17, 17]
 * remainder.length; // => 0
 *
 * // The value is a plain string, which is what error messages show.
 * HandSize.MAXIMIZE; // => "maximize"
 * ```
 *
 * @since NEXT
 */
export const HandSize: {
  /** Deal out the whole deck as evenly as possible, extra cards first. */
  readonly MAXIMIZE: "maximize";
} = Object.freeze({ MAXIMIZE: "maximize" });

/**
 * A hand size that {@link deal} takes: a number of cards, or
 * `HandSize.MAXIMIZE` to deal out the whole deck.
 *
 * @example
 * ```ts
 * import { deal, HandSize } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * function firstHandSize(size: HandSize): number | undefined {
 *   return deal(standard52(), 4, size).hands[0]?.length;
 * }
 *
 * firstHandSize(5); // => 5
 * firstHandSize(HandSize.MAXIMIZE); // => 13
 * ```
 *
 * @since NEXT
 */
export type HandSize = number | (typeof HandSize)[keyof typeof HandSize];

/**
 * The named value {@link deal} takes as its `packetSize` option, besides a
 * number of cards.
 *
 * `PacketSize.HAND` gives each hand all its cards at once, so the first hand
 * gets the top cards of the deck, the second hand the next ones, and so on.
 *
 * @example
 * ```ts
 * import { deal, PacketSize } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * const { hands } = deal(standard52(), 4, 13, { packetSize: PacketSize.HAND });
 * hands[0]; // => standard52().slice(0, 13)
 *
 * // The value is a plain string, which is what error messages show.
 * PacketSize.HAND; // => "hand"
 * ```
 *
 * @since NEXT
 */
export const PacketSize: {
  /** Give each hand all its cards at once. */
  readonly HAND: "hand";
} = Object.freeze({ HAND: "hand" });

/**
 * A packet size that {@link deal} takes: a number of cards, or
 * `PacketSize.HAND` for all of a hand's cards at once.
 *
 * @example
 * ```ts
 * import { card, type CardStack, deal, PacketSize } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * function firstHand(packetSize: PacketSize): CardStack | undefined {
 *   return deal(standard52(), 4, 5, { packetSize }).hands[0];
 * }
 *
 * // One at a time, the first hand's second card is the deck's fifth.
 * firstHand(1)?.[1] === card("5", "H"); // => true
 * firstHand(PacketSize.HAND)?.[1] === card("2", "H"); // => true
 * ```
 *
 * @since NEXT
 */
export type PacketSize = number | (typeof PacketSize)[keyof typeof PacketSize];

/**
 * The values {@link deal} takes as its `runOut` option, which says what happens
 * when the deck holds too few cards for the deal.
 *
 * - `RunOut.THROW`, the default, throws an {@link InsufficientCardsError}
 *   before dealing anything.
 * - `RunOut.STOP` deals until the deck runs out, leaving short hands: hands
 *   with fewer cards than the deal asked for, or none.
 *
 * @example
 * ```ts
 * import { deal, RunOut } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * // Five hands of 11 need 55 cards, so the last three hands are short.
 * const { hands, remainder } = deal(standard52(), 5, 11, {
 *   runOut: RunOut.STOP,
 * });
 * hands.map((hand) => hand.length); // => [11, 11, 10, 10, 10]
 * remainder.length; // => 0
 *
 * deal(standard52(), 5, 11); // throws INSUFFICIENT_CARDS
 *
 * // The values are plain strings, which is what error messages show.
 * RunOut.STOP; // => "stop"
 * ```
 *
 * @since NEXT
 */
export const RunOut: {
  /** Deal until the deck runs out, leaving short hands. */
  readonly STOP: "stop";
  /** Throw an {@link InsufficientCardsError} before dealing anything. */
  readonly THROW: "throw";
} = Object.freeze({ STOP: "stop", THROW: "throw" });

/**
 * What {@link deal} does when the deck holds too few cards: `RunOut.THROW` or
 * `RunOut.STOP`.
 *
 * @example
 * ```ts
 * import { deal, RunOut } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * const runOut: RunOut = RunOut.STOP;
 * deal(standard52(), 2, 30, { runOut }).hands.map((hand) => hand.length); // => [26, 26]
 * ```
 *
 * @since NEXT
 */
export type RunOut = (typeof RunOut)[keyof typeof RunOut];

/**
 * Settings for {@link deal}.
 *
 * @example
 * ```ts
 * import { card, deal, type DealOptions } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * // Euchre-style packets: 3 cards to each hand, then 2.
 * const options: DealOptions = { packetSize: 3 };
 * const [first] = deal(standard52(), 4, 5, options).hands;
 *
 * // The first hand gets the top 3 cards, then 2 more once the others have 3.
 * first?.[2] === card("3", "H"); // => true
 * first?.[3] === card("K", "H"); // => true
 * ```
 *
 * @since NEXT
 */
export interface DealOptions {
  /**
   * How many cards each hand gets at a time: an integer of 1 or more, or
   * `PacketSize.HAND` for all of a hand's cards at once. Leave it out, or pass
   * `undefined`, to deal one card at a time (round-robin). A hand's last packet
   * is smaller when the hand needs fewer cards to finish, and a packet size
   * bigger than the hand gives it all its cards at once.
   */
  readonly packetSize?: PacketSize | undefined;

  /**
   * What happens when the deck holds too few cards: `RunOut.THROW` throws an
   * {@link InsufficientCardsError} before dealing anything, and `RunOut.STOP`
   * deals until the deck runs out, leaving short hands. Leave it out, or pass
   * `undefined`, to throw.
   */
  readonly runOut?: RunOut | undefined;
}

/**
 * What {@link deal} gives: the hands and the remainder of the deck, as a frozen
 * object holding a frozen array of hands and the remainder, each a new frozen
 * stack.
 *
 * @typeParam C - The type of card in the deck: a standard {@link Card} unless
 * you say otherwise.
 *
 * @example
 * ```ts
 * import { card, deal, type DealResult } from "deckshoes";
 *
 * const deck = [card("A", "S"), card("K", "H"), card("10", "D")];
 * const result: DealResult = deal(deck, 2, 1);
 * result.hands; // => [[card("A", "S")], [card("K", "H")]]
 * result.remainder; // => [card("10", "D")]
 * Object.isFrozen(result.hands); // => true
 * ```
 *
 * @since NEXT
 */
export interface DealResult<C = Card> {
  /**
   * The hands, in the order they were dealt to. Each is in deal order, top
   * first: the first card dealt to a hand is its top card.
   */
  readonly hands: readonly CardStack<C>[];

  /** The stack left after the deal, top first. */
  readonly remainder: CardStack<C>;
}

/**
 * Deals cards from the top of a deck into hands, returning the hands and the
 * remainder.
 *
 * Each hand in turn gets a packet of cards, round after round, until every hand
 * has its cards. A packet is one card unless you say otherwise, which deals
 * round-robin. With a `packetSize` of 3, each hand gets 3 cards at a time, and
 * a hand's last packet is smaller if it needs fewer, so hands of 5 get 3 and
 * then 2. `PacketSize.HAND` gives each hand all its cards at once.
 *
 * The first card dealt to a hand is its top card, so each hand is in deal
 * order. That's the opposite of a hand dealt face down onto a pile at a real
 * table, where the last card dealt ends up on top.
 *
 * Pass `HandSize.MAXIMIZE` as the hand size to deal out the whole deck as evenly
 * as possible, with any extra cards going to the first hands, whatever the
 * packet size: 52 cards to 3 hands gives hands of 18, 17 and 17.
 *
 * When the deck holds too few cards, `deal` throws before dealing anything. Set
 * `runOut` to `RunOut.STOP` to deal until the deck runs out instead, leaving
 * short hands, and empty ones if there are more hands than cards.
 *
 * The deck is left untouched, frozen or not. Every stack in the result is new
 * and frozen, as are `hands` and the result itself. Any stack works, including
 * one with copies or with cards that aren't standard cards.
 *
 * @typeParam C - The type of card in the deck.
 * @param deck - The stack to deal from, top first.
 * @param handCount - How many hands to deal, an integer from 1 to 2³² − 1.
 * @param handSize - How many cards each hand gets, an integer of 1 or more, or
 * `HandSize.MAXIMIZE` to deal out the whole deck as evenly as possible.
 * @param options - Settings for the deal: its packet size, and what happens
 * when the deck runs out.
 * @returns A frozen object holding the `hands`, in the order they were dealt
 * to, and the `remainder`, each a new frozen stack, top first.
 * @throws {@link InvalidArgumentError} When `deck` isn't an array, `handCount`
 * isn't an integer from 1 to 2³² − 1, `handSize` isn't an integer of 1 or more
 * or `HandSize.MAXIMIZE`, or `options` isn't an object. Also when its
 * `packetSize` isn't an integer of 1 or more or `PacketSize.HAND`, or its
 * `runOut` isn't `RunOut.THROW` or `RunOut.STOP`.
 * @throws {@link InsufficientCardsError} When the deck holds fewer than
 * `handCount × handSize` cards, or fewer cards than hands with
 * `HandSize.MAXIMIZE`, unless `runOut` is `RunOut.STOP`.
 *
 * @example
 * ```ts
 * import { card, deal, HandSize, PacketSize, RunOut } from "deckshoes";
 *
 * const ranks = ["A", "2", "3", "4", "5", "6", "7"] as const;
 * const deck = ranks.map((rank) => card(rank, "S"));
 *
 * // One card to each hand in turn.
 * const { hands, remainder } = deal(deck, 2, 3);
 * hands[0]; // => [card("A", "S"), card("3", "S"), card("5", "S")]
 * hands[1]; // => [card("2", "S"), card("4", "S"), card("6", "S")]
 * remainder; // => [card("7", "S")]
 *
 * // Two cards to each hand in turn, then the last one each.
 * deal(deck, 2, 3, { packetSize: 2 }).hands[0]; // => [card("A", "S"), card("2", "S"), card("5", "S")]
 *
 * // Each hand's cards all at once.
 * deal(deck, 2, 3, { packetSize: PacketSize.HAND }).hands[1]; // => [card("4", "S"), card("5", "S"), card("6", "S")]
 *
 * // The whole deck, as evenly as possible.
 * const all = deal(deck, 3, HandSize.MAXIMIZE);
 * all.hands.map((hand) => hand.length); // => [3, 2, 2]
 *
 * // Too few cards throws, unless the deal stops when the deck runs out.
 * deal(deck, 3, 3); // throws INSUFFICIENT_CARDS
 * const short = deal(deck, 3, 3, { runOut: RunOut.STOP });
 * short.hands.map((hand) => hand.length); // => [3, 2, 2]
 *
 * // The deck is left alone.
 * deck.length; // => 7
 *
 * deal(deck, 0, 3); // throws INVALID_ARGUMENT
 * ```
 *
 * @since NEXT
 */
export function deal<C>(
  deck: CardStack<C>,
  handCount: number,
  handSize: HandSize,
  options: DealOptions = {},
): DealResult<C> {
  const problem =
    stackProblem(deck) ??
    countProblem(handCount, "hand count", 1, MAX_HANDS) ??
    sizeProblem(
      handSize,
      "hand size",
      HandSize.MAXIMIZE,
      "HandSize.MAXIMIZE",
    ) ??
    optionsProblem(options, "{ packetSize: 3 }");
  if (problem !== undefined) throw problem;

  // Read each option once, as `unknown`: JavaScript callers can pass anything,
  // and a getter could give the check one value and the deal another.
  const {
    packetSize = 1,
    runOut = RunOut.THROW,
  }: Readonly<{
    packetSize?: unknown;
    runOut?: unknown;
  }> = options;
  const maximize = handSize === HandSize.MAXIMIZE;
  const settingProblem =
    sizeProblem(
      packetSize,
      "packet size",
      PacketSize.HAND,
      "PacketSize.HAND",
    ) ??
    (runOut === RunOut.STOP || runOut === RunOut.THROW
      ? undefined
      : new InvalidArgumentError(
          `Invalid runOut option ${display(runOut)}: expected RunOut.THROW or RunOut.STOP`,
        )) ??
    (runOut === RunOut.THROW
      ? shortfall(maximize ? handCount : handCount * handSize, deck)
      : undefined);
  if (settingProblem !== undefined) throw settingProblem;

  // Each hand gets `size` cards, or with MAXIMIZE the first `extra` hands get
  // one more. With RunOut.STOP, dealing stops early when the deck runs out.
  const available = deck.length;
  const size = maximize ? Math.floor(available / handCount) : handSize;
  const extra = maximize ? available % handCount : 0;
  const largest = extra > 0 ? size + 1 : size;
  const packet =
    packetSize === PacketSize.HAND ? largest : (packetSize as number);

  const hands = Array.from({ length: handCount }, (): C[] => []);
  let next = 0;
  // At the start of each round, every hand that isn't full holds `held` cards.
  for (let held = 0; held < largest && next < available; held += packet) {
    let position = 0;
    for (const hand of hands) {
      const target = position < extra ? size + 1 : size;
      position++;
      const take = Math.min(packet, target - held, available - next);
      for (let i = 0; i < take; i++) hand.push(deck[next + i] as C);
      if (take > 0) next += take;
      if (next === available) break;
    }
  }

  for (const hand of hands) Object.freeze(hand);
  return Object.freeze({
    hands: Object.freeze(hands),
    remainder: Object.freeze(copyStack(deck, next)),
  });
}
