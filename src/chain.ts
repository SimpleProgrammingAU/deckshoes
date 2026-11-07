import type { Card } from "./card.ts";
import type { CardStack } from "./stack.ts";

import { draw, drawBottom, type DrawResult, peek, peekBottom } from "./draw.ts";
import { invalidStack } from "./internal/stack.ts";
import { shuffle, type ShuffleOptions } from "./shuffle.ts";

/**
 * A stack wrapped by {@link chain}, so stack operations can be written as a
 * pipeline and then unwrapped with {@link Chain.value | value()}.
 *
 * Each method has the same name as a stack operation, calls that function and
 * returns a new chain holding the result. If a pipeline can't carry on from the
 * result, as with drawn cards and the remainder or with peeked cards, that new
 * chain is a {@link TerminatedChain}, which can only be unwrapped. A method
 * never changes the chain it's called on, which still holds the stack it held
 * before.
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
   * Draws cards from the top of the stack the chain holds with {@link draw},
   * and ends the chain, because a pipeline can't carry on from two stacks.
   *
   * To carry on with the remainder, wrap it again with
   * `chain(result.remainder)`.
   *
   * @param count - The count that {@link draw} takes.
   * @returns A terminated chain holding what {@link draw} returns.
   * @throws {@link InvalidArgumentError} When {@link draw} would.
   * @throws {@link InsufficientCardsError} When {@link draw} would.
   *
   * @example
   * ```ts
   * import { card, chain } from "deckshoes";
   *
   * const hand = [card("A", "S"), card("K", "H"), card("10", "D")];
   * const { cards, remainder } = chain(hand).draw(2).value();
   * cards; // => [card("A", "S"), card("K", "H")]
   *
   * // To carry on, wrap the remainder again.
   * chain(remainder).draw().value().cards; // => [card("10", "D")]
   *
   * // The chain throws whatever draw throws.
   * chain(hand).draw(4); // throws INSUFFICIENT_CARDS
   * ```
   *
   * @since NEXT
   */
  draw(count?: number): TerminatedChain<DrawResult<C>>;

  /**
   * Draws cards from the bottom of the stack the chain holds with
   * {@link drawBottom}, and ends the chain, because a pipeline can't carry on
   * from two stacks.
   *
   * To carry on with the remainder, wrap it again with
   * `chain(result.remainder)`.
   *
   * @param count - The count that {@link drawBottom} takes.
   * @returns A terminated chain holding what {@link drawBottom} returns.
   * @throws {@link InvalidArgumentError} When {@link drawBottom} would.
   * @throws {@link InsufficientCardsError} When {@link drawBottom} would.
   *
   * @example
   * ```ts
   * import { card, chain } from "deckshoes";
   *
   * const hand = [card("A", "S"), card("K", "H"), card("10", "D")];
   * const { cards, remainder } = chain(hand).drawBottom(2).value();
   * cards; // => [card("K", "H"), card("10", "D")]
   * remainder; // => [card("A", "S")]
   *
   * // The chain throws whatever drawBottom throws.
   * chain(hand).drawBottom(4); // throws INSUFFICIENT_CARDS
   * ```
   *
   * @since NEXT
   */
  drawBottom(count?: number): TerminatedChain<DrawResult<C>>;

  /**
   * Looks at cards from the top of the stack the chain holds with {@link peek},
   * and ends the chain, because those cards are still in the stack, so a
   * pipeline can't carry on from them.
   *
   * To carry on with the whole stack, call the next method on this chain, not
   * on what `peek` returns: this chain still holds the stack.
   *
   * @param count - The count that {@link peek} takes.
   * @returns A terminated chain holding what {@link peek} returns.
   * @throws {@link InvalidArgumentError} When {@link peek} would.
   * @throws {@link InsufficientCardsError} When {@link peek} would.
   *
   * @example
   * ```ts
   * import { card, chain } from "deckshoes";
   *
   * const chained = chain([card("A", "S"), card("K", "H"), card("10", "D")]);
   * chained.peek(2).value(); // => [card("A", "S"), card("K", "H")]
   *
   * // To carry on, use the chain that peek was called on.
   * chained.draw(2).value().cards; // => [card("A", "S"), card("K", "H")]
   *
   * // The chain throws whatever peek throws.
   * chained.peek(4); // throws INSUFFICIENT_CARDS
   * ```
   *
   * @since NEXT
   */
  peek(count?: number): TerminatedChain<CardStack<C>>;

  /**
   * Looks at cards from the bottom of the stack the chain holds with
   * {@link peekBottom}, and ends the chain, because those cards are still in
   * the stack, so a pipeline can't carry on from them.
   *
   * To carry on with the whole stack, call the next method on this chain, not
   * on what `peekBottom` returns: this chain still holds the stack.
   *
   * @param count - The count that {@link peekBottom} takes.
   * @returns A terminated chain holding what {@link peekBottom} returns.
   * @throws {@link InvalidArgumentError} When {@link peekBottom} would.
   * @throws {@link InsufficientCardsError} When {@link peekBottom} would.
   *
   * @example
   * ```ts
   * import { card, chain } from "deckshoes";
   *
   * const chained = chain([card("A", "S"), card("K", "H"), card("10", "D")]);
   * chained.peekBottom(2).value(); // => [card("K", "H"), card("10", "D")]
   *
   * // To carry on, use the chain that peekBottom was called on.
   * chained.value().length; // => 3
   *
   * // The chain throws whatever peekBottom throws.
   * chained.peekBottom(4); // throws INSUFFICIENT_CARDS
   * ```
   *
   * @since NEXT
   */
  peekBottom(count?: number): TerminatedChain<CardStack<C>>;

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

