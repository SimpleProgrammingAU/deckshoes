import type { Card } from "./card.ts";
import type { CardStack } from "./stack.ts";

import { countProblem, shortfall, stackProblem } from "./internal/checks.ts";
import { copyStack } from "./internal/stack.ts";

/**
 * What {@link draw} and {@link drawBottom} give: the cards drawn and the
 * remainder of the stack, as a frozen object holding two new frozen stacks.
 *
 * @typeParam C - The type of card in the stack: a standard {@link Card} unless
 * you say otherwise.
 *
 * @example
 * ```ts
 * import { card, draw, type DrawResult } from "deckshoes";
 *
 * const hand = [card("A", "S"), card("K", "H"), card("10", "D")];
 * const result: DrawResult = draw(hand, 2);
 * result.cards; // => [card("A", "S"), card("K", "H")]
 * result.remainder; // => [card("10", "D")]
 * Object.isFrozen(result); // => true
 * ```
 *
 * @since 1.0.0
 */
export interface DrawResult<C = Card> {
  /** The cards drawn, in the order they had in the stack, top first. */
  readonly cards: CardStack<C>;

  /** The stack left after the draw, top first. */
  readonly remainder: CardStack<C>;
}

/**
 * Draws cards from the top of a stack, returning them and the remainder.
 *
 * The stack is left untouched, frozen or not. Both stacks in the result are new
 * and frozen, even when one of them is empty or holds every card. Any stack
 * works, including one with copies or with cards that aren't standard cards.
 *
 * Leave `count` out, or pass `undefined`, to draw one card. `cards` is a stack
 * either way, so it holds that one card rather than being the card.
 *
 * @typeParam C - The type of card in the stack.
 * @param stack - The stack to draw from, top first.
 * @param count - How many cards to draw, an integer of 0 or more: 1 if it's
 * left out or `undefined`.
 * @returns A frozen object holding the `cards` drawn and the `remainder`, each
 * a new frozen stack, top first.
 * @throws {@link InvalidArgumentError} When `stack` isn't an array, or `count`
 * isn't an integer of 0 or more.
 * @throws {@link InsufficientCardsError} When `count` is more than the stack
 * holds.
 *
 * @example
 * ```ts
 * import { card, draw } from "deckshoes";
 *
 * const hand = [card("A", "S"), card("K", "H"), card("10", "D")];
 * const { cards, remainder } = draw(hand, 2);
 * cards; // => [card("A", "S"), card("K", "H")]
 * remainder; // => [card("10", "D")]
 *
 * // Leave the count out to draw one card.
 * draw(hand).cards; // => [card("A", "S")]
 *
 * // The stack is left alone.
 * hand.length; // => 3
 *
 * draw(hand, 4); // throws INSUFFICIENT_CARDS
 * draw(hand, -1); // throws INVALID_ARGUMENT
 * ```
 *
 * @since 1.0.0
 */
export function draw<C>(stack: CardStack<C>, count = 1): DrawResult<C> {
  const problem =
    stackProblem(stack) ?? countProblem(count) ?? shortfall(count, stack);
  if (problem !== undefined) throw problem;
  return Object.freeze({
    cards: Object.freeze(copyStack(stack, 0, count)),
    remainder: Object.freeze(copyStack(stack, count)),
  });
}

/**
 * Draws cards from the bottom of a stack, returning them and the remainder.
 *
 * The cards stay in stack order, top first, so the card that was on the bottom
 * comes last. Drawing them one at a time gives the opposite order, with the
 * bottom card first.
 *
 * The stack is left untouched, frozen or not. Both stacks in the result are new
 * and frozen, even when one of them is empty or holds every card. Any stack
 * works, including one with copies or with cards that aren't standard cards.
 *
 * Leave `count` out, or pass `undefined`, to draw one card. `cards` is a stack
 * either way, so it holds that one card rather than being the card.
 *
 * @typeParam C - The type of card in the stack.
 * @param stack - The stack to draw from, top first.
 * @param count - How many cards to draw, an integer of 0 or more: 1 if it's
 * left out or `undefined`.
 * @returns A frozen object holding the `cards` drawn and the `remainder`, each
 * a new frozen stack, top first.
 * @throws {@link InvalidArgumentError} When `stack` isn't an array, or `count`
 * isn't an integer of 0 or more.
 * @throws {@link InsufficientCardsError} When `count` is more than the stack
 * holds.
 *
 * @example
 * ```ts
 * import { card, drawBottom } from "deckshoes";
 *
 * const hand = [card("A", "S"), card("K", "H"), card("10", "D")];
 * const { cards, remainder } = drawBottom(hand, 2);
 * cards; // => [card("K", "H"), card("10", "D")]
 * remainder; // => [card("A", "S")]
 *
 * // Leave the count out to draw one card. One at a time, the bottom card
 * // comes first.
 * const first = drawBottom(hand);
 * first.cards; // => [card("10", "D")]
 * drawBottom(first.remainder).cards; // => [card("K", "H")]
 *
 * drawBottom(hand, 4); // throws INSUFFICIENT_CARDS
 * drawBottom(hand, -1); // throws INVALID_ARGUMENT
 * ```
 *
 * @since 1.0.0
 */
