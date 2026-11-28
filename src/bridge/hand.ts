import type { CardStack } from "../stack.ts";

import { InvalidCardError } from "../errors.ts";
import { readPoints, readSuitLengths } from "../internal/bridge.ts";
import { namedStackProblem } from "../internal/checks.ts";

/**
 * Returns a hand's high-card points: 4 for each ace, 3 for each king, 2 for
 * each queen and 1 for each jack.
 *
 * A standard 52 holds 40, so a hand of 13 cards dealt from one averages 10
 * and holds at most 37. Any cards can be counted, such as a hand in mid-play,
 * or a partnership's two hands together, whose points add up. An empty hand
 * has none.
 *
 * Only the cards' ranks are read, so the order of the cards doesn't matter,
 * and a cloned card, such as one sent with `postMessage`, counts the same as
 * the real one. Copies each count. The hand is left untouched.
 *
 * @param hand - The cards to count, in any order.
 * @returns The sum of the cards' high-card points, from 0 up.
 * @throws {@link deckshoes!InvalidArgumentError | InvalidArgumentError} When
 * `hand` isn't an array.
 * @throws {@link deckshoes!InvalidCardError | InvalidCardError} When a card in
 * `hand` doesn't have a standard rank, such as a hole in the array.
 *
 * @example
 * ```ts
 * import { type Card, card, parseStack } from "deckshoes";
 * import { highCardPoints } from "deckshoes/bridge";
 * import { standard52 } from "deckshoes/presets";
 *
 * // The ace of spades, two kings, a queen and a jack: 4 + 3 + 3 + 2 + 1.
 * const north = parseStack("AS KS 7S 2S QH 9H 4H KD JD 8D 6C 5C 3C");
 * highCardPoints(north); // => 13
 *
 * // A partnership's points add up: 25 or more is usually enough for game.
 * const south = parseStack("QS JS 3S AH KH 5H 2H QD 4D 3D AC 7C 2C");
 * highCardPoints(south); // => 16
 * highCardPoints([...north, ...south]); // => 29
 *
 * // A hand with no ace, king, queen or jack has none.
 * highCardPoints(parseStack("10S 9S 8H 7H 6H 5D 4D 3D 2D 10C 9C 8C 7C")); // => 0
 * highCardPoints([]); // => 0
 *
 * // A standard 52 holds 40.
 * highCardPoints(standard52()); // => 40
 *
 * // Cards are read by rank, so cloned cards count the same.
 * highCardPoints(structuredClone(north)); // => 13
 *
 * // A hole in the array isn't a card.
 * const holey: Card[] = [card("A", "S")];
 * holey.length = 2;
 * highCardPoints(holey); // throws INVALID_CARD
 * ```
 *
 * @since NEXT
 */
export function highCardPoints(hand: CardStack): number {
  const problem = namedStackProblem(hand, "hand");
  if (problem !== undefined) throw problem;
  const points = readPoints(hand);
  if (points instanceof InvalidCardError) throw points;
  return points;
}

/**
 * Returns a hand's distribution: its suit lengths, longest first, whichever
 * suits they're in.
 *
 * A hand of 13 cards with four spades and three cards in each other suit is
 * 4-3-3-3, and so is one with four clubs. There are always four lengths, with
 * 0 for a void, and they add up to the hand's size, so a hand in mid-play or a
 * whole deck works as well as a hand of 13. Join them with hyphens to write
 * the distribution as bridge players do. To find how many cards a hand holds
 * in one suit, use {@link deckshoes!count | count}.
 *
 * Only the cards' ranks and suits are read, so the order of the cards doesn't
 * matter, and a cloned card counts the same as the real one. Copies each
 * count. The hand is left untouched.
 *
 * @param hand - The cards to count, in any order.
 * @returns A new frozen array of the four suit lengths, longest first.
 * @throws {@link deckshoes!InvalidArgumentError | InvalidArgumentError} When
 * `hand` isn't an array.
 * @throws {@link deckshoes!InvalidCardError | InvalidCardError} When a card in
 * `hand` doesn't have a standard rank and suit, such as a hole in the array.
 *
 * @example
 * ```ts
 * import { type Card, count, parseStack } from "deckshoes";
 * import { distribution } from "deckshoes/bridge";
 *
 * const hand = parseStack("AS KS 7S 2S QH 9H 4H KD JD 8D 6C 5C 3C");
 * distribution(hand); // => [4, 3, 3, 3]
 * // Written as bridge players write it.
 * const written = distribution(hand).join("-");
 * written; // => "4-3-3-3"
 *
 * // A void counts 0.
 * distribution(parseStack("AS KS QS JS 10S 9S 8S AH KH QH JH 10H 9H")); // => [7, 6, 0, 0]
 *
 * // A hand in mid-play, after four tricks.
 * distribution(parseStack("KS 7S QH 9H 4H JD 8D 6C 5C")); // => [3, 2, 2, 2]
 * distribution([]); // => [0, 0, 0, 0]
 *
 * // Balanced: no void or singleton, and at most one doubleton.
 * function isBalanced(cards: readonly Card[]): boolean {
 *   const lengths = distribution(cards);
 *   // The third-longest suit and the shortest.
 *   return lengths[2] >= 3 && lengths[3] >= 2;
 * }
 * isBalanced(hand); // => true
 * isBalanced(parseStack("AS KS QS JS 10S AH KH QH JH 2D 3D 4C 5C")); // => false
 *
 * // Which suit is which: count the cards of one suit.
 * count(hand, ({ suit }) => suit === "S"); // => 4
 * ```
 *
 * @since NEXT
 */
export function distribution(
  hand: CardStack,
): readonly [number, number, number, number] {
  const problem = namedStackProblem(hand, "hand");
  if (problem !== undefined) throw problem;
  const lengths = readSuitLengths(hand);
  if (lengths instanceof InvalidCardError) throw lengths;
  lengths.sort((a, b) => b - a);
  return Object.freeze(lengths) as readonly [number, number, number, number];
}
