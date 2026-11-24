import type { Notation } from "./notation.ts";
import type { Shoe } from "./shoe.ts";
import type { CardStack } from "./stack.ts";

import { InvalidArgumentError, InvalidCardError } from "./errors.ts";
import {
  optionsProblem,
  stackProblem,
  textProblem,
} from "./internal/checks.ts";
import {
  FORMAT_OPTIONS_EXAMPLE,
  readShoeText,
  readStackText,
  readWriter,
  writeShoe,
  writeStack,
} from "./internal/compact.ts";
import { readShoe } from "./internal/shoe.ts";

/** The text `parseStack` shows as an example when it isn't given a string. */
const STACK_TEXT_EXAMPLE = "AS 10H KD";

/** The text `parseShoe` shows as an example when it isn't given a string. */
const SHOE_TEXT_EXAMPLE = "AS 10H KD | 2 | 2C";

/**
 * Settings for {@link formatStack}.
 *
 * @example
 * ```ts
 * import { card, formatStack, type FormatStackOptions, Notation } from "deckshoes";
 *
 * const options: FormatStackOptions = { notation: Notation.SYMBOL };
 * formatStack([card("A", "S"), card("10", "H")], options); // => "A♠ 10♥"
 * ```
 *
 * @since NEXT
 */
export interface FormatStackOptions {
  /**
   * The notation to write each card in: `Notation.SHORT`, `Notation.SYMBOL` or
   * `Notation.UNICODE_CHARACTER`. Leave it out, or pass `undefined`, for short
   * notation. A card's name has spaces in it, so `Notation.NAME` can't be
   * used.
   */
  readonly notation?: Exclude<Notation, typeof Notation.NAME> | undefined;
}

/**
 * Writes a stack as a compact string: its cards top first, separated by single
 * spaces, such as `"AS 10H KD"`.
 *
 * Each card is written as {@link formatCard} writes it, in short notation
 * unless you choose `Notation.SYMBOL` or `Notation.UNICODE_CHARACTER`. A card's
 * name has spaces in it, so `Notation.NAME` can't be used. An empty stack is
 * `""`. {@link parseStack} reads the text back to the same cards.
 *
 * Only the 52 card objects that this install's `card()` returns can be
 * written. Load a cloned stack, such as one sent with `postMessage`, with
 * {@link stackFromJSON} first.
 *
 * @param stack - The stack to write.
 * @param options - Settings for the text: its notation.
 * @returns The stack's cards, top first, separated by single spaces.
 * @throws {@link InvalidArgumentError} When `stack` isn't an array, `options`
 * isn't an object or is an array, its `notation` isn't `Notation.SHORT`,
 * `Notation.SYMBOL` or `Notation.UNICODE_CHARACTER`, or the stack's compact
 * string would be longer than the runtime's longest string: about 2²⁹
 * characters in Node.js, which is about 175 million cards.
 * @throws {@link InvalidCardError} When a card in `stack` isn't one of the
 * cards this install's `card()` returns, such as a cloned card.
 *
 * @example
 * ```ts
 * import { card, formatStack, Notation, stackFromJSON } from "deckshoes";
 *
 * const hand = [card("A", "S"), card("10", "H"), card("K", "D")];
 * formatStack(hand); // => "AS 10H KD"
 * formatStack(hand, { notation: Notation.SYMBOL }); // => "A♠ 10♥ K♦"
 * formatStack(hand, { notation: Notation.UNICODE_CHARACTER }); // => "🂡 🂺 🃎"
 * formatStack([]); // => ""
 *
 * // A cloned stack has to be loaded first.
 * const clone = structuredClone(hand);
 * formatStack(clone); // throws INVALID_CARD
 * formatStack(stackFromJSON(clone)); // => "AS 10H KD"
 * ```
 *
 * @since NEXT
 */
export function formatStack(
  stack: CardStack,
  options: FormatStackOptions = {},
): string {
  const problem =
    stackProblem(stack) ?? optionsProblem(options, FORMAT_OPTIONS_EXAMPLE);
  if (problem !== undefined) throw problem;
  const write = readWriter(options);
  if (write instanceof InvalidArgumentError) throw write;
  const text = writeStack(stack, write, "the stack", {
    name: "stack",
    value: stack,
  });
  if (typeof text !== "string") throw text;
  return text;
}