export function drawBottom<C>(stack: CardStack<C>, count = 1): DrawResult<C> {
  const problem =
    stackProblem(stack) ?? countProblem(count) ?? shortfall(count, stack);
  if (problem !== undefined) throw problem;
  const split = stack.length - count;
  return Object.freeze({
    cards: Object.freeze(copyStack(stack, split)),
    remainder: Object.freeze(copyStack(stack, 0, split)),
  });
}

/**
 * Looks at cards from the top of a stack without drawing them.
 *
 * The stack is left untouched, frozen or not, and the cards are still in it.
 * The cards come back as a new frozen stack, even when that's every card in the
 * stack. Any stack works, including one with copies or with cards that aren't
 * standard cards.
 *
 * Leave `count` out, or pass `undefined`, to look at one card. The result is a
 * stack either way, so it holds that one card rather than being the card.
 *
 * @typeParam C - The type of card in the stack.
 * @param stack - The stack to look at, top first.
 * @param count - How many cards to look at, an integer of 0 or more: 1 if it's
 * left out or `undefined`.
 * @returns A new frozen stack holding the top `count` cards, top first.
 * @throws {@link InvalidArgumentError} When `stack` isn't an array, or `count`
 * isn't an integer of 0 or more.
 * @throws {@link InsufficientCardsError} When `count` is more than the stack
 * holds.
 *
 * @example
 * ```ts
 * import { card, peek } from "deckshoes";
 *
 * const hand = [card("A", "S"), card("K", "H"), card("10", "D")];
 * peek(hand, 2); // => [card("A", "S"), card("K", "H")]
 *
 * // Leave the count out to look at one card.
 * const [top] = peek(hand);
 * top === card("A", "S"); // => true
 *
 * // The cards are still in the stack.
 * hand.length; // => 3
 *
 * peek(hand, 4); // throws INSUFFICIENT_CARDS
 * peek(hand, -1); // throws INVALID_ARGUMENT
 * ```
 *
 * @since 1.0.0
 */
export function peek<C>(stack: CardStack<C>, count = 1): CardStack<C> {
  const problem =
    stackProblem(stack) ?? countProblem(count) ?? shortfall(count, stack);
  if (problem !== undefined) throw problem;
  return Object.freeze(copyStack(stack, 0, count));
}

/**
 * Looks at cards from the bottom of a stack without drawing them.
 *
 * The cards stay in stack order, top first, so the card on the bottom comes
 * last.
 *
 * The stack is left untouched, frozen or not, and the cards are still in it.
 * The cards come back as a new frozen stack, even when that's every card in the
 * stack. Any stack works, including one with copies or with cards that aren't
 * standard cards.
 *
 * Leave `count` out, or pass `undefined`, to look at one card. The result is a
 * stack either way, so it holds that one card rather than being the card.
 *
 * @typeParam C - The type of card in the stack.
 * @param stack - The stack to look at, top first.
 * @param count - How many cards to look at, an integer of 0 or more: 1 if it's
 * left out or `undefined`.
 * @returns A new frozen stack holding the bottom `count` cards, top first.
 * @throws {@link InvalidArgumentError} When `stack` isn't an array, or `count`
 * isn't an integer of 0 or more.
 * @throws {@link InsufficientCardsError} When `count` is more than the stack
 * holds.
 *
 * @example
 * ```ts
 * import { card, peekBottom } from "deckshoes";
 *
 * const hand = [card("A", "S"), card("K", "H"), card("10", "D")];
 * peekBottom(hand, 2); // => [card("K", "H"), card("10", "D")]
 *
 * // Leave the count out to look at one card.
 * const [bottom] = peekBottom(hand);
 * bottom === card("10", "D"); // => true
 *
 * // The cards are still in the stack.
 * hand.length; // => 3
 *
 * peekBottom(hand, 4); // throws INSUFFICIENT_CARDS
 * peekBottom(hand, -1); // throws INVALID_ARGUMENT
 * ```
 *
 * @since 1.0.0
 */
export function peekBottom<C>(stack: CardStack<C>, count = 1): CardStack<C> {
  const problem =
    stackProblem(stack) ?? countProblem(count) ?? shortfall(count, stack);
  if (problem !== undefined) throw problem;
  return Object.freeze(copyStack(stack, stack.length - count));
}
