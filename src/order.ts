import type { Rank, Suit } from "./card.ts";
import type { CardStack } from "./stack.ts";

import {
  notInOrder,
  optionsProblem,
  orderProblem,
  stackProblem,
} from "./internal/checks.ts";
import { intoBuckets, keyOf, placesIn } from "./internal/order.ts";

/**
 * A rank order: the ranks from lowest to highest, each listed once, as a plain
 * array. {@link compareCards} and {@link sort} take one.
 *
 * It compares ranks, not cards, so cards of the same rank tie unless a suit
 * order separates them. Ranks a game counts as equal, such as blackjack's 10
 * and king, share a value instead, which a rank order can't express. Ace high
 * and ace low are built in, as `RankOrder.ACE_HIGH` and `RankOrder.ACE_LOW`.
 * Any other order is an array you write, such as Pinochle's below.
 *
 * Reverse a rank order, and any suit order, to put the highest card first.
 *
 * @typeParam R - The type of rank it lists: a standard {@link Rank} unless you
 * say otherwise.
 *
 * @example
 * ```ts
 * import { card, compareCards, type RankOrder } from "deckshoes";
 *
 * // In Pinochle, the ten ranks above the king.
 * const pinochle: RankOrder = ["9", "J", "Q", "K", "10", "A"];
 * compareCards(card("10", "H"), card("K", "H"), pinochle); // => 1
 * ```
 *
 * @since NEXT
 */
export type RankOrder<R = Rank> = readonly R[];

/**
 * The built-in rank orders: ace high and ace low. Each is a frozen
 * {@link RankOrder}, lowest first.
 *
 * - `RankOrder.ACE_HIGH` runs from 2 to 10, then J, Q, K and A.
 * - `RankOrder.ACE_LOW` runs from A to 10, then J, Q and K.
 *
 * They're plain arrays, so they can be read like any other, such as to find
 * the rank above another.
 *
 * @example
 * ```ts
 * import { card, compareCards, RankOrder } from "deckshoes";
 *
 * const ace = card("A", "S");
 * const two = card("2", "S");
 * compareCards(ace, two, RankOrder.ACE_HIGH); // => 1
 * compareCards(ace, two, RankOrder.ACE_LOW); // => -1
 *
 * RankOrder.ACE_LOW; // => ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
 * RankOrder.ACE_HIGH.indexOf("K"); // => 11
 * ```
 *
 * @since NEXT
 */
export const RankOrder: {
  /** The ranks from 2 to 10, then J, Q, K and A: the ace is highest. */
  readonly ACE_HIGH: RankOrder;
  /** The ranks from A to 10, then J, Q and K: the ace is lowest. */
  readonly ACE_LOW: RankOrder;
} = /* @__PURE__ */ Object.freeze({
  ACE_HIGH: /* @__PURE__ */ Object.freeze<RankOrder>([
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
    "A",
  ]),
  ACE_LOW: /* @__PURE__ */ Object.freeze<RankOrder>([
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
  ]),
});

/**
 * A suit order: the suits from lowest to highest, each listed once, as a plain
 * array. {@link compareCards} and {@link sort} take one as their `suitOrder`
 * option.
 *
 * It separates cards of the same rank, which a rank order alone leaves tied.
 * Bridge order is built in, as `SuitOrder.BRIDGE`. Any other order is an array
 * you write, such as Big Two's below.
 *
 * @typeParam S - The type of suit it lists: a standard {@link Suit} unless you
 * say otherwise.
 *
 * @example
 * ```ts
 * import { card, compareCards, RankOrder, type SuitOrder } from "deckshoes";
 *
 * // In Big Two, diamonds are lowest and spades highest.
 * const bigTwo: SuitOrder = ["D", "C", "H", "S"];
 * const options = { suitOrder: bigTwo };
 * compareCards(card("3", "C"), card("3", "D"), RankOrder.ACE_HIGH, options); // => 1
 * ```
 *
 * @since NEXT
 */
export type SuitOrder<S = Suit> = readonly S[];

