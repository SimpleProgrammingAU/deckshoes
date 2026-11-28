import type { CardStack } from "../stack.ts";

import { InvalidCardError } from "../errors.ts";
import { readHand } from "../internal/blackjack.ts";
import { stackProblem } from "../internal/checks.ts";

/**
 * Returns a hand's total in blackjack: the sum of its cards' values, with an
 * ace counted as 11 when that keeps the total at 21 or under, and as 1
 * otherwise.
 *
 * A 2 to 10 is worth its number, and a J, Q or K is worth 10. Only one ace
 * can count as 11, since two would make 22, and when one does, the hand is
 * soft ({@link isSoft}). An empty hand totals 0, and a one-card hand totals
 * that card's value, so a dealer's ace shows 11. A total over 21 is bust
 * ({@link isBust}).
 *
 * Only the cards' ranks are read, so the order of the cards doesn't matter,
 * and a cloned card, such as one sent with `postMessage`, counts the same as
 * the real one. The hand is left untouched.
 *
 * @param hand - The cards in the hand, in any order.
 * @returns The sum of the hand's values: over 21 when it's bust.
 * @throws {@link deckshoes!InvalidArgumentError | InvalidArgumentError} When
 * `hand` isn't an array.
 * @throws {@link deckshoes!InvalidCardError | InvalidCardError} When a card in
 * `hand` doesn't have a standard rank, such as a hole in the array.
 *
 * @example
 * ```ts
 * import { type Card, card } from "deckshoes";
 * import { handTotal } from "deckshoes/blackjack";
 *
 * handTotal([card("K", "S"), card("7", "H")]); // => 17
 *
 * // An ace counts 11, unless that would take the total over 21.
 * handTotal([card("A", "S"), card("6", "H")]); // => 17
 * handTotal([card("A", "S"), card("6", "H"), card("K", "C")]); // => 17
 * handTotal([card("A", "S"), card("A", "H")]); // => 12
 *
 * // A dealer's ace shows 11, and a bust hand goes over 21.
 * handTotal([card("A", "D")]); // => 11
 * handTotal([card("K", "S"), card("Q", "H"), card("2", "C")]); // => 22
 * handTotal([]); // => 0
 *
 * // Cards are read by rank, so cloned cards count the same.
 * handTotal(structuredClone([card("A", "S"), card("6", "H")])); // => 17
 *
 * // A hole in the array isn't a card.
 * const holey: Card[] = [card("K", "S")];
 * holey.length = 2;
 * handTotal(holey); // throws INVALID_CARD
 * ```
 *
 * @since NEXT
 */
export function handTotal(hand: CardStack): number {
  const problem = stackProblem(hand);
  if (problem !== undefined) throw problem;
  const reading = readHand(hand);
  if (reading instanceof InvalidCardError) throw reading;
  return reading.total;
}

/**
 * Checks whether a hand is soft: whether its total counts an ace as 11.
 *
 * A♠ 6♥ is a soft 17, and A♠ 6♥ K♣ is a hard 17, because counting its ace as
 * 11 would make 27. A hand with no ace is always hard. A soft hand can't bust
 * on its next card, since its ace can drop back to 1. Dealers' rules often
 * turn on it: a dealer who hits soft 17 draws to A 6, and one who stands on
 * soft 17 doesn't.
 *
 * Only the cards' ranks are read, so a cloned card counts the same as the
 * real one. The hand is left untouched.
 *
 * @param hand - The hand to check.
 * @returns `true` if the hand's total counts an ace as 11.
 * @throws {@link deckshoes!InvalidArgumentError | InvalidArgumentError} When
 * `hand` isn't an array.
 * @throws {@link deckshoes!InvalidCardError | InvalidCardError} When a card in
 * `hand` doesn't have a standard rank, such as a hole in the array.
 *
 * @example
 * ```ts
 * import { type Card, card } from "deckshoes";
 * import { handTotal, isSoft } from "deckshoes/blackjack";
 *
 * const softSeventeen = [card("A", "S"), card("6", "H")];
 * isSoft(softSeventeen); // => true
 * isSoft([card("A", "S"), card("6", "H"), card("K", "C")]); // => false
 * isSoft([card("10", "S"), card("7", "H")]); // => false
 *
 * // A dealer who hits soft 17.
 * function dealerHits(hand: readonly Card[]): boolean {
 *   const total = handTotal(hand);
 *   return total < 17 || (total === 17 && isSoft(hand));
 * }
 * dealerHits(softSeventeen); // => true
 * dealerHits([card("10", "S"), card("7", "H")]); // => false
 *
 * // The total with the ace counted as 1 instead.
 * handTotal(softSeventeen) - 10; // => 7
 * ```
 *
 * @since NEXT
 */
