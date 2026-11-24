import type { Card, Rank, Suit } from "../card.ts";
import type { CardStack } from "../stack.ts";

import { InvalidCardError } from "../errors.ts";
import { CARD_TABLE } from "./card-table.ts";
import { unknownRank, unknownSuit } from "./checks.ts";
import { display } from "./display.ts";

/** Loads a card from its JSON fields, reading each once, so a getter can't give the check one value and the card another, or returns the error for one that isn't a card; `where` says where it was, such as " at position 3 of the stack". */
export function loadCard(
  value: unknown,
  where: string,
): Card | InvalidCardError {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return new InvalidCardError(
      `Invalid card ${display(value)}${where}: expected an object holding a rank, suit and color, as JSON.stringify writes a card`,
    );
  }
  const {
    color,
    rank,
    suit,
  }: Readonly<{ color?: unknown; rank?: unknown; suit?: unknown }> = value;
  const bySuit = CARD_TABLE.get(rank as Rank);
  if (bySuit === undefined) return unknownRank(rank, where);
  const found = bySuit.get(suit as Suit);
  if (found === undefined) return unknownSuit(suit, where);
  return found.color === color
    ? found
    : new InvalidCardError(
        `Invalid colour ${display(color)}${where}: expected ${display(found.color)}, the colour of suit ${display(found.suit)}`,
      );
}

/** Loads each card of a stack, read by index, into a new frozen stack, or returns the error for the first that isn't a card; `name` names the stack in the error, such as "the discard pile". */
export function loadStack(
  stack: CardStack<unknown>,
  name: string,
): CardStack | InvalidCardError {
  const size = stack.length;
  // eslint-disable-next-line unicorn/no-new-array -- sized up front, as copyStack does
  const loaded = new Array<Card>(size);
  for (let i = 0; i < size; i++) {
    const found = loadCard(stack[i], ` at position ${String(i)} of ${name}`);
    if (found instanceof InvalidCardError) return found;
    loaded[i] = found;
  }
  return Object.freeze(loaded);
}