/**
 * The built-in suit order: bridge order. It's a frozen {@link SuitOrder},
 * lowest first.
 *
 * - `SuitOrder.BRIDGE` runs clubs, diamonds, hearts, spades, so spades are
 *   highest.
 *
 * There's no default suit order: cards of the same rank tie unless you pass
 * one.
 *
 * @example
 * ```ts
 * import { card, compareCards, RankOrder, SuitOrder } from "deckshoes";
 *
 * SuitOrder.BRIDGE; // => ["C", "D", "H", "S"]
 *
 * const spade = card("7", "S");
 * const heart = card("7", "H");
 * compareCards(spade, heart, RankOrder.ACE_HIGH); // => 0
 * compareCards(spade, heart, RankOrder.ACE_HIGH, {
 *   suitOrder: SuitOrder.BRIDGE,
 * }); // => 1
 * ```
 *
 * @since NEXT
 */
export const SuitOrder: {
  /** Clubs, diamonds, hearts, then spades: spades are highest. */
  readonly BRIDGE: SuitOrder;
} = /* @__PURE__ */ Object.freeze({
  BRIDGE: /* @__PURE__ */ Object.freeze<SuitOrder>(["C", "D", "H", "S"]),
});

/**
 * Settings for {@link compareCards}.
 *
 * @typeParam S - The type of suit the cards have: a standard {@link Suit}
 * unless you say otherwise.
 *
 * @example
 * ```ts
 * import {
 *   card,
 *   compareCards,
 *   type CompareCardsOptions,
 *   RankOrder,
 *   SuitOrder,
 * } from "deckshoes";
 *
 * const options: CompareCardsOptions = { suitOrder: SuitOrder.BRIDGE };
 * compareCards(card("Q", "C"), card("Q", "D"), RankOrder.ACE_HIGH, options); // => -1
 * ```
 *
 * @since NEXT
 */
export interface CompareCardsOptions<S = Suit> {
  /**
   * The suits from lowest to highest, each listed once, to separate cards of
   * the same rank, such as `SuitOrder.BRIDGE`. Leave it out, or pass
   * `undefined`, to have cards of the same rank tie. When it's given, both
   * cards' suits have to be in it, even when their ranks decide.
   */
  readonly suitOrder?: SuitOrder<S> | undefined;
}

/**
 * Settings for {@link sort}.
 *
 * @typeParam S - The type of suit the cards have: a standard {@link Suit}
 * unless you say otherwise.
 *
 * @example
 * ```ts
 * import { card, RankOrder, sort, type SortOptions, SuitOrder } from "deckshoes";
 *
 * const options: SortOptions = { suitOrder: SuitOrder.BRIDGE };
 * const hand = [card("Q", "D"), card("Q", "C")];
 * sort(hand, RankOrder.ACE_HIGH, options); // => [card("Q", "C"), card("Q", "D")]
 * ```
 *
 * @since NEXT
 */
export interface SortOptions<S = Suit> {
  /**
   * The suits from lowest to highest, each listed once, to separate cards of
   * the same rank, such as `SuitOrder.BRIDGE`. Leave it out, or pass
   * `undefined`, to keep cards of the same rank in the order they had. When
   * it's given, every card's suit has to be in it.
   */
  readonly suitOrder?: SuitOrder<S> | undefined;
}

/** Options with a suit order, shown in the error for options that aren't an object. */
const SUIT_ORDER_EXAMPLE = "{ suitOrder: SuitOrder.BRIDGE }";