/**
 * Reads a stack written as a compact string, and returns a new frozen stack of
 * the card objects it names, top first.
 *
 * The text is the stack's cards, top first, separated by single spaces, such
 * as `"AS 10H KD"`, as {@link formatStack} writes it. Each card is read as
 * {@link parseCard} reads it, in short or symbol notation or as its Unicode
 * character, ignoring the case of A–Z, so the notations can mix, as in
 * `"as T♥ 🃎"`. A card's name has spaces in it, so it can't be read. An empty
 * string is an empty stack.
 *
 * Nothing else is read: not spaces around the text, not two spaces between
 * cards, and not tabs or any other space. Trim user input first. To get
 * `undefined` rather than an error, use {@link tryParseStack}.
 *
 * @param text - The stack's text, such as `"AS 10H KD"`.
 * @returns A new frozen stack of the card objects the text names, top first.
 * @throws {@link InvalidArgumentError} When `text` isn't a string.
 * @throws {@link InvalidCardError} When a card in `text` isn't written in one
 * of the notations above, or the cards aren't separated by single spaces.
 *
 * @example
 * ```ts
 * import { card, parseStack } from "deckshoes";
 *
 * parseStack("AS 10H KD"); // => [card("A", "S"), card("10", "H"), card("K", "D")]
 * parseStack("as T♥ 🃎"); // => [card("A", "S"), card("10", "H"), card("K", "D")]
 * parseStack("AS 10H")[0] === card("A", "S"); // => true
 * parseStack(""); // => []
 *
 * // One space between cards, and none around them, so trim user input.
 * parseStack("AS  10H"); // throws INVALID_CARD
 * parseStack(" AS 10H\n".trim()); // => [card("A", "S"), card("10", "H")]
 *
 * // Names have spaces, so they can't be read.
 * parseStack("Ace of Spades"); // throws INVALID_CARD
 * ```
 *
 * @since NEXT
 */
export function parseStack(text: string): CardStack {
  const problem = textProblem(text, STACK_TEXT_EXAMPLE);
  if (problem !== undefined) throw problem;
  const stack = readStackText(text, "the stack");
  if (stack instanceof InvalidCardError) throw stack;
  return stack;
}

/**
 * Reads a stack written as a compact string, as {@link parseStack} does, but
 * returns `undefined` rather than throwing when the text isn't a stack.
 *
 * It reads exactly what `parseStack` reads, and returns `undefined` for
 * anything `parseStack` throws for, including a value that isn't a string.
 *
 * @param text - The stack's text, such as `"AS 10H KD"`.
 * @returns A new frozen stack of the card objects the text names, top first,
 * or `undefined` if the text isn't a stack.
 *
 * @example
 * ```ts
 * import { card, tryParseStack } from "deckshoes";
 *
 * tryParseStack("A♠ 10♥"); // => [card("A", "S"), card("10", "H")]
 * tryParseStack("A♠ 10♥")?.[0] === card("A", "S"); // => true
 * tryParseStack("AS 11H"); // => undefined
 * tryParseStack("AS, 10H"); // => undefined
 * ```
 *
 * @since NEXT
 */
export function tryParseStack(text: string): CardStack | undefined {
  if (typeof text !== "string") return undefined;
  const stack = readStackText(text, "the stack");
  return stack instanceof InvalidCardError ? undefined : stack;
}

/**
 * Settings for {@link formatShoe}.
 *
 * @example
 * ```ts
 * import { card, formatShoe, type FormatShoeOptions, Notation } from "deckshoes";
 *
 * const options: FormatShoeOptions = { notation: Notation.SYMBOL };
 * const twoCards = { cards: [card("A", "S"), card("10", "H")], cutCard: 1, discardPile: [] };
 * formatShoe(twoCards, options); // => "A♠ 10♥ | 1"
 * ```
 *
 * @since NEXT
 */
