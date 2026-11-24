import type { Card } from "../card.ts";
import type { Shoe } from "../shoe.ts";
import type { CardStack } from "../stack.ts";

import { isCard } from "../card.ts";
import { InvalidArgumentError, InvalidCardError } from "../errors.ts";
import { Notation } from "../notation.ts";
import { countProblem } from "./checks.ts";
import { display } from "./display.ts";
import { readCard, WRITERS } from "./notation-table.ts";

/** What separates the parts of a shoe's compact string: its cards, its cut card's position and its discard pile. */
const SHOE_PART_SEPARATOR = " | ";

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

/** What a compact string is written for: the stack or shoe passed in, and the name the error gives it when its compact string would be too long. */
export interface TextOwner {
  readonly name: string;
  readonly value: unknown;
}

/** Returns the error for a stack or shoe whose compact string would be longer than the runtime's longest string. The limit differs between runtimes and nothing reports it, so it's found by the `RangeError` a concatenation throws. */
function tooLong({ name, value }: TextOwner): InvalidArgumentError {
  return new InvalidArgumentError(
    `Invalid ${name} ${display(value)}: its compact string would be longer than this runtime's longest string`,
  );
}

/** Writes each card of a stack, read by index, with `write`, separated by single spaces, or returns the error for the first that isn't one of this install's cards, or for text longer than the runtime's longest string; `name` names the stack in a card's error, such as "the discard pile", and `owner` is what a too-long error names. */
export function writeStack(
  stack: CardStack<unknown>,
  write: (card: Card) => string,
  name: string,
  owner: TextOwner,
): InvalidArgumentError | InvalidCardError | string {
  let text = "";
  const size = stack.length;
  for (let i = 0; i < size; i++) {
    const card = stack[i];
    if (!isCard(card)) {
      return new InvalidCardError(
        `Invalid card ${display(card)} at position ${String(i)} of ${name}: expected one of the cards card() returns`,
      );
    }
    const piece = write(card);
    // Only the concatenation is tried, so an error from reading the stack,
    // such as a getter's, isn't mistaken for the text being too long.
    try {
      text += i === 0 ? piece : ` ${piece}`;
    } catch {
      return tooLong(owner);
    }
  }
  return text;
}

/** Writes a shoe that `readShoe` has read as its compact string: its cards, its cut card's position and, unless it's empty, its discard pile, separated by {@link SHOE_PART_SEPARATOR}. Returns the error for a card that isn't one of this install's cards, or for text longer than the runtime's longest string. */
export function writeShoe(
  shoe: Shoe,
  write: (card: Card) => string,
): InvalidArgumentError | InvalidCardError | string {
  const owner = { name: "shoe", value: shoe };
  const cardText = writeStack(shoe.cards, write, "the shoe's cards", owner);
  if (typeof cardText !== "string") return cardText;
  const pileText = writeStack(
    shoe.discardPile,
    write,
    "the discard pile",
    owner,
  );
  if (typeof pileText !== "string") return pileText;
  const position = String(shoe.cutCard);
  const hasPile = shoe.discardPile.length > 0;
  // Each part can fit while the whole doesn't. Only the concatenation is
  // tried, as in writeStack.
  try {
    const text = `${cardText}${SHOE_PART_SEPARATOR}${position}`;
    return hasPile ? `${text}${SHOE_PART_SEPARATOR}${pileText}` : text;
  } catch {
    return tooLong(owner);
  }
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
      return new InvalidCardError(pieceProblem(piece, where));
    }
    cards[i] = found;
  }
  return Object.freeze(cards);
}

/** Says what's wrong with a piece of a compact string, between spaces, that isn't a card; `where` says where it was, such as "at position 3 of the stack". */
function pieceProblem(piece: string, where: string): string {
  if (piece === "") {
    return `Extra space ${where}: separate cards with one space, with none around them`;
  }
  // A space such as U+00A0, which text copied from a web page can hold, shows
  // in the message as an ordinary one, so the message has to name it.
  return /\s/u.test(piece)
    ? `Unknown card ${display(piece)} ${where}: separate cards with an ordinary space (U+0020), not another kind of space`
    : `Unknown card ${display(piece)} ${where}: expected a card such as "AS", "10H", "A♠" or "🂡"`;
}

/** How a shoe's compact string writes its cut card's position: a whole number with no sign or leading zeros. */
const POSITION = /^(?:0|[1-9]\d*)$/u;

/** Reads a shoe written as a compact string, its cards, cut card's position and discard pile separated by {@link SHOE_PART_SEPARATOR}, with an empty pile left out, into a new frozen shoe, or returns the error for text that isn't one. */
export function readShoeText(
  text: string,
): InvalidArgumentError | InvalidCardError | Shoe {
  const parts = text.split(SHOE_PART_SEPARATOR);
  if (parts.length < 2 || parts.length > 3 || parts[2] === "") {
    // The text can be too long to show, so say what was found in it.
    const found =
      parts.length === 3
        ? "an empty discard pile"
        : `${String(parts.length)} ${parts.length === 1 ? "part" : "parts"}`;
    return new InvalidArgumentError(
      `Invalid shoe text ${display(text)}: expected the shoe's cards, its cut card's position and, if it isn't empty, its discard pile, separated by ${JSON.stringify(SHOE_PART_SEPARATOR)}, such as "AS 10H KD | 2 | 2C", but found ${found}`,
    );
  }
  const [cardText = "", position = "", pileText = ""] = parts;
  if (!POSITION.test(position)) {
    return new InvalidArgumentError(
      `Invalid cut card ${display(position)}: expected its position as a whole number, such as "2"`,
    );
  }
  const cards = readStackText(cardText, "the shoe's cards");
  if (cards instanceof InvalidCardError) return cards;
  const cutCard = Number(position);
  const problem = countProblem(cutCard, "cut card", 0, cards.length);
  if (problem !== undefined) return problem;
  const discardPile = readStackText(pileText, "the discard pile");
  return discardPile instanceof InvalidCardError
    ? discardPile
    : Object.freeze({ cards, cutCard, discardPile });
}
