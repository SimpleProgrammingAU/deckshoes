import type { CardStack } from "../stack.ts";
import type { Category } from "./category.ts";

import { InsufficientCardsError } from "../errors.ts";
import { namedStackProblem } from "../internal/checks.ts";
import { readPokerHand, sizesProblem } from "../internal/poker.ts";

/**
 * Returns the category of a poker hand: of the best five of the cards, or of
 * all of them while there are fewer than five.
 *
 * Pass every card the player can use: in hold'em, their two hole cards with
 * the community cards dealt so far, and in stud, all seven at the showdown.
 * With fewer than five cards, only `Category.HIGH_CARD`, `Category.ONE_PAIR`,
 * `Category.TWO_PAIR`, `Category.THREE_OF_A_KIND` and
 * `Category.FOUR_OF_A_KIND` can be made, so two hole cards of one rank are
 * already one pair before the flop. A royal flush is `Category.STRAIGHT_FLUSH`:
 * the highest one.
 *
 * Only the cards' ranks and suits are read, so the order of the cards doesn't
 * matter, and a cloned card, such as one sent with `postMessage`, counts the
 * same as the real one. The cards are left untouched.
 *
 * @param cards - The cards the player can use, in any order.
 * @returns The poker hand's category, such as `Category.FLUSH`.
 * @throws {@link deckshoes!InvalidArgumentError | InvalidArgumentError} When
 * `cards` isn't an array, or holds the same card twice: a poker hand is dealt
 * from one deck.
 * @throws {@link deckshoes!InsufficientCardsError | InsufficientCardsError}
 * When `cards` is empty.
 * @throws {@link deckshoes!InvalidCardError | InvalidCardError} When a card in
 * `cards` doesn't have a standard rank and suit, such as a hole in the array.
 *
 * @example
 * ```ts
 * import { type CardStack, parseStack } from "deckshoes";
 * import { Category, handCategory } from "deckshoes/poker";
 *
 * handCategory(parseStack("KS KH KD 4C 4S")); // => Category.FULL_HOUSE
 * handCategory(parseStack("AH 2C 3D 4S 5H")); // => Category.STRAIGHT
 *
 * // Straights don't wrap round.
 * handCategory(parseStack("QH KC AD 2S 3H")); // => Category.HIGH_CARD
 *
 * // Hold'em: the hole cards and the community cards, judged by the best five.
 * const holeCards = parseStack("AS KS");
 * const communityCards = parseStack("QS JS 10S 2H 3D");
 * handCategory([...holeCards, ...communityCards]); // => Category.STRAIGHT_FLUSH
 *
 * // Before the flop, a pair in the hole is already one pair.
 * handCategory(parseStack("8C 8D")); // => Category.ONE_PAIR
 *
 * // A flush or better, as a pay table might ask.
 * const flushOrBetter: ReadonlySet<Category> = new Set([
 *   Category.STRAIGHT_FLUSH,
 *   Category.FOUR_OF_A_KIND,
 *   Category.FULL_HOUSE,
 *   Category.FLUSH,
 * ]);
 * const pays = (cards: CardStack) => flushOrBetter.has(handCategory(cards));
 * pays(parseStack("9H 2H KH 5H 7H")); // => true
 * pays(parseStack("9H 10S JD QC KH")); // => false
 *
 * // A poker hand holds each card once.
 * handCategory(parseStack("AS AS AH AD AC")); // throws INVALID_ARGUMENT
 * ```
 *
 * @since 1.1.0
 */
export function handCategory(cards: CardStack): Category {
  const problem = namedStackProblem(cards, "cards");
  if (problem !== undefined) throw problem;
  const size = cards.length;
  if (size === 0) throw new InsufficientCardsError(1, 0);
  const reading = readPokerHand(cards, size, "the cards");
  if (reading instanceof Error) throw reading;
  return reading.category;
}

