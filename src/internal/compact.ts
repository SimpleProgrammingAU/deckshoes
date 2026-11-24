import type { Card } from "../card.ts";
import type { CardStack } from "../stack.ts";

import { isCard } from "../card.ts";
import { InvalidArgumentError, InvalidCardError } from "../errors.ts";
import { Notation } from "../notation.ts";
import { display } from "./display.ts";
import { readCard, WRITERS } from "./notation-table.ts";

/** The options `formatStack` and `formatShoe` show as an example when theirs aren't an object. */
export const FORMAT_OPTIONS_EXAMPLE = "{ notation: Notation.SYMBOL }";

/** Reads the notation from the options of `formatStack` or `formatShoe`, which must already be an object, once and as `unknown`, and returns how it writes a card, or the error for a notation a compact string can't use. */
export function readWriter(
  options: Readonly<{ notation?: unknown }>,
): InvalidArgumentError | ((card: Card) => string) {
  const { notation = Notation.SHORT } = options;
  return (
    WRITERS.get(notation) ??
    new InvalidArgumentError(
      `Invalid notation option ${display(notation)}: expected Notation.SHORT, Notation.SYMBOL or Notation.UNICODE_CHARACTER ("unicode character"), since a compact string can't use names, which have spaces`,
    )
  );
}

/** Writes each card of a stack, read by index, with `write`, separated by single spaces, or returns the error for the first that isn't one of this install's cards; `name` names the stack in the error, such as "the discard pile". */
export function writeStack(
  stack: CardStack<unknown>,
  write: (card: Card) => string,
  name: string,
): InvalidCardError | string {
  let text = "";
  const size = stack.length;
  for (let i = 0; i < size; i++) {
    const card = stack[i];
    if (!isCard(card)) {
      return new InvalidCardError(
        `Invalid card ${display(card)} at position ${String(i)} of ${name}: expected one of the cards card() returns`,
      );
    }
    text += i === 0 ? write(card) : ` ${write(card)}`;
  }
  return text;
}

/** Returns the error for compact-string text that isn't a string, or `undefined` for text that is; `example` shows valid text in the message. */
export function textProblem(
  value: unknown,
  example: string,
): InvalidArgumentError | undefined {
  return typeof value === "string"
    ? undefined
    : new InvalidArgumentError(
        `Invalid text ${display(value)}: expected a string, such as ${JSON.stringify(example)}`,
      );
}

/** Reads cards written as a compact string into a new frozen stack, or returns the error for the first piece between spaces that isn't a card; `name` names the stack in the error, such as "the stack". An empty string is an empty stack. */
export function readStackText(
  text: string,
  name: string,
): CardStack | InvalidCardError {
  if (text === "") return Object.freeze([]);
  const pieces = text.split(" ");
  // eslint-disable-next-line unicorn/no-new-array -- sized up front, as copyStack does
  const cards = new Array<Card>(pieces.length);
  for (const [i, piece] of pieces.entries()) {
    const found = readCard(piece);
    if (found === undefined) {
      const where = `at position ${String(i)} of ${name}`;
      return new InvalidCardError(
        piece === ""
          ? `Extra space ${where}: separate cards with one space, with none around them`
          : `Unknown card ${display(piece)} ${where}: expected a card such as "AS", "10H", "A♠" or "🂡"`,
      );
    }
    cards[i] = found;
  }
  return Object.freeze(cards);
}
