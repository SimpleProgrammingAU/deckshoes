import type { Rank, Suit } from "./card.ts";
import type { CardStack } from "./stack.ts";

import { InvalidArgumentError } from "./errors.ts";
import { stackProblem } from "./internal/checks.ts";
import {
  compareBy,
  groupedBy,
  placesIn,
  sortedBy,
  suitPlacesIn,
} from "./internal/order.ts";

/**
 * A rank order: the ranks from lowest to highest, each listed once, as a plain
 * array. {@link compareCards}, {@link sort} and {@link groupByRank} take one.
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
 * array. {@link groupBySuit} takes one, and {@link compareCards} and
 * {@link sort} take one as their `suitOrder` option.
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
 * It works as a comparator for `toSorted`, though {@link sort} is faster for
 * sorting a stack. A frozen order, such as a built-in one, is read only the
 * first time it's used, so freeze an order you write before comparing many
 * cards with it.
 *
 * @typeParam C - The type of the cards.
 * @param a - The first card.
 * @param b - The second card.
 * @param rankOrder - The ranks from lowest to highest, each listed once, such
 * as `RankOrder.ACE_HIGH`.
 * @param options - Settings for the comparison: a suit order to separate cards
 * of the same rank.
 * @returns -1 if `a` is lower than `b`, 1 if it's higher, or 0 if they tie.
 * @throws {@link InvalidArgumentError} When `options` isn't an object, or
 * `rankOrder`, or a `suitOrder` other than `undefined`, isn't an array, lists
 * an entry twice, or has a hole or `undefined` in it. Also when a card's rank
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
export function compareCards<C extends Readonly<Record<"rank", unknown>>>(
  a: C,
  b: C,
  rankOrder: RankOrder<C["rank"]>,
  options: CompareCardsOptions<
    C extends { readonly suit: infer S } ? S : never
  > = {},
): -1 | 0 | 1 {
  const ranks = placesIn(rankOrder, "rank");
  if (ranks instanceof InvalidArgumentError) throw ranks;
  const suits = suitPlacesIn(options);
  if (suits instanceof InvalidArgumentError) throw suits;
  const compared = compareBy(a, b, ranks, suits);
  if (compared instanceof InvalidArgumentError) throw compared;
  return compared;
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
 * To sort by suit first, as a bridge hand is laid out, sort by rank, then
 * group by suit and flatten the groups:
 * `groupBySuit(sort(hand, RankOrder.ACE_HIGH), SuitOrder.BRIDGE).flat()`.
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
 * @throws {@link InvalidArgumentError} When `stack` isn't an array, `options`
 * isn't an object, or `rankOrder`, or a `suitOrder` other than `undefined`,
 * isn't an array, lists an entry twice, or has a hole or `undefined` in it.
 * Also when a card's rank isn't in the rank order, or, with a suit order, its
 * suit isn't in the suit order.
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
export function sort<C extends Readonly<Record<"rank", unknown>>>(
  stack: CardStack<C>,
  rankOrder: RankOrder<C["rank"]>,
  options: SortOptions<C extends { readonly suit: infer S } ? S : never> = {},
): CardStack<C> {
  const problem = stackProblem(stack);
  if (problem !== undefined) throw problem;
  const ranks = placesIn(rankOrder, "rank");
  if (ranks instanceof InvalidArgumentError) throw ranks;
  const suits = suitPlacesIn(options);
  if (suits instanceof InvalidArgumentError) throw suits;
  const sorted = sortedBy(stack, ranks, suits);
  if (sorted instanceof InvalidArgumentError) throw sorted;
  return sorted;
}

/**
 * Groups a stack's cards by rank: one stack for each rank in a rank order,
 * lowest first, each holding that rank's cards in the order they had.
 *
 * The groups line up with the order: `groups[i]` holds the cards whose rank is
 * `rankOrder[i]`, so a rank the stack doesn't hold gets an empty group, and the
 * groups for ranks next to each other in the order are next to each other too.
 * Every card ends up in exactly one group.
 *
 * Every card's rank has to be in the rank order, so the wrong order for a deck
 * throws rather than leaving cards out. A hole in the stack has no rank, so it
 * throws too. A rank is matched as `includes` matches.
 *
 * The stack is left untouched, frozen or not. Each group is a new frozen
 * array, and so is the array holding them. Any stack works, including one with
 * copies or with cards that aren't standard cards, as long as the order lists
 * their ranks.
 *
 * @typeParam C - The type of card in the stack.
 * @param stack - The stack to group, top first.
 * @param rankOrder - The ranks from lowest to highest, each listed once, such
 * as `RankOrder.ACE_HIGH`: one group for each.
 * @returns A new frozen array holding a new frozen stack for each rank in
 * `rankOrder`, in its order.
 * @throws {@link InvalidArgumentError} When `stack` isn't an array,
 * `rankOrder` isn't an array, lists a rank twice or has a hole or `undefined`
 * in it, or a card's rank isn't in the rank order.
 *
 * @example
 * ```ts
 * import { card, groupByRank, RankOrder } from "deckshoes";
 *
 * const hand = [card("7", "S"), card("K", "H"), card("7", "D"), card("2", "C")];
 * const groups = groupByRank(hand, RankOrder.ACE_HIGH);
 * groups.length; // => 13
 * groups[RankOrder.ACE_HIGH.indexOf("7")]; // => [card("7", "S"), card("7", "D")]
 * groups[RankOrder.ACE_HIGH.indexOf("A")]; // => []
 *
 * // The pairs in the hand.
 * const pairs = groups.filter((group) => group.length === 2);
 * pairs; // => [[card("7", "S"), card("7", "D")]]
 * ```
 *
 * @since NEXT
 */
