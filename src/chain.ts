import type { Card } from "./card.ts";
import type { CardStack } from "./stack.ts";

import { invalidStack } from "./internal/stack.ts";
import { shuffle, type ShuffleOptions } from "./shuffle.ts";

/**
 * A stack wrapped by {@link chain}, so stack operations can be written as a
 * pipeline and then unwrapped with {@link Chain.value | value()}.
 *
 * Each method has the same name as a stack operation, calls that function and
 * returns a new chain holding the result. A method never changes the chain it's
 * called on, which still holds the stack it held before.
 *
 * A chain holds the stack passed to {@link chain} itself, not a copy. Every
 * stack deckshoes returns is frozen, but if you pass in an array of your own
 * and then change it, the chain holds the changed array.
 *
 * Get a chain from {@link chain} rather than implementing `Chain` yourself,
 * because each new stack operation adds a method to it in a minor release.
 *
 * @typeParam C - The type of card in the stack the chain holds: a standard
 * {@link Card} unless you say otherwise.
 *
 * @example
 * ```ts
 * import { card, chain, type Chain, seededRandom } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * const chained: Chain = chain(standard52());
 * const shuffled = chained.shuffle({ random: seededRandom(42) });
 * shuffled.value()[0] === card("7", "H"); // => true
 *
 * // The chain that shuffle was called on still holds the deck as it was.
 * chained.value()[0] === card("A", "H"); // => true
 * ```
 *
 * @since NEXT
 */
export interface Chain<C = Card> {
  /**
   * Shuffles the stack the chain holds with {@link shuffle}, and returns a new
   * chain holding the result.
   *
   * @param options - The options that {@link shuffle} takes.
   * @returns A new chain holding the shuffled stack.
   * @throws {@link InvalidArgumentError} When {@link shuffle} would.
   *
   * @example
   * ```ts
   * import { card, chain, seededRandom } from "deckshoes";
   * import { standard52 } from "deckshoes/presets";
   *
   * const shuffled = chain(standard52()).shuffle({ random: seededRandom(42) });
   * shuffled.value()[0] === card("7", "H"); // => true
   *
   * // The chain throws whatever shuffle throws.
   * chain(standard52()).shuffle({ random: () => 1 }); // throws INVALID_ARGUMENT
   * ```
   *
   * @since NEXT
   */
  shuffle(options?: ShuffleOptions): Chain<C>;

  /**
   * Unwraps the chain, returning the stack it holds.
   *
   * That's the stack itself, not a copy: the one passed to {@link chain},
   * frozen or not, or the frozen stack the last operation returned.
   *
   * @returns The stack the chain holds, top first.
   *
   * @example
   * ```ts
   * import { card, chain } from "deckshoes";
   *
   * const hand = [card("A", "S"), card("K", "H")];
   * chain(hand).value() === hand; // => true
   * ```
   *
   * @since NEXT
   */
  value(): CardStack<C>;
}

/** The chain that {@link chain} returns: a frozen object holding a stack. */
class StackChain<C> implements Chain<C> {
  readonly #stack: CardStack<C>;

  constructor(stack: CardStack<C>) {
    this.#stack = stack;
    Object.freeze(this);
  }

  shuffle(options?: ShuffleOptions): Chain<C> {
    return new StackChain(shuffle(this.#stack, options));
  }

  value(): CardStack<C> {
    return this.#stack;
  }
}

/**
 * Wraps a stack in a chain, so stack operations can be written as a pipeline
 * and then unwrapped with `.value()`.
 *
 * Each of the chain's methods calls the stack operation with the same name and
 * returns a new chain holding the result, so a chain always gives what the
 * functions give. {@link Chain} lists the methods.
 *
 * Importing `chain` brings every stack operation into your bundle, even the
 * ones you don't call, because a bundler can't drop a method that isn't used.
 * If bundle size matters, call the functions instead.
 *
 * @typeParam C - The type of card in the stack.
 * @param stack - The stack to wrap, top first.
 * @returns A chain holding `stack`.
 * @throws {@link InvalidArgumentError} When `stack` isn't an array.
 *
 * @example
 * ```ts
 * import { card, chain, seededRandom, shuffle } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * const deck = chain(standard52())
 *   .shuffle({ random: seededRandom(42) })
 *   .value();
 * deck[0] === card("7", "H"); // => true
 *
 * // It's the same as calling the function.
 * shuffle(standard52(), { random: seededRandom(42) }); // => deck
 *
 * // Unwrapping straight away gives back the stack itself.
 * const hand = [card("A", "S"), card("K", "H")];
 * chain(hand).value() === hand; // => true
 * ```
 *
 * @since NEXT
 */
export function chain<C>(stack: CardStack<C>): Chain<C> {
  // Read as `unknown`: JavaScript callers can pass anything.
  const given: unknown = stack;
  if (!Array.isArray(given)) throw invalidStack(given);
  return new StackChain(stack);
}