/**
 * Returns a poker hand's cards: the best five of the cards, or all of them
 * while there are fewer than five, most significant first.
 *
 * The cards that make the category come first, with bigger groups before
 * smaller ones, and then the kickers, high to low: a full house is its three
 * of a kind and then its pair, and two pair is the higher pair, the lower
 * pair, and the kicker. A straight runs from its top card, so the wheel is
 * 5 4 3 2 A. Where more than one card would do equally well, such as two
 * queens for one kicker, the one nearer the top is used. When two suits make
 * flushes as strong as each other, the one whose top card is nearer the top
 * is used.
 *
 * The cards returned are the ones given, so a cloned card comes back as the
 * clone. The cards are left untouched.
 *
 * This judges any five of the cards, as hold'em, stud and draw do. Omaha uses
 * exactly two of its hole cards and three community cards, so try each such
 * five, as below, until deckshoes covers it
 * ([#100](https://github.com/SimpleProgrammingAU/deckshoes/issues/100)).
 *
 * @param cards - The cards the player can use, in any order.
 * @returns A new frozen stack of the poker hand's cards, most significant
 * first.
 * @throws {@link deckshoes!InvalidArgumentError | InvalidArgumentError} When
 * `cards` isn't an array, or holds the same card twice.
 * @throws {@link deckshoes!InsufficientCardsError | InsufficientCardsError}
 * When `cards` is empty.
 * @throws {@link deckshoes!InvalidCardError | InvalidCardError} When a card in
 * `cards` doesn't have a standard rank and suit, such as a hole in the array.
 *
 * @example
 * ```ts
 * import { type Card, formatStack, parseStack } from "deckshoes";
 * import { bestHand, compareHands } from "deckshoes/poker";
 *
 * // The best five of seven: the three of a kind, then the pair.
 * formatStack(bestHand(parseStack("4C KH 9S KD 4H KS 2D"))); // => "KH KD KS 4C 4H"
 *
 * // Kickers follow, high to low, and a straight runs from its top card.
 * formatStack(bestHand(parseStack("3D JC 3S 9H 2C 7D 5S"))); // => "3D 3S JC 9H 7D"
 * formatStack(bestHand(parseStack("AS 2D 3C 4H 5S 9D KC"))); // => "5S 4H 3C 2D AS"
 *
 * // Fewer than five cards all come back, most significant first.
 * formatStack(bestHand(parseStack("7H KS 7C"))); // => "7H 7C KS"
 *
 * // Omaha: two of the four hole cards, with three community cards.
 * const choose = (cards: readonly Card[], count: number): Card[][] =>
 *   count === 0
 *     ? [[]]
 *     : cards.flatMap((c, i) =>
 *         choose(cards.slice(i + 1), count - 1).map((rest) => [c, ...rest]),
 *       );
 * function omahaHand(hole: readonly Card[], community: readonly Card[]) {
 *   const fives = choose(hole, 2).flatMap((two) =>
 *     choose(community, 3).map((three) => [...two, ...three]),
 *   );
 *   return bestHand(fives.reduce((a, b) => (compareHands(b, a) > 0 ? b : a)));
 * }
 * const holeCards = parseStack("AS KD QD 9C");
 * const communityCards = parseStack("2S 5S 7S JS 4H");
 * // One spade in the hole makes a flush in hold'em, but not in Omaha.
 * formatStack(bestHand([...holeCards, ...communityCards])); // => "AS JS 7S 5S 2S"
 * formatStack(omahaHand(holeCards, communityCards)); // => "AS KD JS 7S 5S"
 * ```
 *
 * @since 1.1.0
 */
export function bestHand(cards: CardStack): CardStack {
  const problem = namedStackProblem(cards, "cards");
  if (problem !== undefined) throw problem;
  const size = cards.length;
  if (size === 0) throw new InsufficientCardsError(1, 0);
  const reading = readPokerHand(cards, size, "the cards");
  if (reading instanceof Error) throw reading;
  return reading.cards;
}

