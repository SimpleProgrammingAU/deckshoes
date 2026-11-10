import type { CardStack } from "./stack.ts";

import { InvalidArgumentError } from "./errors.ts";
import { cardsProblem, stackProblem } from "./internal/checks.ts";
import { display } from "./internal/display.ts";
import { removeTopmost } from "./internal/stack.ts";

/**
 * Removes particular cards from a stack, wherever they are: the topmost copy
 * of each.
 *
 * Each entry in `cards` removes one copy, so removing two aces of spades from
 * two decks removes both, and listing a card once removes only the topmost of
 * its copies. A card in `cards` matches the same card (`===`) in the stack,
 * as with `includes`.
 *
 * Every card has to be there. If an entry in `cards` has no copy left in the
 * stack, it throws before removing anything, naming the entry by its index in
 * `cards`. To remove only the cards that are there, check with
 * {@link contains} first, or use `filter`.
 *
 * Neither the stack nor `cards` is changed, frozen or not, and the result is a
 * new frozen array, even when `cards` is empty. Any stack works, including one
 * with copies or with cards that aren't standard cards. `cards` is always an
 * array, even for one card. The cards removed aren't returned: copies are
 * interchangeable, so they're `cards` itself.
 *
 * @typeParam C - The type of card in the stack.
 * @param stack - The stack to remove the cards from, top first.
 * @param cards - The cards to remove, one copy for each entry.
 * @returns A new frozen stack holding the cards left, in their order.
 * @throws {@link InvalidArgumentError} When `stack` or `cards` isn't an array,
 * or an entry in `cards` has no copy left in the stack.
 *
 * @example
 * ```ts
 * import { card, count, remove } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * const hand = [card("A", "S"), card("K", "H"), card("A", "S"), card("10", "D")];
 * remove(hand, [card("10", "D")]); // => [card("A", "S"), card("K", "H"), card("A", "S")]
 *
 * // The topmost copy goes first.
 * remove(hand, [card("A", "S")]); // => [card("K", "H"), card("A", "S"), card("10", "D")]
 *
 * // Each entry removes one copy.
 * const twoDecks = [...standard52(), ...standard52()];
 * const left = remove(twoDecks, [card("A", "S"), card("A", "S")]);
 * left.length; // => 102
 * count(left, (each) => each === card("A", "S")); // => 0
 *
 * // Every card has to be there.
 * remove(hand, [card("Q", "C")]); // throws INVALID_ARGUMENT
 * remove(hand, [card("K", "H"), card("K", "H")]); // throws INVALID_ARGUMENT
 * ```
 *
 * @since NEXT
 */
export function remove<C>(
  stack: CardStack<C>,
  cards: CardStack<C>,
): CardStack<C> {
  const problem = stackProblem(stack) ?? cardsProblem(cards);
  if (problem !== undefined) throw problem;
  const { left, missing } = removeTopmost(stack, cards);
  if (missing !== -1) {
    throw new InvalidArgumentError(
      `Can't remove cards[${String(missing)}]: the stack has no copy of it left`,
    );
  }
  return Object.freeze(left);
}

/**
 * Tells whether a stack holds particular cards, counting copies: one for each
 * entry in `cards`.
 *
 * It's `true` exactly when {@link remove} would remove `cards` without
 * throwing, so a card listed twice needs two copies. A card in `cards` matches
 * the same card (`===`) in the stack, as with `includes`. Every stack holds no
 * cards at all, so an empty `cards` gives `true`. For a single card,
 * `stack.includes(card)` does the same.
 *
 * Neither the stack nor `cards` is changed, frozen or not. Any stack works,
 * including one with copies or with cards that aren't standard cards. `cards`
 * is always an array, even for one card.
 *
 * @typeParam C - The type of card in the stack.
 * @param stack - The stack to look in, top first.
 * @param cards - The cards to look for, one copy for each entry.
 * @returns Whether the stack holds a copy for every entry in `cards`.
 * @throws {@link InvalidArgumentError} When `stack` or `cards` isn't an array.
 *
 * @example
 * ```ts
 * import { card, contains } from "deckshoes";
 *
 * const jack = card("J", "D");
 * const queen = card("Q", "S");
 * const hand = [jack, queen, card("A", "H"), jack, queen];
 *
 * // A double pinochle: both jacks of diamonds and both queens of spades.
 * contains(hand, [jack, jack, queen, queen]); // => true
 *
 * // A card listed twice needs two copies.
 * contains(hand, [card("A", "H")]); // => true
 * contains(hand, [card("A", "H"), card("A", "H")]); // => false
 *
 * contains(hand, []); // => true
 * ```
 *
 * @since NEXT
 */
export function contains<C>(stack: CardStack<C>, cards: CardStack<C>): boolean {
  const problem = stackProblem(stack) ?? cardsProblem(cards);
  if (problem !== undefined) throw problem;
  return removeTopmost(stack, cards).missing === -1;
}

/**
 * Counts the cards in a stack that `match` accepts.
 *
 * `match` is called once for each card the stack held when `count` was called,
 * top first, with the card alone, and the card counts when it returns a truthy
 * value, as with `filter`. Whatever `match` throws is passed on unchanged. To
 * count the copies of a card, match it with `===`.
 *
 * The stack is left untouched, frozen or not. Any stack works, including one
 * with copies or with cards that aren't standard cards.
 *
 * @typeParam C - The type of card in the stack.
 * @param stack - The stack to count in, top first.
 * @param match - A function that takes a card and returns whether to count
 * it: any truthy value counts.
 * @returns How many cards `match` accepted, from 0 to the stack's size.
 * @throws {@link InvalidArgumentError} When `stack` isn't an array, or `match`
 * isn't a function.
 *
 * @example
 * ```ts
 * import { card, count } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * const hand = [card("A", "S"), card("K", "H"), card("10", "H")];
 * count(hand, ({ suit }) => suit === "H"); // => 2
 * count(standard52(), ({ rank }) => rank === "A"); // => 4
 *
 * // The copies of a card.
 * const twoDecks = [...standard52(), ...standard52()];
 * count(twoDecks, (each) => each === card("Q", "S")); // => 2
 * ```
 *
 * @since NEXT
 */
export function count<C>(
  stack: CardStack<C>,
  match: (card: C) => unknown,
): number {
  const problem = stackProblem(stack);
  if (problem !== undefined) throw problem;
  const given: unknown = match;
  if (typeof given !== "function") {
    throw new InvalidArgumentError(
      `Invalid match ${display(given)}: expected a function that takes a card and returns whether to count it`,
    );
  }

  // The size is read once, as filter does, so a match that changes the
  // caller's array can't make the count run on or skip cards.
  const size = stack.length;
  let matched = 0;
  for (let i = 0; i < size; i++) {
    if (match(stack[i] as C)) matched += 1;
  }
  return matched;
}