export function groupByRank<C extends Readonly<Record<"rank", unknown>>>(
  stack: CardStack<C>,
  rankOrder: RankOrder<C["rank"]>,
): readonly CardStack<C>[] {
  const problem = stackProblem(stack);
  if (problem !== undefined) throw problem;
  const places = placesIn(rankOrder, "rank");
  if (places instanceof InvalidArgumentError) throw places;
  const groups = groupedBy(stack, places, "rank");
  if (groups instanceof InvalidArgumentError) throw groups;
  return groups;
}

/**
 * Groups a stack's cards by suit: one stack for each suit in a suit order,
 * lowest first, each holding that suit's cards in the order they had.
 *
 * The groups line up with the order: `groups[i]` holds the cards whose suit is
 * `suitOrder[i]`, so a suit the stack doesn't hold, such as a void in bridge,
 * gets an empty group. Every card ends up in exactly one group. To have each
 * group in rank order, sort the stack first: the groups keep the order the
 * cards had.
 *
 * Every card's suit has to be in the suit order, so the wrong order for a deck
 * throws rather than leaving cards out. A hole in the stack has no suit, so it
 * throws too. A suit is matched as `includes` matches.
 *
 * The stack is left untouched, frozen or not. Each group is a new frozen
 * array, and so is the array holding them. Any stack works, including one with
 * copies or with cards that aren't standard cards, as long as the order lists
 * their suits.
 *
 * @typeParam C - The type of card in the stack.
 * @param stack - The stack to group, top first.
 * @param suitOrder - The suits from lowest to highest, each listed once, such
 * as `SuitOrder.BRIDGE`: one group for each.
 * @returns A new frozen array holding a new frozen stack for each suit in
 * `suitOrder`, in its order.
 * @throws {@link InvalidArgumentError} When `stack` isn't an array,
 * `suitOrder` isn't an array, lists a suit twice or has a hole or `undefined`
 * in it, or a card's suit isn't in the suit order.
 *
 * @example
 * ```ts
 * import { card, groupBySuit, RankOrder, sort, SuitOrder } from "deckshoes";
 *
 * const hand = [card("Q", "H"), card("3", "C"), card("A", "H"), card("9", "C")];
 * const [clubs, diamonds, hearts] = groupBySuit(hand, SuitOrder.BRIDGE);
 * clubs; // => [card("3", "C"), card("9", "C")]
 * diamonds; // => []
 * hearts; // => [card("Q", "H"), card("A", "H")]
 *
 * // How many cards the hand holds in each suit.
 * const shape = groupBySuit(hand, SuitOrder.BRIDGE).map((group) => group.length);
 * shape; // => [2, 0, 2, 0]
 *
 * // By suit, then rank: sort, then group and flatten.
 * const sorted = sort(hand, RankOrder.ACE_HIGH);
 * const bySuit = groupBySuit(sorted, SuitOrder.BRIDGE).flat();
 * bySuit; // => [card("3", "C"), card("9", "C"), card("Q", "H"), card("A", "H")]
 * ```
 *
 * @since NEXT
 */
export function groupBySuit<C extends Readonly<Record<"suit", unknown>>>(
  stack: CardStack<C>,
  suitOrder: SuitOrder<C["suit"]>,
): readonly CardStack<C>[] {
  const problem = stackProblem(stack);
  if (problem !== undefined) throw problem;
  const places = placesIn(suitOrder, "suit");
  if (places instanceof InvalidArgumentError) throw places;
  const groups = groupedBy(stack, places, "suit");
  if (groups instanceof InvalidArgumentError) throw groups;
  return groups;
}