/**
 * Compares two poker hands: -1 if the first loses, 1 if it wins, or 0 if they
 * tie and split the pot.
 *
 * Each is judged by the best five of its cards, or all of them while there
 * are fewer than five, so pass every card each player can use, such as their
 * hole cards with the community cards. A higher category wins, whatever the
 * ranks. Within a category, the cards that make it are compared, bigger
 * groups first and then higher ranks, and then the kickers, high to low: so
 * K K K Q Q beats 2 2 2 A A, and A A K beats A A Q. Suits never rank, so poker
 * hands with the same category and ranks tie.
 *
 * Below five cards, a poker hand is only compared with one of the same size,
 * such as two players' hole cards before the flop, or the up cards that decide
 * who acts first in stud. That says who's ahead now, not who's likely to win.
 *
 * Only the cards' ranks and suits are read, so a cloned card counts the same
 * as the real one. Both stacks are left untouched.
 *
 * @param cards - The first player's cards, in any order.
 * @param otherCards - The second player's cards, in any order.
 * @returns -1 if `cards` makes the lower poker hand, 1 if it makes the higher
 * one, or 0 if they tie.
 * @throws {@link deckshoes!InvalidArgumentError | InvalidArgumentError} When
 * `cards` or `otherCards` isn't an array, or holds the same card twice. Also
 * when they're different sizes and either has fewer than five cards.
 * @throws {@link deckshoes!InsufficientCardsError | InsufficientCardsError}
 * When `cards` or `otherCards` is empty.
 * @throws {@link deckshoes!InvalidCardError | InvalidCardError} When a card in
 * `cards` or `otherCards` doesn't have a standard rank and suit, such as a
 * hole in the array.
 *
 * @example
 * ```ts
 * import { parseStack } from "deckshoes";
 * import { compareHands } from "deckshoes/poker";
 *
 * // A flush beats a straight, whatever the ranks.
 * compareHands(parseStack("2H 5H 7H 9H JH"), parseStack("AS KD QC JH 10S")); // => 1
 *
 * // Within a category, the ranks settle it, down to the last kicker.
 * compareHands(parseStack("QS QD 9C 5H 2D"), parseStack("QH QC 9S 7D 3C")); // => -1
 *
 * // Suits never rank, so these tie.
 * compareHands(parseStack("AS KS QD JC 10H"), parseStack("AH KD QS JH 10C")); // => 0
 *
 * // A hold'em showdown, where two players split the pot.
 * const communityCards = parseStack("KS 8D 8C 4H 2S");
 * const holeCards = [parseStack("AH KD"), parseStack("AC KH"), parseStack("9S 9D")];
 * const players = holeCards.map((hole) => [...hole, ...communityCards]);
 * const best = players.reduce((a, b) => (compareHands(b, a) > 0 ? b : a));
 * const winners = players.filter((player) => compareHands(player, best) === 0);
 * winners.length; // => 2
 *
 * // Before the flop, 2 2 is ahead of A K, though it wins only about half the
 * // time.
 * compareHands(parseStack("2C 2D"), parseStack("AS KH")); // => 1
 *
 * // Below five cards, only poker hands of the same size compare.
 * compareHands(parseStack("AS AH"), parseStack("KS KH KD")); // throws INVALID_ARGUMENT
 * ```
 *
 * @since 1.1.0
 */
export function compareHands(
  cards: CardStack,
  otherCards: CardStack,
): -1 | 0 | 1 {
  const problem =
    namedStackProblem(cards, "cards") ??
    namedStackProblem(otherCards, "other cards");
  if (problem !== undefined) throw problem;
  const size = cards.length;
  const otherSize = otherCards.length;
  if (size === 0 || otherSize === 0) {
    throw new InsufficientCardsError(1, 0);
  }
  const badSizes = sizesProblem(size, otherSize);
  if (badSizes !== undefined) throw badSizes;
  const reading = readPokerHand(cards, size, "the cards");
  if (reading instanceof Error) throw reading;
  const otherReading = readPokerHand(otherCards, otherSize, "the other cards");
  if (otherReading instanceof Error) throw otherReading;
  if (reading.strength === otherReading.strength) return 0;
  return reading.strength > otherReading.strength ? 1 : -1;
}
