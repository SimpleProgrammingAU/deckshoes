import type { Rank } from "../card.ts";
import type { CardStack } from "../stack.ts";

import { InvalidCardError } from "../errors.ts";
import { rankEntry } from "./rank-entry.ts";
import { suitEntry } from "./suit-entry.ts";

/** Each standard rank's high-card points: 4 for an ace, 3 for a king, 2 for a queen, 1 for a jack and 0 for the rest. Built here rather than with `lookup()`, as `VALUES` in src/internal/blackjack.ts is, to keep `lookup()` out of the chunk shared between entry points. */
const POINTS: ReadonlyMap<unknown, number> = /* @__PURE__ */ new Map(
  /* @__PURE__ */ Object.entries({
    A: 4,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
    "6": 0,
    "7": 0,
    "8": 0,
    "9": 0,
    "10": 0,
    J: 1,
    Q: 2,
    K: 3,
  } satisfies Record<Rank, number>),
);

/** Reads each card of a hand once, by index, and returns its high-card points; or the error for the first card without a standard rank. */
export function readPoints(hand: CardStack): InvalidCardError | number {
  let points = 0;
  const size = hand.length;
  for (let i = 0; i < size; i++) {
    const entry = rankEntry(hand[i], POINTS, i, "the hand");
    if (entry instanceof InvalidCardError) return entry;
    points += entry;
  }
  return points;
}

/** Reads each card of a hand once, by index, and returns its suit lengths, spades first; or the error for the first card without a standard rank or suit. */
export function readSuitLengths(hand: CardStack): InvalidCardError | number[] {
  const lengths = [0, 0, 0, 0];
  const size = hand.length;
  for (let i = 0; i < size; i++) {
    const card: unknown = hand[i];
    const entry = rankEntry(card, POINTS, i, "the hand");
    if (entry instanceof InvalidCardError) return entry;
    const suit = suitEntry(card, i, "the hand");
    if (suit instanceof InvalidCardError) return suit;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- suitEntry gives 0 to 3, and there are four lengths
    lengths[suit]! += 1;
  }
  return lengths;
}