/**
 * Compares two cards by a rank order, and by a suit order when their ranks are
 * the same: -1 if `a` is lower, 1 if it's higher, and 0 if they tie.
 *
 * A card's place is its rank's place in `rankOrder`, lowest first. Cards of the
 * same rank tie, whatever their suits, unless you pass a suit order, which
 * places them by suit, also lowest first. Trumps, the suit led and other rules
 * of play aren't orders, so they're left to the game.
 *
 * Every card's rank has to be in the rank order, and when a suit order is
 * given, its suit has to be in that, even when the ranks decide. Any cards with
 * a rank work, including cards that aren't standard cards, as long as the
 * orders list their ranks and suits. A rank or suit is matched as `includes`
 * matches.
 *
 * It works as a comparator for `toSorted`.
 *
 * @typeParam C - The type of the cards.
 * @param a - The first card.
 * @param b - The second card.
 * @param rankOrder - The ranks from lowest to highest, each listed once, such
 * as `RankOrder.ACE_HIGH`.
 * @param options - Settings for the comparison: a suit order to separate cards
 * of the same rank.
 * @returns -1 if `a` is lower than `b`, 1 if it's higher, or 0 if they tie.
 * @throws {@link InvalidArgumentError} When `rankOrder` isn't an array or lists
 * a rank twice, `options` isn't an object, or its `suitOrder` is neither
 * `undefined` nor an array, or lists a suit twice. Also when a card's rank
 * isn't in the rank order, or, with a suit order, its suit isn't in the suit
 * order.
 *
 * @example
 * ```ts
 * import { card, compareCards, RankOrder, SuitOrder } from "deckshoes";
 *
 * const ace = card("A", "S");
 * const king = card("K", "S");
 * compareCards(ace, king, RankOrder.ACE_HIGH); // => 1
 * compareCards(ace, king, RankOrder.ACE_LOW); // => -1
 *
 * // Cards of the same rank tie, unless a suit order separates them.
 * const spade = card("7", "S");
 * const heart = card("7", "H");
 * compareCards(spade, heart, RankOrder.ACE_HIGH); // => 0
 * const options = { suitOrder: SuitOrder.BRIDGE };
 * compareCards(spade, heart, RankOrder.ACE_HIGH, options); // => 1
 *
 * // As a comparator, highest first.
 * const hand = [card("9", "D"), card("A", "C"), card("2", "H")];
 * const highFirst = hand.toSorted((x, y) => compareCards(y, x, RankOrder.ACE_HIGH));
 * highFirst; // => [card("A", "C"), card("9", "D"), card("2", "H")]
 *
 * // Every rank has to be in the order.
 * const pinochle: RankOrder = ["9", "J", "Q", "K", "10", "A"];
 * compareCards(card("2", "H"), ace, pinochle); // throws INVALID_ARGUMENT
 * ```
 *
 * @since NEXT
 */
export function compareCards<C extends { readonly rank: unknown }>(
  a: C,
  b: C,
  rankOrder: RankOrder<C["rank"]>,
  options: CompareCardsOptions<
    C extends { readonly suit: infer S } ? S : never
  > = {},
): -1 | 0 | 1 {
  const problem =
    orderProblem(rankOrder, "rank") ??
    optionsProblem(options, SUIT_ORDER_EXAMPLE);
  if (problem !== undefined) throw problem;
  // Read the option once, as `unknown`: JavaScript callers can pass anything,
  // and a getter could give the check one value and the comparison another.
  const { suitOrder }: Readonly<{ suitOrder?: unknown }> = options;
  const badSuitOrder =
    suitOrder === undefined ? undefined : orderProblem(suitOrder, "suit");
  if (badSuitOrder !== undefined) throw badSuitOrder;

  const ranks = placesIn(rankOrder);
  const suits =
    suitOrder === undefined
      ? undefined
      : placesIn(suitOrder as readonly unknown[]);
  const keyA = keyOf(a, ranks, suits);
  if ("missing" in keyA) {
    throw notInOrder("compare", "a", keyA.missing, keyA.value);
  }
  const keyB = keyOf(b, ranks, suits);
  if ("missing" in keyB) {
    throw notInOrder("compare", "b", keyB.missing, keyB.value);
  }
  return keyA.key < keyB.key ? -1 : keyA.key > keyB.key ? 1 : 0;
}

