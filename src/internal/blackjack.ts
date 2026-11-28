import type { Rank } from "../card.ts";
import type { CardStack } from "../stack.ts";

import { InvalidArgumentError, InvalidCardError } from "../errors.ts";
import { display } from "./display.ts";
import { rankEntry } from "./rank-entry.ts";

/** Each standard rank's value in blackjack, with an ace as 1, the only rank worth 1. Built here rather than with `lookup()`, which only the root entry point uses: sharing it would move it into the shared chunk, and change the root's measured size. */
const VALUES: ReadonlyMap<unknown, number> = /* @__PURE__ */ new Map(
  /* @__PURE__ */ Object.entries({
    A: 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 10,
    Q: 10,
    K: 10,
  } satisfies Record<Rank, number>),
);

/** Each standard rank's tag in Hi-Lo, built as {@link VALUES} is. */
export const HI_LO: ReadonlyMap<unknown, number> = /* @__PURE__ */ new Map(
  /* @__PURE__ */ Object.entries({
    A: -1,
    "2": 1,
    "3": 1,
    "4": 1,
    "5": 1,
    "6": 1,
    "7": 0,
    "8": 0,
    "9": 0,
    "10": -1,
    J: -1,
    Q: -1,
    K: -1,
  } satisfies Record<Rank, number>),
);

/** What reading a hand finds: its total, whether the total counts an ace as 11, and how many cards it holds. */
interface HandReading {
  readonly size: number;
  readonly soft: boolean;
  readonly total: number;
}

/** Reads each card of a hand once, by index, and returns its total, whether it's soft and its size; or the error for the first card without a standard rank. */
export function readHand(hand: CardStack): HandReading | InvalidCardError {
  let sum = 0;
  let ace = false;
  const size = hand.length;
  for (let i = 0; i < size; i++) {
    const value = rankEntry(hand[i], VALUES, i, "the hand");
    if (value instanceof InvalidCardError) return value;
    sum += value;
    if (value === 1) ace = true;
  }
  // One ace at most can count 11: two would make 22.
  const soft = ace && sum <= 11;
  return { size, soft, total: soft ? sum + 10 : sum };
}

/** Options with a `tag` option, shown in the error for options that aren't an object. */
export const TAG_OPTIONS_EXAMPLE = "{ tag: (card) => 1 }";

/** Returns the error for a `tag` option that's neither a function nor `undefined`, or `undefined` for one that is. */
export function tagProblem(value: unknown): InvalidArgumentError | undefined {
  return value === undefined || typeof value === "function"
    ? undefined
    : new InvalidArgumentError(
        `Invalid tag option ${display(value)}: expected a function that returns a card's tag`,
      );
}

/** Returns the error for a tag that isn't a finite number, given for the card at `position`, or `undefined` for one that is. */
export function tagResultProblem(
  value: unknown,
  position: number,
): InvalidArgumentError | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? undefined
    : new InvalidArgumentError(
        `Invalid tag ${display(value)} for the card at position ${String(position)}: expected a finite number`,
      );
}