export interface FormatShoeOptions {
  /**
   * The notation to write each card in: `Notation.SHORT`, `Notation.SYMBOL` or
   * `Notation.UNICODE_CHARACTER`. Leave it out, or pass `undefined`, for short
   * notation. A card's name has spaces in it, so `Notation.NAME` can't be
   * used.
   */
  readonly notation?: Exclude<Notation, typeof Notation.NAME> | undefined;
}

/**
 * Writes a shoe as a compact string: its cards, its cut card's position and
 * its discard pile, separated by `" | "`, such as `"AS 10H KD | 2 | 2C"`.
 *
 * - The cards are written top first, separated by single spaces, as
 *   {@link formatStack} writes a stack.
 * - The cut card's position is the number of cards still to be dealt before
 *   it's reached: `2` in the example, so the ace and the ten come out before
 *   it. It's `0` once the cut card has been reached.
 * - The discard pile is written as the cards are. When it's empty, it's left
 *   out along with the `" | "` before it, so a new shoe is written as
 *   `"AS 10H KD | 2"`.
 *
 * A shoe with no cards left is written starting with a space, as
 * `" | 0 | 2C"`, so don't trim the text. {@link parseShoe} reads it back to the
 * same shoe.
 *
 * The text gives away every card still to come, so keep it from players, as
 * you would any saved shoe.
 *
 * @param shoe - The shoe to write.
 * @param options - Settings for the text: its notation.
 * @returns The shoe's cards, cut card's position and discard pile, separated
 * by `" | "`.
 * @throws {@link InvalidArgumentError} When `shoe` isn't an object holding an
 * array of `cards` and a `cutCard` that's an integer from 0 to the number of
 * cards, or its `discardPile` is there but isn't an array, or its cards and
 * discard pile together hold more than 2³² − 1 cards. Also when `options`
 * isn't an object or is an array, its `notation` isn't `Notation.SHORT`,
 * `Notation.SYMBOL` or `Notation.UNICODE_CHARACTER`, or the shoe's compact
 * string would be longer than the runtime's longest string, as for
 * {@link formatStack}.
 * @throws {@link InvalidCardError} When a card in the shoe isn't one of the
 * cards this install's `card()` returns, such as a cloned card.
 *
 * @example
 * ```ts
 * import { burn, card, formatShoe, Notation, type Shoe } from "deckshoes";
 *
 * const threeCards: Shoe = {
 *   cards: [card("A", "S"), card("10", "H"), card("K", "D")],
 *   cutCard: 2,
 *   discardPile: [],
 * };
 * formatShoe(threeCards); // => "AS 10H KD | 2"
 *
 * // Burning a card moves it to the discard pile, and the cut card up.
 * const burned = burn(threeCards);
 * formatShoe(burned); // => "10H KD | 1 | AS"
 * formatShoe(burned, { notation: Notation.SYMBOL }); // => "10♥ K♦ | 1 | A♠"
 *
 * // A shoe with no cards left starts with a space.
 * formatShoe(burn(threeCards, 3)); // => " | 0 | AS 10H KD"
 * ```
 *
 * @since NEXT
 */
export function formatShoe(
  shoe: Shoe,
  options: FormatShoeOptions = {},
): string {
  const checked = readShoe(shoe);
  if (checked instanceof InvalidArgumentError) throw checked;
  const problem = optionsProblem(options, FORMAT_OPTIONS_EXAMPLE);
  if (problem !== undefined) throw problem;
  const write = readWriter(options);
  if (write instanceof InvalidArgumentError) throw write;
  const text = writeShoe(checked, write);
  if (typeof text !== "string") throw text;
  return text;
}

