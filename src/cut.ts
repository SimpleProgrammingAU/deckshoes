import type { RandomSource } from "./random.ts";
import type { CardStack } from "./stack.ts";

import {
  cardsProblem,
  optionsProblem,
  positionProblem,
  randomProblem,
  stackProblem,
} from "./internal/checks.ts";
import { randomPosition } from "./internal/random.ts";

/**
 * The named values {@link cut} and {@link insert} take as a position, besides
 * a number of cards from the top.
 *
 * - `Position.BOTTOM` is below the bottom card, whatever the stack's size, so
 *   a chain can insert at the bottom of a stack it can't measure.
 * - `Position.RANDOM`, the default, is a position picked at random with the
 *   `random` option.
 *
 * @example
 * ```ts
 * import { card, insert, Position } from "deckshoes";
 *
 * const hand = [card("A", "S"), card("K", "H")];
 * insert(hand, [card("10", "D")], Position.BOTTOM); // => [card("A", "S"), card("K", "H"), card("10", "D")]
 *
 * // The values are plain strings, which is what error messages show.
 * Position.BOTTOM; // => "bottom"
 * Position.RANDOM; // => "random"
 * ```
 *
 * @since NEXT
 */
export const Position: {
  /** Below the bottom card: the stack's size. */
  readonly BOTTOM: "bottom";
  /** A position picked at random with the `random` option. */
  readonly RANDOM: "random";
} = /* @__PURE__ */ Object.freeze({ BOTTOM: "bottom", RANDOM: "random" });

/**
 * A position that {@link cut} and {@link insert} take: the number of cards
 * above it, or `Position.BOTTOM` or `Position.RANDOM`.
 *
 * @example
 * ```ts
 * import { card, cut, Position } from "deckshoes";
 *
 * const hand = [card("A", "S"), card("K", "H"), card("10", "D")];
 *
 * function topAfterCut(position: Position): unknown {
 *   return cut(hand, position)[0];
 * }
 *
 * topAfterCut(1) === card("K", "H"); // => true
 * topAfterCut(Position.BOTTOM) === card("A", "S"); // => true
 * ```
 *
 * @since NEXT
 */
export type Position = number | (typeof Position)[keyof typeof Position];

/**
 * Settings for {@link cut}.
 *
 * @example
 * ```ts
 * import { card, cut, type CutOptions, Position, seededRandom } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * const options: CutOptions = { random: seededRandom(42) };
 * cut(standard52(), Position.RANDOM, options)[0] === card("8", "H"); // => true
 * ```
 *
 * @since NEXT
 */
export interface CutOptions {
  /**
   * The random source to pick a random position with. Leave it out, or pass
   * `undefined`, to use a secure source backed by `crypto.getRandomValues`,
   * made fresh for each cut. Pass a fresh {@link seededRandom} source to get
   * the same cut every time: a seeded source moves on with each use, so
   * reusing one gives a different cut. It's only used for `Position.RANDOM`,
   * but it's checked whatever the position.
   */
  readonly random?: RandomSource | undefined;
}

/**
 * Settings for {@link insert}.
 *
 * @example
 * ```ts
 * import { card, insert, type InsertOptions, Position, seededRandom } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * const options: InsertOptions = { random: seededRandom(42) };
 * const deck = insert(standard52(), [card("A", "S")], Position.RANDOM, options);
 * deck[8] === card("A", "S"); // => true
 * ```
 *
 * @since NEXT
 */
export interface InsertOptions {
  /**
   * The random source to pick a random position with. Leave it out, or pass
   * `undefined`, to use a secure source backed by `crypto.getRandomValues`,
   * made fresh for each insert. Pass a fresh {@link seededRandom} source to
   * get the same position every time: a seeded source moves on with each use,
   * so reusing one gives a different position. It's only used for
   * `Position.RANDOM`, but it's checked whatever the position.
   */
  readonly random?: RandomSource | undefined;
}

/** The example options in an error message for options that aren't an object. */
const EXAMPLE_OPTIONS = "{ random: seededRandom(42) }";

