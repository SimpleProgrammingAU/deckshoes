import type { CardStack } from "../stack.ts";

import { card } from "../card.ts";
import { RANKS } from "../internal/card-table.ts";

/** The stack {@link standard52} returns, built on the first call. */
let deck: CardStack | undefined;

/**
 * Returns the standard 52, each standard card once, in new deck order: the
 * order a new deck comes out of the box in.
 *
 * Face down from the top, that's hearts and clubs from ace to king, then
 * diamonds and spades from king to ace. So the top card, `[0]`, is the ace of
 * hearts, and the bottom card, `[51]`, is the ace of spades:
 *
 * A♥ 2♥ … K♥, A♣ 2♣ … K♣, K♦ Q♦ … A♦, K♠ Q♠ … A♠
 *
 * Every call returns the same frozen stack, and its cards are the ones
 * {@link card} returns, so they compare with `===`. The order won't change in
 * any 1.x release, because every seeded shuffle of the deck starts from it.
 *
 * @returns The 52 standard cards, top first.
 *
 * @example
 * ```ts
 * import { card, seededRandom, shuffle } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * const deck = standard52();
 * deck.length; // => 52
 * deck[0] === card("A", "H"); // => true
 * deck[13] === card("A", "C"); // => true
 * deck[26] === card("K", "D"); // => true
 * deck[51] === card("A", "S"); // => true
 *
 * // The same frozen stack every time.
 * standard52() === deck; // => true
 * Object.isFrozen(deck); // => true
 *
 * // Shuffling gives a new stack and leaves the deck alone.
 * const shuffled = shuffle(deck, { random: seededRandom(42) });
 * shuffled[0] === card("7", "H"); // => true
 * deck[0] === card("A", "H"); // => true
 * ```
 *
 * @since 1.0.0
 */
export function standard52(): CardStack {
  if (deck === undefined) {
    const kingToAce = RANKS.toReversed();
    deck = Object.freeze([
      ...RANKS.map((rank) => card(rank, "H")),
      ...RANKS.map((rank) => card(rank, "C")),
      ...kingToAce.map((rank) => card(rank, "D")),
      ...kingToAce.map((rank) => card(rank, "S")),
    ]);
  }
  return deck;
}
