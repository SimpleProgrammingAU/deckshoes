/**
 * The categories of poker hand, which {@link handCategory} returns. From
 * highest to lowest:
 *
 * - `Category.STRAIGHT_FLUSH`: five cards in a row, all of one suit, such as
 *   9♠ 8♠ 7♠ 6♠ 5♠. The highest, A K Q J 10 of one suit, is a royal flush.
 * - `Category.FOUR_OF_A_KIND`: four cards of one rank, such as 9 9 9 9 K.
 * - `Category.FULL_HOUSE`: three cards of one rank and two of another, such
 *   as K K K 4 4.
 * - `Category.FLUSH`: five cards of one suit, not in a row.
 * - `Category.STRAIGHT`: five cards in a row, not all of one suit. An ace
 *   counts high, as in A K Q J 10, or low, as in the wheel, 5 4 3 2 A, the
 *   lowest straight. Straights don't wrap round, so Q K A 2 3 isn't one.
 * - `Category.THREE_OF_A_KIND`: three cards of one rank, such as 7 7 7 K 2.
 * - `Category.TWO_PAIR`: two cards of one rank and two of another, such as
 *   J J 4 4 9.
 * - `Category.ONE_PAIR`: two cards of one rank, such as 10 10 A 8 3.
 * - `Category.HIGH_CARD`: none of the above.
 *
 * A poker hand in a higher category beats any in a lower one, whatever its
 * ranks: the lowest straight beats three aces. Within a category, the ranks
 * settle it ({@link compareHands}).
 *
 * @example
 * ```ts
 * import { card } from "deckshoes";
 * import { Category, handCategory } from "deckshoes/poker";
 *
 * const sevens = [card("7", "S"), card("7", "H"), card("7", "D")];
 * handCategory([...sevens, card("K", "C"), card("2", "S")]); // => Category.THREE_OF_A_KIND
 * handCategory([...sevens, card("K", "C"), card("K", "S")]); // => Category.FULL_HOUSE
 *
 * // The values are plain strings, which you can show to players.
 * Category.FULL_HOUSE; // => "full house"
 * ```
 *
 * @since NEXT
 */
export const Category: {
  /** Four cards of one rank. */
  readonly FOUR_OF_A_KIND: "four of a kind";
  /** Five cards of one suit, not in a row. */
  readonly FLUSH: "flush";
  /** Three cards of one rank and two of another. */
  readonly FULL_HOUSE: "full house";
  /** None of the other categories. */
  readonly HIGH_CARD: "high card";
  /** Two cards of one rank. */
  readonly ONE_PAIR: "one pair";
  /** Five cards in a row, not all of one suit. */
  readonly STRAIGHT: "straight";
  /** Five cards in a row, all of one suit. */
  readonly STRAIGHT_FLUSH: "straight flush";
  /** Three cards of one rank. */
  readonly THREE_OF_A_KIND: "three of a kind";
  /** Two cards of one rank and two of another. */
  readonly TWO_PAIR: "two pair";
} = /* @__PURE__ */ Object.freeze({
  FLUSH: "flush",
  FOUR_OF_A_KIND: "four of a kind",
  FULL_HOUSE: "full house",
  HIGH_CARD: "high card",
  ONE_PAIR: "one pair",
  STRAIGHT: "straight",
  STRAIGHT_FLUSH: "straight flush",
  THREE_OF_A_KIND: "three of a kind",
  TWO_PAIR: "two pair",
});

/**
 * A category of poker hand, such as `Category.FLUSH`, from
 * `Category.STRAIGHT_FLUSH` down to `Category.HIGH_CARD`.
 *
 * @example
 * ```ts
 * import { card } from "deckshoes";
 * import { Category, handCategory } from "deckshoes/poker";
 *
 * const category: Category = handCategory([card("A", "S"), card("A", "H")]);
 * category; // => Category.ONE_PAIR
 * ```
 *
 * @since NEXT
 */
export type Category = (typeof Category)[keyof typeof Category];