/**
 * Cuts a stack: moves the cards above a position from the top to the bottom,
 * keeping their order, so the card at that position ends up on top.
 *
 * The stack is left untouched, frozen or not, and the cut stack is a new frozen
 * array, even when the cut leaves the order as it was. Any stack works,
 * including one with copies or with cards that aren't standard cards.
 *
 * `position` is the number of cards to move, an integer from 0 to the stack's
 * size. 0 and the stack's size, which `Position.BOTTOM` stands for, both leave
 * the order as it was.
 *
 * Leave `position` out, or pass `Position.RANDOM`, to cut at a random position
 * from 0 to one less than the stack's size, each equally likely, so every card
 * is as likely as any other to end up on top. The randomness comes from the
 * `random` option. Leave the option out to use a secure source, backed by
 * `crypto.getRandomValues`. Pass a fresh {@link seededRandom} source to make
 * the cut reproducible: the same seed gives the same cut in every runtime and
 * every 1.x release. A stack of 0 or 1 cards can only be cut one way, so the
 * source isn't called.
 *
 * Where the runtime has no `crypto.getRandomValues`, such as React Native
 * without a polyfill, a random cut of two or more cards without a `random`
 * option throws the runtime's own error, not a deckshoes error. A position
 * left out is random, so that includes `cut(stack)`.
 *
 * The positions a cut takes, and those a random cut picks from, stay the same
 * in every 1.x release.
 *
 * @typeParam C - The type of card in the stack.
 * @param stack - The stack to cut, top first.
 * @param position - How many cards to move from the top to the bottom, an
 * integer from 0 to the stack's size, or `Position.BOTTOM`: `Position.RANDOM`
 * if it's left out or `undefined`.
 * @param options - Settings for the cut, such as its random source.
 * @returns A new frozen stack holding the same cards, cut at `position`.
 * @throws {@link InvalidArgumentError} When `stack` isn't an array, `position`
 * isn't an integer from 0 to the stack's size, `Position.BOTTOM` or
 * `Position.RANDOM`, `options` isn't an object, or its `random` option isn't a
 * function. Also when the random source returns something other than a number
 * from 0 up to 1, or keeps returning values that have to be rejected.
 *
 * @example
 * ```ts
 * import { card, cut, Position, seededRandom } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * const hand = [card("A", "S"), card("K", "H"), card("10", "D")];
 * cut(hand, 1); // => [card("K", "H"), card("10", "D"), card("A", "S")]
 *
 * // A cut at 0 or at the bottom leaves the order as it was.
 * cut(hand, Position.BOTTOM); // => hand
 *
 * // A cut at random. The same seed gives the same cut.
 * const deck = cut(standard52(), Position.RANDOM, { random: seededRandom(42) });
 * deck[0] === card("8", "H"); // => true
 *
 * // A position has to be in the stack.
 * cut(hand, 4); // throws INVALID_ARGUMENT
 * ```
 *
 * @since NEXT
 */
export function cut<C>(
  stack: CardStack<C>,
  position: Position = Position.RANDOM,
  options: CutOptions = {},
): CardStack<C> {
  const problem =
    stackProblem(stack) ??
    positionProblem(position, stack.length, Position, "Position") ??
    optionsProblem(options, EXAMPLE_OPTIONS);
  if (problem !== undefined) throw problem;
  const random: unknown = options.random;
  const badRandom = randomProblem(random);
  if (badRandom !== undefined) throw badRandom;

  const size = stack.length;
  const moved =
    position === Position.BOTTOM
      ? size
      : position === Position.RANDOM
        ? randomPosition(size, random as RandomSource | undefined)
        : position;
  // eslint-disable-next-line unicorn/no-new-array -- sized up front, as in copyStack
  const result = new Array<C>(size);
  const kept = size - moved;
  for (let i = 0; i < kept; i++) result[i] = stack[moved + i] as C;
  for (let i = 0; i < moved; i++) result[kept + i] = stack[i] as C;
  return Object.freeze(result);
}

