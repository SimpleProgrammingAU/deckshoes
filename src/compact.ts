import type { Notation } from "./notation.ts";
import type { CardStack } from "./stack.ts";

import { InvalidArgumentError, InvalidCardError } from "./errors.ts";
import { optionsProblem, stackProblem } from "./internal/checks.ts";
import {
  FORMAT_OPTIONS_EXAMPLE,
  readStackText,
  readWriter,
  textProblem,
  writeStack,
} from "./internal/compact.ts";

/** The text `parseStack` shows as an example when it isn't given a string. */
const STACK_TEXT_EXAMPLE = "AS 10H KD";

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
 * isn't an object or is an array, or its `notation` isn't `Notation.SHORT`,
 * `Notation.SYMBOL` or `Notation.UNICODE_CHARACTER`.
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
  const text = writeStack(stack, write, "the stack");
  if (text instanceof InvalidCardError) throw text;
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
