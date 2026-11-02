import { InvalidCardError } from "./errors.ts";
import { CARD_TABLE, CARDS } from "./internal/card-table.ts";
import { display } from "./internal/display.ts";

/**
 * The rank of a standard card: `"A"`, `"2"` to `"10"`, `"J"`, `"Q"` or `"K"`.
 *
 * Ten is `"10"`, never `"T"`. The union says nothing about which rank is
 * higher: how ranks compare is up to the game.
 *
 * @example
 * ```ts
 * import { card, type Rank } from "deckshoes";
 *
 * const ten: Rank = "10";
 * card(ten, "S"); // => { rank: "10", suit: "S", color: "black" }
 * ```
 *
 * @since NEXT
 */
export type Rank =
  "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

/**
 * The suit of a standard card: `"S"` for spades, `"H"` for hearts, `"D"` for
 * diamonds or `"C"` for clubs.
 *
 * @example
 * ```ts
 * import { card, type Suit } from "deckshoes";
 *
 * const suits: Suit[] = ["S", "H", "D", "C"];
 * const colors = suits.map((suit) => card("A", suit).color);
 * colors; // => ["black", "red", "red", "black"]
 * ```
 *
 * @since NEXT
 */
export type Suit = "S" | "H" | "D" | "C";

/**
 * The colour a game treats a card as having: `"red"` for hearts and diamonds,
 * `"black"` for spades and clubs.
 *
 * It comes from the suit, not the printing, so a four-colour deck's diamonds
 * are still red.
 *
 * @example
 * ```ts
 * import { card, type Color } from "deckshoes";
 *
 * const color: Color = card("Q", "D").color;
 * color; // => "red"
 * ```
 *
 * @since NEXT
 */
export type Color = "red" | "black";

/** Brands {@link Card}. It exists only in types: cards have no such key. */
declare const brand: unique symbol;

/**
 * One of the 52 standard cards, as returned by {@link card}.
 *
 * A card is a frozen plain object, and there's exactly one object for each
 * card, so cards compare with `===`, and `includes`, `indexOf`, `Set` and
 * `Map` work on them. The type is branded, so an object literal with the same
 * fields isn't a `Card`: it could never be `===` to the real one. Cards from
 * another install of deckshoes are separate objects, so they aren't `===` to
 * these either.
 *
 * @example
 * ```ts
 * import { type Card, card } from "deckshoes";
 *
 * const hand: Card[] = [card("A", "S"), card("10", "H")];
 * const hasAce = hand.includes(card("A", "S"));
 * hasAce; // => true
 * hand[1] === card("10", "H"); // => true
 * ```
 *
 * @since NEXT
 */
export interface Card {
  /** The card's rank, such as `"A"` or `"10"`. */
  readonly rank: Rank;

  /** The card's suit: spades, hearts, diamonds or clubs. */
  readonly suit: Suit;

  /**
   * The card's colour, set from its suit: red for hearts and diamonds, black
   * for spades and clubs.
   */
  readonly color: Color;

  /**
   * Marks the objects {@link card} returns, so a look-alike object doesn't
   * type-check as a card.
   *
   * @internal
   */
  readonly [brand]: true;
}

/**
 * Returns the standard card with the given rank and suit.
 *
 * Every call with the same rank and suit returns the same frozen object, so
 * cards compare with `===`. The colour is set from the suit. TypeScript
 * rejects any other rank or suit, and values that reach `card` without being
 * type-checked, such as user input, are checked when it runs.
 *
 * @param rank - The card's rank: `"A"`, `"2"` to `"10"`, `"J"`, `"Q"` or `"K"`.
 * @param suit - The card's suit: `"S"`, `"H"`, `"D"` or `"C"`.
 * @returns The one card object with that rank and suit.
 * @throws {@link InvalidCardError} When `rank` isn't a standard rank or `suit`
 * isn't a standard suit.
 *
 * @example
 * ```ts
 * import { card, type Rank, type Suit } from "deckshoes";
 *
 * card("A", "S"); // => { rank: "A", suit: "S", color: "black" }
 * card("10", "H").color; // => "red"
 * card("A", "S") === card("A", "S"); // => true
 *
 * // Text from outside TypeScript is checked when the card is made.
 * function fromText(rank: string, suit: string) {
 *   return card(rank as Rank, suit as Suit);
 * }
 * fromText("11", "S"); // throws INVALID_CARD
 * ```
 *
 * @since NEXT
 */
export function card(rank: Rank, suit: Suit): Card {
  const bySuit = CARD_TABLE.get(rank);
  if (bySuit === undefined) {
    throw new InvalidCardError(`Unknown rank ${display(rank)}`);
  }
  const found = bySuit.get(suit);
  if (found === undefined) {
    throw new InvalidCardError(`Unknown suit ${display(suit)}`);
  }
  return found;
}

/**
 * Checks whether a value is one of the standard cards {@link card} returns,
 * and narrows its type to {@link Card}.
 *
 * Only the real card objects pass. An object with the same fields doesn't,
 * and nor does a card from another install of deckshoes, since neither is
 * `===` to the card `card()` returns.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is one of this install's 52 cards.
 *
 * @example
 * ```ts
 * import { card, isCard } from "deckshoes";
 *
 * isCard(card("Q", "C")); // => true
 * isCard({ rank: "Q", suit: "C", color: "black" }); // => false
 * isCard("QC"); // => false
 * ```
 *
 * @since NEXT
 */
export function isCard(value: unknown): value is Card {
  return CARDS.has(value);
}
