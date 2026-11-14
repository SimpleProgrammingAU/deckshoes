import type { CardStack } from "../stack.ts";

import { newDeckOrder } from "../internal/new-deck-order.ts";

/** The stack {@link euchre} returns, built on the first call. */
let deck: CardStack | undefined;

/**
 * Returns the Euchre deck: the 24 standard cards from 9 to ace, each once.
 *
 * It's a stripped deck, the standard 52 from {@link standard52} without the 2s
 * to 8s, and the cards left stay in new deck order. Face down from the top,
 * that's hearts and clubs from ace to king, then diamonds and spades from king
 * to ace, with no 2s to 8s. So the top card, `[0]`, is the ace of hearts, with
 * the 9 of hearts under it, and the bottom card, `[23]`, is the ace of spades:
 *
 * A♥ 9♥ 10♥ … K♥, A♣ 9♣ … K♣, K♦ Q♦ … 9♦ A♦, K♠ Q♠ … 9♠ A♠
 *
 * Every call returns the same frozen stack, and its cards are the ones
 * {@link deckshoes!card} returns, so they compare with `===`. The order won't
 * change in any 1.x release, because every seeded shuffle of the deck starts
 * from it.
 *
 * @returns The 24 cards from 9 to ace, top first.
 *
 * @example
 * ```ts
 * import { card, seededRandom, shuffle } from "deckshoes";
 * import { euchre } from "deckshoes/presets";
 *
 * const deck = euchre();
 * deck.length; // => 24
 * deck[0] === card("A", "H"); // => true
 * deck[1] === card("9", "H"); // => true
 * deck[23] === card("A", "S"); // => true
 *
 * // The same frozen stack every time.
 * euchre() === deck; // => true
 * Object.isFrozen(deck); // => true
 *
 * // Shuffling gives a new stack and leaves the deck alone.
 * const shuffled = shuffle(deck, { random: seededRandom(42) });
 * shuffled[0] === card("9", "H"); // => true
 * deck[0] === card("A", "H"); // => true
 * ```
 *
 * @since NEXT
 */
export function euchre(): CardStack {
  deck ??= newDeckOrder(["A", "9", "10", "J", "Q", "K"]);
  return deck;
}
