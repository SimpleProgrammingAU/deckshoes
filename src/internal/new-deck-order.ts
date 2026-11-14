import type { Rank } from "../card.ts";
import type { CardStack } from "../stack.ts";

import { card } from "../card.ts";
import { RANKS } from "./card-table.ts";

/** Builds a frozen stack of the standard 52 without the cards of the ranks in `without`, in new deck order: hearts and clubs from ace to king, then diamonds and spades from king to ace. */
export function newDeckOrder(without: readonly Rank[] = []): CardStack {
  const aceToKing = RANKS.filter((rank) => !without.includes(rank));
  const kingToAce = aceToKing.toReversed();
  return Object.freeze([
    ...aceToKing.map((rank) => card(rank, "H")),
    ...aceToKing.map((rank) => card(rank, "C")),
    ...kingToAce.map((rank) => card(rank, "D")),
    ...kingToAce.map((rank) => card(rank, "S")),
  ]);
}