/**
 * Sorts a stack by a rank order, and by a suit order if given, putting the
 * lowest card on top.
 *
 * A card's place is its rank's place in `rankOrder`, lowest first, so the top
 * card, `stack[0]`, is the lowest. Cards of the same rank keep the order they
 * had, unless you pass a suit order, which places them by suit, also lowest
 * first. The sort is stable: cards that still tie, such as copies, keep their
 * order.
 *
 * To sort highest first, reverse the orders, as in
 * `sort(hand, RankOrder.ACE_HIGH.toReversed())`. Reversing the sorted stack
 * instead would also reverse the cards that tie.
 *
 * Every card's rank has to be in the rank order, and when a suit order is
 * given, its suit has to be in that, so the wrong order for a deck throws
 * rather than sorting quietly. A hole in the stack has no rank, so it throws
 * too. A rank or suit is matched as `includes` matches.
 *
 * The stack is left untouched, frozen or not, and the sorted stack is a new
 * frozen array, even when the order doesn't change. Any stack works, including
 * one with copies or with cards that aren't standard cards, as long as the
 * orders list their ranks and suits.
 *
 * @typeParam C - The type of card in the stack.
 * @param stack - The stack to sort, top first.
 * @param rankOrder - The ranks from lowest to highest, each listed once, such
 * as `RankOrder.ACE_HIGH`.
 * @param options - Settings for the sort: a suit order to separate cards of
 * the same rank.
 * @returns A new frozen stack holding the same cards, lowest on top.
 * @throws {@link InvalidArgumentError} When `stack` isn't an array,
 * `rankOrder` isn't an array or lists a rank twice, `options` isn't an object,
 * or its `suitOrder` is neither `undefined` nor an array, or lists a suit
 * twice. Also when a card's rank isn't in the rank order, or, with a suit
 * order, its suit isn't in the suit order.
 *
 * @example
 * ```ts
 * import { card, RankOrder, sort, SuitOrder } from "deckshoes";
 *
 * const hand = [card("K", "S"), card("2", "H"), card("A", "D"), card("2", "C")];
 * sort(hand, RankOrder.ACE_HIGH); // => [card("2", "H"), card("2", "C"), card("K", "S"), card("A", "D")]
 * sort(hand, RankOrder.ACE_LOW); // => [card("A", "D"), card("2", "H"), card("2", "C"), card("K", "S")]
 *
 * // A suit order separates cards of the same rank.
 * const bySuit = { suitOrder: SuitOrder.BRIDGE };
 * sort(hand, RankOrder.ACE_HIGH, bySuit); // => [card("2", "C"), card("2", "H"), card("K", "S"), card("A", "D")]
 *
 * // Highest first: reverse the orders. Cards that tie keep their order.
 * sort(hand, RankOrder.ACE_HIGH.toReversed()); // => [card("A", "D"), card("K", "S"), card("2", "H"), card("2", "C")]
 *
 * // Every rank has to be in the order.
 * sort(hand, ["9", "J", "Q", "K", "10", "A"]); // throws INVALID_ARGUMENT
 * ```
 *
 * @since NEXT
 */
export function sort<C extends { readonly rank: unknown }>(
  stack: CardStack<C>,
  rankOrder: RankOrder<C["rank"]>,
  options: SortOptions<C extends { readonly suit: infer S } ? S : never> = {},
): CardStack<C> {
  const problem =
    stackProblem(stack) ??
    orderProblem(rankOrder, "rank") ??
    optionsProblem(options, SUIT_ORDER_EXAMPLE);
  if (problem !== undefined) throw problem;
  // Read the option once, as `unknown`, as compareCards does.
  const { suitOrder }: Readonly<{ suitOrder?: unknown }> = options;
  const badSuitOrder =
    suitOrder === undefined ? undefined : orderProblem(suitOrder, "suit");
  if (badSuitOrder !== undefined) throw badSuitOrder;

  const sorted = intoBuckets(
    stack,
    placesIn(rankOrder),
    suitOrder === undefined
      ? undefined
      : placesIn(suitOrder as readonly unknown[]),
  );
  if ("missing" in sorted) {
    const name = `stack[${String(sorted.index)}]`;
    throw notInOrder("sort", name, sorted.missing, sorted.value);
  }

  // Buckets that no card needed are holes, and are skipped. Pushing one card
  // at a time, rather than spreading a bucket, works for buckets of any size.
  const result: C[] = [];
  for (const bucket of sorted.buckets) {
    if (bucket !== undefined) for (const card of bucket) result.push(card);
  }
  return Object.freeze(result);
}