/**
 * Reads a shoe written as a compact string, and returns a new frozen shoe of
 * the card objects it names.
 *
 * The text is the shoe's cards, its cut card's position and its discard pile,
 * separated by `" | "`, such as `"AS 10H KD | 2 | 2C"`, as {@link formatShoe}
 * writes it:
 *
 * - The cards are read as {@link parseStack} reads a stack: top first,
 *   separated by single spaces, each in short or symbol notation or as its
 *   Unicode character.
 * - The cut card's position is the number of cards still to be dealt before
 *   it's reached: a whole number from 0 to the number of cards, with no sign
 *   or leading zeros.
 * - The discard pile is read as the cards are. An empty one is left out, along
 *   with the `" | "` before it, as in `"AS 10H KD | 2"`.
 *
 * Nothing else is read, so don't trim the text of a shoe with no cards left,
 * which starts with a space. To get `undefined` rather than an error, use
 * {@link tryParseShoe}.
 *
 * A random source isn't saved with a shoe, so a loaded shoe reshuffles with
 * whatever source you pass. The secure default needs nothing more. A fresh
 * {@link seededRandom} source with the original seed starts its sequence again,
 * repeating that seed's first reshuffles rather than carrying on. A new seed
 * carries the game on reproducibly, but not as the original seed would have,
 * so to make a loaded game repeatable, save the seed to use next with the
 * shoe. Anyone who knows or guesses a seed knows every shuffle it gives, so
 * choose seeds as you would any secret.
 *
 * @param text - The shoe's text, such as `"AS 10H KD | 2 | 2C"`.
 * @returns A new frozen shoe of the card objects the text names.
 * @throws {@link InvalidArgumentError} When `text` isn't a string, or isn't
 * two or three parts separated by `" | "` with a discard pile that isn't
 * empty, or the cut card's position isn't a whole number from 0 to the number
 * of cards.
 * @throws {@link InvalidCardError} When a card in `text` isn't written in one
 * of the notations {@link parseStack} reads, or cards aren't separated by
 * single spaces.
 *
 * @example
 * ```ts
 * import { card, parseShoe } from "deckshoes";
 *
 * const saved = parseShoe("AS 10H KD | 2 | 2C");
 * saved.cards; // => [card("A", "S"), card("10", "H"), card("K", "D")]
 * saved.cutCard; // => 2
 * saved.discardPile; // => [card("2", "C")]
 * saved.cards[0] === card("A", "S"); // => true
 *
 * // An empty discard pile is left out.
 * parseShoe("AS 10H KD | 2").discardPile; // => []
 * parseShoe("AS 10H KD | 2 | "); // throws INVALID_ARGUMENT
 *
 * // The cut card can't be below the bottom card.
 * parseShoe("AS 10H KD | 4"); // throws INVALID_ARGUMENT
 * ```
 *
 * @since NEXT
 */
export function parseShoe(text: string): Shoe {
  const problem = textProblem(text, SHOE_TEXT_EXAMPLE);
  if (problem !== undefined) throw problem;
  const shoe = readShoeText(text);
  if (shoe instanceof InvalidArgumentError) throw shoe;
  if (shoe instanceof InvalidCardError) throw shoe;
  return shoe;
}

/**
 * Reads a shoe written as a compact string, as {@link parseShoe} does, but
 * returns `undefined` rather than throwing when the text isn't a shoe.
 *
 * It reads exactly what `parseShoe` reads, and returns `undefined` for
 * anything `parseShoe` throws for, including a value that isn't a string.
 *
 * @param text - The shoe's text, such as `"AS 10H KD | 2 | 2C"`.
 * @returns A new frozen shoe of the card objects the text names, or
 * `undefined` if the text isn't a shoe.
 *
 * @example
 * ```ts
 * import { card, tryParseShoe } from "deckshoes";
 *
 * tryParseShoe("A♠ 10♥ | 0")?.cards; // => [card("A", "S"), card("10", "H")]
 * tryParseShoe("A♠ 10♥ | 0")?.cards[0] === card("A", "S"); // => true
 * tryParseShoe("A♠ 10♥ | 3"); // => undefined
 * tryParseShoe("A♠ 10♥|0"); // => undefined
 * ```
 *
 * @since NEXT
 */
export function tryParseShoe(text: string): Shoe | undefined {
  if (typeof text !== "string") return undefined;
  const shoe = readShoeText(text);
  return shoe instanceof InvalidArgumentError ||
    shoe instanceof InvalidCardError
    ? undefined
    : shoe;
}