export function isSoft(hand: CardStack): boolean {
  const problem = stackProblem(hand);
  if (problem !== undefined) throw problem;
  const reading = readHand(hand);
  if (reading instanceof InvalidCardError) throw reading;
  return reading.soft;
}

/**
 * Checks whether a hand is a blackjack: two cards, an ace and a 10, J, Q or K.
 *
 * It looks only at the cards. After a split, most rules count an ace and a 10
 * as 21 rather than a blackjack, but the cards can't show that the hand was
 * split, so treat a split hand's two-card 21 as your rules say. Every card is
 * checked, even in a hand that isn't two cards long.
 *
 * Only the cards' ranks are read, so the order of the cards doesn't matter,
 * and a cloned card counts the same as the real one. The hand is left
 * untouched.
 *
 * @param hand - The hand to check.
 * @returns `true` if the hand is an ace and a 10, J, Q or K, and nothing else.
 * @throws {@link deckshoes!InvalidArgumentError | InvalidArgumentError} When
 * `hand` isn't an array.
 * @throws {@link deckshoes!InvalidCardError | InvalidCardError} When a card in
 * `hand` doesn't have a standard rank, such as a hole in the array.
 *
 * @example
 * ```ts
 * import { card } from "deckshoes";
 * import { isBlackjack } from "deckshoes/blackjack";
 *
 * isBlackjack([card("A", "S"), card("K", "H")]); // => true
 * isBlackjack([card("10", "D"), card("A", "C")]); // => true
 *
 * // 21 from more than two cards isn't a blackjack.
 * isBlackjack([card("7", "S"), card("7", "H"), card("7", "D")]); // => false
 * isBlackjack([card("A", "S"), card("9", "H")]); // => false
 * ```
 *
 * @since NEXT
 */
export function isBlackjack(hand: CardStack): boolean {
  const problem = stackProblem(hand);
  if (problem !== undefined) throw problem;
  const reading = readHand(hand);
  if (reading instanceof InvalidCardError) throw reading;
  return reading.size === 2 && reading.total === 21;
}

/**
 * Checks whether a hand is bust: whether its total is over 21.
 *
 * An ace never busts a hand: it counts 1 whenever 11 would take the total over
 * 21. So A♠ K♥ 5♣ is a hard 16, not bust, while K♠ Q♥ 2♣ is bust at 22.
 *
 * Only the cards' ranks are read, so a cloned card counts the same as the
 * real one. The hand is left untouched.
 *
 * @param hand - The hand to check.
 * @returns `true` if the hand's total is over 21.
 * @throws {@link deckshoes!InvalidArgumentError | InvalidArgumentError} When
 * `hand` isn't an array.
 * @throws {@link deckshoes!InvalidCardError | InvalidCardError} When a card in
 * `hand` doesn't have a standard rank, such as a hole in the array.
 *
 * @example
 * ```ts
 * import { card } from "deckshoes";
 * import { isBust } from "deckshoes/blackjack";
 *
 * isBust([card("K", "S"), card("Q", "H"), card("2", "C")]); // => true
 * isBust([card("A", "S"), card("K", "H"), card("5", "C")]); // => false
 * isBust([card("K", "S"), card("Q", "H"), card("A", "C")]); // => false
 * ```
 *
 * @since NEXT
 */
export function isBust(hand: CardStack): boolean {
  const problem = stackProblem(hand);
  if (problem !== undefined) throw problem;
  const reading = readHand(hand);
  if (reading instanceof InvalidCardError) throw reading;
  return reading.total > 21;
}
