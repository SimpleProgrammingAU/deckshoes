import type { Card } from "./card.ts";

/**
 * A stack of cards: a readonly array whose first element is the top.
 *
 * `stack[0]` is the next card drawn, and `stack.length` is how many cards
 * there are. Decks, hands and piles are all stacks, and every stack operation
 * works on all of them. Operations accept any array of cards, frozen or not,
 * because they never change their input, and every stack they return is
 * frozen.
 *
 * Stack operations are generic over the card type, so a stack can hold copies,
 * and cards that aren't standard cards.
 *
 * @typeParam C - The type of card the stack holds: a standard {@link Card}
 * unless you say otherwise.
 *
 * @example
 * ```ts
 * import { card, type CardStack, seededRandom, shuffle } from "deckshoes";
 *
 * const hand: CardStack = [card("A", "S"), card("10", "H")];
 * hand[0]; // => { rank: "A", suit: "S", color: "black" }
 * hand.length; // => 2
 *
 * // Stacks that operations return are frozen.
 * const shuffled = shuffle(hand, { random: seededRandom(42) });
 * Object.isFrozen(shuffled); // => true
 * ```
 *
 * @since NEXT
 */
export type CardStack<C = Card> = readonly C[];
