import { type Card, isCard } from "./card.ts";
import { InvalidArgumentError, InvalidCardError } from "./errors.ts";
import { optionsProblem } from "./internal/checks.ts";
import { display } from "./internal/display.ts";
import {
  readCard,
  SYMBOLS,
  unicodeCharacter,
} from "./internal/notation-table.ts";
import { rankName, suitName } from "./names.ts";

/**
 * The notations {@link formatCard} can write a card in, as its `notation`
 * option.
 *
 * - `Notation.SHORT`, the default, writes the rank and then the suit's
 *   letter, such as `"AS"` or `"10H"`.
 * - `Notation.SYMBOL` writes the rank and then the suit's symbol, such as
 *   `"A♠"` or `"10♥"`.
 * - `Notation.NAME` writes the card's name, such as `"Ace of Spades"`.
 * - `Notation.UNICODE_CHARACTER` writes the card's character from Unicode's
 *   Playing Cards block, such as `"🂡"` for the ace of spades. Not every font
 *   has these characters, so check that they show where you use them.
 *
 * {@link parseCard} reads every notation, so it doesn't take one.
 *
 * @example
 * ```ts
 * import { card, formatCard, Notation } from "deckshoes";
 *
 * const ten = card("10", "H");
 * formatCard(ten, { notation: Notation.SHORT }); // => "10H"
 * formatCard(ten, { notation: Notation.SYMBOL }); // => "10♥"
 * formatCard(ten, { notation: Notation.NAME }); // => "Ten of Hearts"
 * formatCard(ten, { notation: Notation.UNICODE_CHARACTER }); // => "🂺"
 *
 * // The values are plain strings, which is what error messages show.
 * Notation.SYMBOL; // => "symbol"
 * Notation.UNICODE_CHARACTER; // => "unicode character"
 * ```
 *
 * @since 1.0.0
 */
export const Notation: {
  /** The card's name, such as `"Ace of Spades"`. */
  readonly NAME: "name";
  /** The rank and then the suit's letter, such as `"AS"` or `"10H"`. */
  readonly SHORT: "short";
  /** The rank and then the suit's symbol, such as `"A♠"` or `"10♥"`. */
  readonly SYMBOL: "symbol";
  /**
   * The card's Unicode character, from Unicode's Playing Cards block, such as
   * `"🂡"`. Not every font has these characters.
   */
  readonly UNICODE_CHARACTER: "unicode character";
} = /* @__PURE__ */ Object.freeze({
  NAME: "name",
  SHORT: "short",
  SYMBOL: "symbol",
  UNICODE_CHARACTER: "unicode character",
});

/**
 * A notation that {@link formatCard} takes: `Notation.SHORT`,
 * `Notation.SYMBOL`, `Notation.NAME` or `Notation.UNICODE_CHARACTER`.
 *
 * @example
 * ```ts
 * import { card, formatCard, Notation } from "deckshoes";
 *
 * const notations: Notation[] = [
 *   Notation.SHORT,
 *   Notation.SYMBOL,
 *   Notation.NAME,
 *   Notation.UNICODE_CHARACTER,
 * ];
 * const texts = notations.map((notation) =>
 *   formatCard(card("Q", "D"), { notation }),
 * );
 * texts; // => ["QD", "Q♦", "Queen of Diamonds", "🃍"]
 * ```
 *
 * @since 1.0.0
 */
export type Notation = (typeof Notation)[keyof typeof Notation];

/**
 * Settings for {@link formatCard}.
 *
 * @example
 * ```ts
 * import { card, formatCard, type FormatCardOptions, Notation } from "deckshoes";
 *
 * const options: FormatCardOptions = { notation: Notation.NAME };
 * formatCard(card("A", "S"), options); // => "Ace of Spades"
 * ```
 *
 * @since 1.0.0
 */
export interface FormatCardOptions {
  /**
   * The notation to write the card in: `Notation.SHORT`, `Notation.SYMBOL`,
   * `Notation.NAME` or `Notation.UNICODE_CHARACTER`. Leave it out, or pass
   * `undefined`, for short notation.
   */
  readonly notation?: Notation | undefined;
}

/**
 * Reads a card written as text, and returns the one card object it names.
 *
 * It reads every {@link Notation}, ignoring the case of A–Z:
 *
 * - Short notation: the rank and then the suit's letter, such as `"AS"`,
 *   `"10h"` or `"Th"`.
 * - Symbol notation: the rank and then the suit's symbol, such as `"A♠"` or
 *   `"10♥"`. The outline symbols `♤ ♡ ♢ ♧` work too, and a symbol can have a
 *   variation selector after it, as `"♥️"` from an emoji keyboard does.
 * - The card's name, such as `"Ace of Spades"`, with one space between words.
 * - The card's Unicode character, from Unicode's Playing Cards block, such as
 *   `"🂡"` for the ace of spades. The block's other characters, such as the
 *   knights, the jokers and the card back, aren't standard cards, so they
 *   aren't read.
 *
 * Ten is `10` or `T` in short and symbol notation, and `Ten` in a name.
 * Nothing else is read: not spaces around the text, not a variation selector
 * after a card's Unicode character, and not lookalike characters, such as the
 * Kelvin sign (U+212A) for K. Trim user input first. To get `undefined`
 * rather than an error, use {@link tryParseCard}.
 *
 * @param text - The card's text, such as `"AS"`, `"10♥"` or `"Ace of Spades"`.
 * @returns The one card object that the text names.
 * @throws {@link InvalidCardError} When `text` isn't a card written in one of
 * the notations above.
 *
 * @example
 * ```ts
 * import { card, parseCard } from "deckshoes";
 *
 * parseCard("AS") === card("A", "S"); // => true
 * parseCard("10h"); // => card("10", "H")
 * parseCard("Th"); // => card("10", "H")
 * parseCard("Q♦"); // => card("Q", "D")
 * parseCard("king of clubs"); // => card("K", "C")
 * parseCard("🂡"); // => card("A", "S")
 *
 * // A joker isn't a standard card.
 * parseCard("🃏"); // throws INVALID_CARD
 *
 * // Trim user input first: spaces around the text aren't read.
 * const input = " 7s\n";
 * parseCard(input.trim()); // => card("7", "S")
 * parseCard(input); // throws INVALID_CARD
 * ```
 *
 * @since 1.0.0
 */