/**
 * A chain holding something a pipeline can't carry on from, such as drawn cards
 * and the remainder, or peeked cards. It has no stack operations and can only
 * be unwrapped with {@link TerminatedChain.value | value()}.
 *
 * @typeParam R - What the chain holds: what the last operation returned.
 *
 * @example
 * ```ts
 * import { card, chain, type DrawResult, type TerminatedChain } from "deckshoes";
 *
 * const hand = [card("A", "S"), card("K", "H")];
 * const terminated: TerminatedChain<DrawResult> = chain(hand).draw();
 * terminated.value().cards; // => [card("A", "S")]
 * ```
 *
 * @since NEXT
 */
export interface TerminatedChain<R> {
  /**
   * Unwraps the chain, returning what the last operation returned.
   *
   * That's the result itself, not a copy, so the function and the chain give
   * the same shape.
   *
   * @returns What the chain holds.
   *
   * @example
   * ```ts
   * import { card, chain } from "deckshoes";
   *
   * const hand = [card("A", "S"), card("K", "H")];
   * chain(hand).draw().value(); // => { cards: [card("A", "S")], remainder: [card("K", "H")] }
   * ```
   *
   * @since NEXT
   */
  value(): R;
}

/** The chain that {@link TerminatedChain} describes: a frozen object holding a result. */
class ResultChain<R> implements TerminatedChain<R> {
  readonly #result: R;

  constructor(result: R) {
    this.#result = result;
    Object.freeze(this);
  }

  value(): R {
    return this.#result;
  }
}

/** The chain that {@link chain} returns: a frozen object holding a stack. */
class StackChain<C> implements Chain<C> {
  readonly #stack: CardStack<C>;

  constructor(stack: CardStack<C>) {
    this.#stack = stack;
    Object.freeze(this);
  }

  draw(count?: number): TerminatedChain<DrawResult<C>> {
    return new ResultChain(draw(this.#stack, count));
  }

  drawBottom(count?: number): TerminatedChain<DrawResult<C>> {
    return new ResultChain(drawBottom(this.#stack, count));
  }

  peek(count?: number): TerminatedChain<CardStack<C>> {
    return new ResultChain(peek(this.#stack, count));
  }

  peekBottom(count?: number): TerminatedChain<CardStack<C>> {
    return new ResultChain(peekBottom(this.#stack, count));
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
 * functions give. {@link Chain} lists the methods. A chain holding something a
 * pipeline can't carry on from is a {@link TerminatedChain}, which can only be
 * unwrapped.
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