/**
 * Puts cards into a stack at a position, keeping their order.
 *
 * `position` is how many of the stack's cards end up above the new ones, an
 * integer from 0 to the stack's size, so the first of `cards` ends up at that
 * position. 0 puts them on top, and the stack's size, which `Position.BOTTOM`
 * stands for, puts them below the bottom card.
 *
 * Leave `position` out, or pass `Position.RANDOM`, to put the cards in at a
 * random position from 0 to the stack's size, each equally likely. They stay
 * together, in their order. The randomness comes from the `random` option.
 * Leave the option out to use a secure source, backed by
 * `crypto.getRandomValues`. Pass a fresh {@link seededRandom} source to make
 * the position reproducible: the same seed gives the same position in every
 * runtime and every 1.x release. An empty stack has only one place to put
 * them, so the source isn't called.
 *
 * Where the runtime has no `crypto.getRandomValues`, such as React Native
 * without a polyfill, a random insert into a stack of one or more cards
 * without a `random` option throws the runtime's own error, not a deckshoes
 * error. A position left out is random, so that includes
 * `insert(stack, cards)`.
 *
 * Neither the stack nor `cards` is changed, frozen or not, and the result is a
 * new frozen array. Any stack works, including one with copies or with cards
 * that aren't standard cards. `cards` is always an array, even for one card.
 *
 * @typeParam C - The type of card in the stack.
 * @param stack - The stack to put the cards into, top first.
 * @param cards - The cards to put in, top first.
 * @param position - How many of the stack's cards go above the new ones, an
 * integer from 0 to the stack's size, or `Position.BOTTOM`: `Position.RANDOM`
 * if it's left out or `undefined`.
 * @param options - Settings for the insert, such as its random source.
 * @returns A new frozen stack holding the stack's cards with `cards` among
 * them.
 * @throws {@link InvalidArgumentError} When `stack` or `cards` isn't an array,
 * `position` isn't an integer from 0 to the stack's size, `Position.BOTTOM` or
 * `Position.RANDOM`, `options` isn't an object, or its `random` option isn't a
 * function. Also when the random source returns something other than a number
 * from 0 up to 1, or keeps returning values that have to be rejected.
 *
 * @example
 * ```ts
 * import { card, insert, Position, seededRandom } from "deckshoes";
 *
 * const hand = [card("A", "S"), card("K", "H")];
 * insert(hand, [card("10", "D")], 1); // => [card("A", "S"), card("10", "D"), card("K", "H")]
 *
 * // At the bottom, two cards in their order.
 * insert(hand, [card("10", "D"), card("J", "C")], Position.BOTTOM); // => [card("A", "S"), card("K", "H"), card("10", "D"), card("J", "C")]
 *
 * // At random. The same seed gives the same position.
 * insert(hand, [card("10", "D")], Position.RANDOM, { random: seededRandom(42) }); // => [card("10", "D"), card("A", "S"), card("K", "H")]
 *
 * // A position has to be in the stack.
 * insert(hand, [card("10", "D")], 3); // throws INVALID_ARGUMENT
 * ```
 *
 * @since NEXT
 */
export function insert<C>(
  stack: CardStack<C>,
  cards: CardStack<C>,
  position: Position = Position.RANDOM,
  options: InsertOptions = {},
): CardStack<C> {
  const problem =
    stackProblem(stack) ??
    cardsProblem(cards) ??
    positionProblem(position, stack.length, Position, "Position") ??
    optionsProblem(options, EXAMPLE_OPTIONS);
  if (problem !== undefined) throw problem;
  const random: unknown = options.random;
  const badRandom = randomProblem(random);
  if (badRandom !== undefined) throw badRandom;

  const size = stack.length;
  const count = cards.length;
  const above =
    position === Position.BOTTOM
      ? size
      : position === Position.RANDOM
        ? randomPosition(size + 1, random as RandomSource | undefined)
        : position;
  // eslint-disable-next-line unicorn/no-new-array -- sized up front, as in copyStack
  const result = new Array<C>(size + count);
  for (let i = 0; i < above; i++) result[i] = stack[i] as C;
  for (let i = 0; i < count; i++) result[above + i] = cards[i] as C;
  for (let i = above; i < size; i++) result[count + i] = stack[i] as C;
  return Object.freeze(result);
}