export function parseCard(text: string): Card {
  const found = readCard(text);
  if (found === undefined) {
    throw new InvalidCardError(
      `Unknown card ${display(text)}: expected text such as "AS", "10H", "A♠" or "Ace of Spades"`,
    );
  }
  return found;
}

/**
 * Reads a card written as text, as {@link parseCard} does, but returns
 * `undefined` rather than throwing when the text doesn't name a card.
 *
 * It reads exactly what `parseCard` reads, and returns `undefined` for
 * anything `parseCard` throws for, including a value that isn't a string.
 *
 * @param text - The card's text, such as `"AS"`, `"10♥"` or `"Ace of Spades"`.
 * @returns The one card object that the text names, or `undefined` if it
 * names none.
 *
 * @example
 * ```ts
 * import { card, tryParseCard } from "deckshoes";
 *
 * tryParseCard("A♠") === card("A", "S"); // => true
 * tryParseCard("11S"); // => undefined
 * tryParseCard("Ace of Spade"); // => undefined
 * ```
 *
 * @since 1.0.0
 */
export function tryParseCard(text: string): Card | undefined {
  return readCard(text);
}

/**
 * Writes a card as text, in short notation unless you choose another
 * {@link Notation}.
 *
 * - `Notation.SHORT`: the rank and then the suit's letter, such as `"AS"` or
 *   `"10H"`.
 * - `Notation.SYMBOL`: the rank and then the suit's symbol, such as `"A♠"` or
 *   `"10♥"`.
 * - `Notation.NAME`: the card's name, such as `"Ace of Spades"`, from
 *   {@link rankName} and {@link suitName}.
 * - `Notation.UNICODE_CHARACTER`: the card's character from Unicode's Playing
 *   Cards block, such as `"🂡"`.
 *
 * Short and symbol notation write ten as `10`, never `T`. {@link parseCard}
 * reads each notation back to the same card.
 *
 * Only the 52 card objects that this install's `card()` returns can be
 * written. A cloned card, such as one sent with `postMessage`, isn't one of
 * them, and nor is a card from another install of deckshoes, such as one a
 * dependency bundles. Pass its rank and suit back through `card()` first.
 *
 * @param card - The card to write.
 * @param options - Settings for the text: its notation.
 * @returns The card written in that notation.
 * @throws {@link InvalidCardError} When `card` isn't one of the cards this
 * install's `card()` returns, such as a cloned card.
 * @throws {@link InvalidArgumentError} When `options` isn't an object or is an
 * array, or its `notation` isn't `Notation.SHORT`, `Notation.SYMBOL`,
 * `Notation.NAME` or `Notation.UNICODE_CHARACTER`.
 *
 * @example
 * ```ts
 * import { card, formatCard, Notation, parseCard } from "deckshoes";
 *
 * const ten = card("10", "H");
 * formatCard(ten); // => "10H"
 * formatCard(ten, { notation: Notation.SYMBOL }); // => "10♥"
 * formatCard(ten, { notation: Notation.NAME }); // => "Ten of Hearts"
 * formatCard(ten, { notation: Notation.UNICODE_CHARACTER }); // => "🂺"
 *
 * // Parsing reads every notation back.
 * parseCard(formatCard(ten, { notation: Notation.NAME })) === ten; // => true
 *
 * // A cloned card has to go back through card() first.
 * const clone = structuredClone(ten);
 * formatCard(clone); // throws INVALID_CARD
 * formatCard(card(clone.rank, clone.suit)); // => "10H"
 * ```
 *
 * @since 1.0.0
 */
export function formatCard(
  card: Card,
  options: FormatCardOptions = {},
): string {
  if (!isCard(card)) {
    throw new InvalidCardError(
      `Invalid card ${display(card)}: expected one of the cards card() returns`,
    );
  }
  const optionsError = optionsProblem(options, "{ notation: Notation.SYMBOL }");
  if (optionsError !== undefined) throw optionsError;

  // Read the option once, as `unknown`: JavaScript callers can pass anything,
  // and a getter could give the check one value and the text another.
  const { notation = Notation.SHORT }: Readonly<{ notation?: unknown }> =
    options;
  switch (notation) {
    case Notation.NAME: {
      return `${rankName(card.rank)} of ${suitName(card.suit)}`;
    }
    case Notation.SHORT: {
      return `${card.rank}${card.suit}`;
    }
    case Notation.SYMBOL: {
      return `${card.rank}${SYMBOLS[card.suit]}`;
    }
    case Notation.UNICODE_CHARACTER: {
      return unicodeCharacter(card);
    }
    default: {
      throw new InvalidArgumentError(
        `Invalid notation option ${display(notation)}: expected Notation.SHORT, Notation.SYMBOL, Notation.NAME or Notation.UNICODE_CHARACTER ("unicode character")`,
      );
    }
  }
}
