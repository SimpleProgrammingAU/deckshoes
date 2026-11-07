import type { RandomSource } from "./random.ts";
import type { CardStack } from "./stack.ts";

import { InvalidArgumentError } from "./errors.ts";
import { display } from "./internal/display.ts";
import { randomIndex, secureRandom } from "./internal/random.ts";
import { copyStack, invalidStack } from "./internal/stack.ts";

/**
 * Settings for {@link shuffle}.
 *
 * @example
 * ```ts
 * import { card, seededRandom, shuffle, type ShuffleOptions } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * const options: ShuffleOptions = { random: seededRandom(42) };
 * shuffle(standard52(), options)[0] === card("7", "H"); // => true
 * ```
 *
 * @since 1.0.0
 */
export interface ShuffleOptions {
  /**
   * The random source to shuffle with. Leave it out, or pass `undefined`, to
   * use a secure source backed by `crypto.getRandomValues`, made fresh for each
   * shuffle. Pass a fresh {@link seededRandom} source to get the same order
   * every time: a seeded source moves on with each use, so reusing one gives a
   * different order.
   */
  readonly random?: RandomSource | undefined;
}

/**
 * Returns a shuffled copy of a stack, with every order equally likely.
 *
 * The stack is left untouched, frozen or not, and the shuffled stack is a new
 * frozen array, even when there are too few cards to move. Any stack works,
 * including one with copies or with cards that aren't standard cards.
 *
 * It's a Fisher–Yates shuffle, drawing from the `random` option. Leave the
 * option out to use a secure source, backed by `crypto.getRandomValues`: each
 * shuffle makes its own and keeps nothing from it afterwards. Pass a fresh
 * {@link seededRandom} source to make the order reproducible: the same seed
 * gives the same order in every runtime and every 1.x release. A seeded source
 * moves on with each use, so one source passed to two shuffles gives two
 * different orders.
 *
 * Where the runtime has no `crypto.getRandomValues`, such as React Native
 * without a polyfill, shuffling two or more cards without a `random` option
 * throws the runtime's own error, not a deckshoes error.
 *
 * @typeParam C - The type of card in the stack.
 * @param stack - The stack to shuffle, top first.
 * @param options - Settings for the shuffle, such as its random source.
 * @returns A new frozen stack holding the same cards in random order.
 * @throws {@link InvalidArgumentError} When `stack` isn't an array, `options`
 * isn't an object, or its `random` option isn't a function. Also when the
 * random source returns something other than a number from 0 up to 1, or keeps
 * returning values that have to be rejected.
 *
 * @example
 * ```ts
 * import { card, seededRandom, shuffle } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * const deck = shuffle(standard52(), { random: seededRandom(42) });
 * deck.length; // => 52
 * deck[0] === card("7", "H"); // => true
 *
 * // The same seed gives the same order, and the input is left alone.
 * shuffle(standard52(), { random: seededRandom(42) }); // => deck
 * standard52()[0] === card("A", "H"); // => true
 *
 * // Any stack can be shuffled.
 * const hand = [card("A", "S"), card("K", "H"), card("10", "D")];
 * shuffle(hand, { random: seededRandom(1) }); // => [card("10", "D"), card("K", "H"), card("A", "S")]
 *
 * // A random source has to return a number from 0 up to, but not including, 1.
 * shuffle(hand, { random: () => 1 }); // throws INVALID_ARGUMENT
 * ```
 *
 * @since 1.0.0
 */
export function shuffle<C>(
  stack: CardStack<C>,
  options: ShuffleOptions = {},
): CardStack<C> {
  // Read as `unknown`: JavaScript callers can pass anything.
  const given: unknown = stack;
  if (!Array.isArray(given)) throw invalidStack(given);
  const settings: unknown = options;
  if (typeof settings !== "object" || settings === null) {
    throw new InvalidArgumentError(
      `Invalid options ${display(settings)}: expected an object, such as { random: seededRandom(42) }`,
    );
  }
  const random: unknown = options.random;
  if (random !== undefined && typeof random !== "function") {
    throw new InvalidArgumentError(
      `Invalid random option ${display(random)}: expected a random source, a function returning a number from 0 up to 1`,
    );
  }
  const source = (random as RandomSource | undefined) ?? secureRandom();

  // Durstenfeld's Fisher–Yates, from the bottom of the stack up. This order
  // is fixed for 1.x (ADR 0006): changing it changes every seeded shuffle.
  const shuffled = copyStack(stack);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1, source);
    const held = shuffled[i] as C;
    shuffled[i] = shuffled[j] as C;
    shuffled[j] = held;
  }
  return Object.freeze(shuffled);
}
