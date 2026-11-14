import type { Rank } from "../card.ts";
import type { CardStack } from "../stack.ts";

import { card } from "../card.ts";

/** Builds a frozen stack of the standard cards of `ranks`, given from ace to king, in new deck order: hearts and clubs in that order, then diamonds and spades in reverse. */
export function newDeckOrder(ranks: readonly Rank[]): CardStack {
  const reversed = ranks.toReversed();
  return Object.freeze([
    ...ranks.map((rank) => card(rank, "H")),
    ...ranks.map((rank) => card(rank, "C")),
    ...reversed.map((rank) => card(rank, "D")),
    ...reversed.map((rank) => card(rank, "S")),
  ]);
}
