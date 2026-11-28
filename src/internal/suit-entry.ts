import type { Suit } from "../card.ts";

import { InvalidCardError } from "../errors.ts";
import { display } from "./display.ts";

/** Each standard suit's index, from 0 for spades to 3 for clubs. Built here rather than with `lookup()`, as `VALUES` in src/internal/blackjack.ts is, to keep `lookup()` out of the chunk shared between entry points. */
const SUITS: ReadonlyMap<unknown, number> = /* @__PURE__ */ new Map(
  /* @__PURE__ */ Object.entries({ S: 0, H: 1, D: 2, C: 3 } satisfies Record<
    Suit,
    number
  >),
);

/** Looks up a card's suit, read once, as `rankEntry` looks up its rank; returns the suit's index, from 0 for spades to 3 for clubs, or the error for a card without a standard suit at `position` of the stack `stackName` names. Only called once `rankEntry` has found the card's rank, so it's an object. */
export function suitEntry(
  card: unknown,
  position: number,
  stackName: string,
): InvalidCardError | number {
  const suit = (card as Partial<Record<"suit", unknown>>).suit;
  return (
    SUITS.get(suit) ??
    new InvalidCardError(
      `Invalid card with suit ${display(suit)} at position ${String(position)} of ${stackName}: expected a card with suit "S", "H", "D" or "C"`,
    )
  );
}
