import type { CardStack } from "../stack.ts";

import { newDeckOrder } from "../internal/new-deck-order.ts";

/** The stack {@link piquet} returns, built on the first call. */
let deck: CardStack | undefined;

/**
 * Returns the Piquet deck: the 32 standard cards from 7 to ace, each once.
 *
 * It's a stripped deck, the standard 52 from {@link standard52} without the 2s
 * to 6s, and the cards left stay in new deck order. Face down from the top,
 * that's hearts and clubs from ace to king, then diamonds and spades from king
 * to ace, with no 2s to 6s. So the top card, `[0]`, is the ace of hearts, with
 * the 7 of hearts under it, and the bottom card, `[31]`, is the ace of spades:
 *
 * A♥ 7♥ 8♥ … K♥, A♣ 7♣ … K♣, K♦ Q♦ … 7♦ A♦, K♠ Q♠ … 7♠ A♠
 *
 * Every call returns the same frozen stack, and its cards are the ones
 * `card()` returns, so they compare with `===`. The order won't change in any
 * 1.x release, because every seeded shuffle of the deck starts from it.
 *
 * @returns The 32 cards from 7 to ace, top first.
 *
 * @example
 * ```ts
 * import { card, seededRandom, shuffle } from "deckshoes";
 * import { piquet } from "deckshoes/presets";
 *
 * const deck = piquet();
 * deck.length; // => 32
 * deck[0] === card("A", "H"); // => true
 * deck[1] === card("7", "H"); // => true
 * deck[31] === card("A", "S"); // => true
 *
 * // The same frozen stack every time.
 * piquet() === deck; // => true
 * Object.isFrozen(deck); // => true
 *
 * // Shuffling gives a new stack and leaves the deck alone.
 * const shuffled = shuffle(deck, { random: seededRandom(42) });
 * shuffled[0] === card("K", "H"); // => true
 * deck[0] === card("A", "H"); // => true
 * ```
 *
 * @since NEXT
 */
export function piquet(): CardStack {
  deck ??= newDeckOrder(["2", "3", "4", "5", "6"]);
  return deck;
}
