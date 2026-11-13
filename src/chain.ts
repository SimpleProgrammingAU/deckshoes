import type { Card } from "./card.ts";
import type { CardStack } from "./stack.ts";

import {
  cut,
  type CutOptions,
  insert,
  type InsertOptions,
  type Position,
} from "./cut.ts";
import {
  deal,
  type DealOptions,
  type DealResult,
  type HandSize,
} from "./deal.ts";
import { draw, drawBottom, type DrawResult, peek, peekBottom } from "./draw.ts";
import { stackProblem } from "./internal/checks.ts";
import {
  groupByRank,
  groupBySuit,
  type RankOrder,
  sort,
  type SortOptions,
  type SuitOrder,
} from "./order.ts";
import { contains, count, remove } from "./remove.ts";
import { shuffle, type ShuffleOptions } from "./shuffle.ts";

/**
 * A stack wrapped by {@link chain}, so stack operations can be written as a
 * pipeline and then unwrapped with {@link Chain.value | value()}.
 *
 * Each method has the same name as a stack operation, calls that function and
 * returns a new chain holding the result. If a pipeline can't carry on from the
 * result, as with dealt hands, drawn cards and the remainder, peeked cards,
 * groups, or an answer such as a count, that new chain is a
 * {@link TerminatedChain}, which can only be unwrapped. A method never changes the chain it's called
 * on, which still holds the stack it held before.
 *
 * A chain holds the stack passed to {@link chain} itself, not a copy. Every
 * stack deckshoes returns is frozen, but if you pass in an array of your own
 * and then change it, the chain holds the changed array.
 *
 * Call a method on the chain itself: one taken off it, as in
 * `const { draw } = chained`, loses the chain and throws the runtime's own
 * `TypeError`.
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
 * @since 1.0.0
 */
export interface Chain<C = Card> {
  /**
   * Tells whether the stack the chain holds has particular cards with
   * {@link contains}, and ends the chain, because a pipeline can't carry on
   * from a yes or no.
   *
   * To carry on with the stack, call the next method on this chain, not on
   * what `contains` returns: this chain still holds the stack.
   *
   * @param cards - The cards that {@link contains} takes.
   * @returns A terminated chain holding what {@link contains} returns.
   * @throws {@link InvalidArgumentError} When {@link contains} would.
   *
   * @example
   * ```ts
   * import { card, chain } from "deckshoes";
   *
   * const chained = chain([card("A", "S"), card("K", "H"), card("10", "D")]);
   * chained.contains([card("K", "H")]).value(); // => true
   * chained.contains([card("Q", "C")]).value(); // => false
   *
   * // To carry on, use the chain that contains was called on.
   * chained.remove([card("K", "H")]).value(); // => [card("A", "S"), card("10", "D")]
   * ```
   *
   * @since NEXT
   */
  contains(cards: CardStack<C>): TerminatedChain<boolean>;

  /**
   * Counts the cards in the stack the chain holds that `match` accepts with
   * {@link count}, and ends the chain, because a pipeline can't carry on from a
   * number.
   *
   * To carry on with the stack, call the next method on this chain, not on
   * what `count` returns: this chain still holds the stack.
   *
   * @param match - The function that {@link count} takes.
   * @returns A terminated chain holding what {@link count} returns.
   * @throws {@link InvalidArgumentError} When {@link count} would.
   *
   * @example
   * ```ts
   * import { card, chain } from "deckshoes";
   *
   * const chained = chain([card("A", "S"), card("K", "H"), card("10", "H")]);
   * chained.count(({ suit }) => suit === "H").value(); // => 2
   *
   * // To carry on, use the chain that count was called on.
   * chained.draw(2).value().cards; // => [card("A", "S"), card("K", "H")]
   * ```
   *
   * @since NEXT
   */
  count(match: (card: C) => unknown): TerminatedChain<number>;

  /**
   * Cuts the stack the chain holds with {@link cut}, and returns a new chain
   * holding the result.
   *
   * @param position - The position that {@link cut} takes.
   * @param options - The options that {@link cut} takes.
   * @returns A new chain holding the cut stack.
   * @throws {@link InvalidArgumentError} When {@link cut} would.
   *
   * @example
   * ```ts
   * import { card, chain, Position, seededRandom } from "deckshoes";
   * import { standard52 } from "deckshoes/presets";
   *
   * const deck = chain(standard52()).cut(26).value();
   * deck[0] === card("K", "D"); // => true
   *
   * // A cut at random. The same seed gives the same cut.
   * const atRandom = chain(standard52())
   *   .cut(Position.RANDOM, { random: seededRandom(42) })
   *   .value();
   * atRandom[0] === card("8", "H"); // => true
   *
   * // The chain throws whatever cut throws.
   * chain(standard52()).cut(53); // throws INVALID_ARGUMENT
   * ```
   *
   * @since NEXT
   */
  cut(position?: Position, options?: CutOptions): Chain<C>;

  /**
   * Deals cards from the top of the stack the chain holds into hands with
   * {@link deal}, and ends the chain, because a pipeline can't carry on from
   * several stacks.
   *
   * To carry on with the remainder, wrap it again with
   * `chain(result.remainder)`.
   *
   * @param handCount - The hand count that {@link deal} takes.
   * @param handSize - The hand size that {@link deal} takes.
   * @param options - The options that {@link deal} takes.
   * @returns A terminated chain holding what {@link deal} returns.
   * @throws {@link InvalidArgumentError} When {@link deal} would.
   * @throws {@link InsufficientCardsError} When {@link deal} would.
   *
   * @example
   * ```ts
   * import { chain, seededRandom } from "deckshoes";
   * import { standard52 } from "deckshoes/presets";
   *
   * const { hands, remainder } = chain(standard52())
   *   .shuffle({ random: seededRandom(42) })
   *   .deal(4, 5)
   *   .value();
   * hands.map((hand) => hand.length); // => [5, 5, 5, 5]
   *
   * // To carry on, wrap the remainder again.
   * chain(remainder).draw(2).value().remainder.length; // => 30
   *
   * // The chain throws whatever deal throws.
   * chain(standard52()).deal(4, 14); // throws INSUFFICIENT_CARDS
   * ```
   *
   * @since 1.0.0
   */
  deal(
    handCount: number,
    handSize: HandSize,
    options?: DealOptions,
  ): TerminatedChain<DealResult<C>>;

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
   * @since 1.0.0
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
   * @since 1.0.0
   */
  drawBottom(count?: number): TerminatedChain<DrawResult<C>>;

  /**
   * Groups the cards in the stack the chain holds by rank with
   * {@link groupByRank}, and ends the chain, because a pipeline can't carry on
   * from several stacks.
   *
   * To carry on with one group, wrap it again with `chain(group)`.
   *
   * @typeParam D - The type of card in the stack the chain holds, which has to
   * have a rank. It's taken from the chain, so you never write it.
   * @param rankOrder - The rank order that {@link groupByRank} takes.
   * @returns A terminated chain holding what {@link groupByRank} returns.
   * @throws {@link InvalidArgumentError} When {@link groupByRank} would.
   *
   * @example
   * ```ts
   * import { card, chain, RankOrder } from "deckshoes";
   *
   * const hand = [card("7", "S"), card("K", "H"), card("7", "D")];
   * const groups = chain(hand).groupByRank(RankOrder.ACE_HIGH).value();
   * groups[RankOrder.ACE_HIGH.indexOf("7")]; // => [card("7", "S"), card("7", "D")]
   *
   * // The chain throws whatever groupByRank throws.
   * chain(hand).groupByRank(["2", "3"]); // throws INVALID_ARGUMENT
   * ```
   *
   * @since NEXT
   */
  groupByRank<D extends C & Readonly<Record<"rank", unknown>>>(
    this: Chain<D>,
    rankOrder: RankOrder<D["rank"]>,
  ): TerminatedChain<readonly CardStack<D>[]>;

  /**
   * Groups the cards in the stack the chain holds by suit with
   * {@link groupBySuit}, and ends the chain, because a pipeline can't carry on
   * from several stacks.
   *
   * To carry on with one group, wrap it again with `chain(group)`.
   *
   * @typeParam D - The type of card in the stack the chain holds, which has to
   * have a suit. It's taken from the chain, so you never write it.
   * @param suitOrder - The suit order that {@link groupBySuit} takes.
   * @returns A terminated chain holding what {@link groupBySuit} returns.
   * @throws {@link InvalidArgumentError} When {@link groupBySuit} would.
   *
   * @example
   * ```ts
   * import { card, chain, RankOrder, SuitOrder } from "deckshoes";
   *
   * const hand = [card("Q", "H"), card("3", "C"), card("A", "H")];
   * const [clubs, diamonds, hearts] = chain(hand)
   *   .sort(RankOrder.ACE_HIGH)
   *   .groupBySuit(SuitOrder.BRIDGE)
   *   .value();
   * clubs; // => [card("3", "C")]
   * diamonds; // => []
   * hearts; // => [card("Q", "H"), card("A", "H")]
   *
   * // The chain throws whatever groupBySuit throws.
   * chain(hand).groupBySuit(["S", "H"]); // throws INVALID_ARGUMENT
   * ```
   *
   * @since NEXT
   */
  groupBySuit<D extends C & Readonly<Record<"suit", unknown>>>(
    this: Chain<D>,
    suitOrder: SuitOrder<D["suit"]>,
  ): TerminatedChain<readonly CardStack<D>[]>;

  /**
   * Puts cards into the stack the chain holds with {@link insert}, and returns
   * a new chain holding the result.
   *
   * A chain can't name the size of the stack it holds, so pass
   * `Position.BOTTOM` to put the cards below the bottom card.
   *
   * @param cards - The cards that {@link insert} takes.
   * @param position - The position that {@link insert} takes.
   * @param options - The options that {@link insert} takes.
   * @returns A new chain holding the stack with `cards` in it.
   * @throws {@link InvalidArgumentError} When {@link insert} would.
   *
   * @example
   * ```ts
   * import { card, chain, Position } from "deckshoes";
   *
   * const hand = [card("A", "S"), card("K", "H")];
   * chain(hand).insert([card("10", "D")], Position.BOTTOM).value(); // => [card("A", "S"), card("K", "H"), card("10", "D")]
   *
   * // The chain throws whatever insert throws.
   * chain(hand).insert([card("10", "D")], 3); // throws INVALID_ARGUMENT
   * ```
   *
   * @since NEXT
   */
  insert(
    cards: CardStack<C>,
    position?: Position,
    options?: InsertOptions,
  ): Chain<C>;

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
   * @since 1.0.0
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
   * @since 1.0.0
   */
  peekBottom(count?: number): TerminatedChain<CardStack<C>>;

  /**
   * Removes particular cards from the stack the chain holds with
   * {@link remove}, and returns a new chain holding the result.
   *
   * @param cards - The cards that {@link remove} takes.
   * @returns A new chain holding the cards left.
   * @throws {@link InvalidArgumentError} When {@link remove} would.
   *
   * @example
   * ```ts
   * import { card, chain } from "deckshoes";
   *
   * const hand = [card("A", "S"), card("K", "H"), card("10", "D")];
   * chain(hand).remove([card("K", "H")]).value(); // => [card("A", "S"), card("10", "D")]
   *
   * // The chain throws whatever remove throws.
   * chain(hand).remove([card("Q", "C")]); // throws INVALID_ARGUMENT
   * ```
   *
   * @since NEXT
   */
  remove(cards: CardStack<C>): Chain<C>;

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
   * @since 1.0.0
   */
  shuffle(options?: ShuffleOptions): Chain<C>;

  /**
   * Sorts the stack the chain holds with {@link sort}, and returns a new chain
   * holding the result.
   *
   * @typeParam D - The type of card in the stack the chain holds, which has to
   * have a rank. It's taken from the chain, so you never write it.
   * @param rankOrder - The rank order that {@link sort} takes.
   * @param options - The options that {@link sort} takes.
   * @returns A new chain holding the sorted stack.
   * @throws {@link InvalidArgumentError} When {@link sort} would.
   *
   * @example
   * ```ts
   * import { card, chain, RankOrder, SuitOrder } from "deckshoes";
   * import { standard52 } from "deckshoes/presets";
   *
   * const hand = [card("K", "S"), card("2", "H"), card("A", "D")];
   * chain(hand).sort(RankOrder.ACE_HIGH).value(); // => [card("2", "H"), card("K", "S"), card("A", "D")]
   *
   * // Sort a deck, then draw from it.
   * const { cards } = chain(standard52())
   *   .sort(RankOrder.ACE_LOW, { suitOrder: SuitOrder.BRIDGE })
   *   .draw(4)
   *   .value();
   * cards; // => [card("A", "C"), card("A", "D"), card("A", "H"), card("A", "S")]
   *
   * // The chain throws whatever sort throws.
   * chain(hand).sort(["9", "10"]); // throws INVALID_ARGUMENT
   * ```
   *
   * @since NEXT
   */
  sort<D extends C & Readonly<Record<"rank", unknown>>>(
    this: Chain<D>,
    rankOrder: RankOrder<D["rank"]>,
    options?: SortOptions<D extends { readonly suit: infer S } ? S : never>,
  ): Chain<D>;

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
   * @since 1.0.0
   */
  value(): CardStack<C>;
}

/**
 * A chain holding something a pipeline can't carry on from, such as dealt
 * hands, drawn cards and the remainder, peeked cards, groups, or an answer such
 * as whether the stack contains some cards or how many match. It has no stack
 * operations and can only be unwrapped with
 * {@link TerminatedChain.value | value()}.
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
 * @since 1.0.0
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
   * @since 1.0.0
   */
  value(): R;
}

/** The chain that {@link TerminatedChain} describes: a frozen object holding a result. */
class Terminated<R> implements TerminatedChain<R> {
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

  contains(cards: CardStack<C>): TerminatedChain<boolean> {
    return new Terminated(contains(this.#stack, cards));
  }

  count(match: (card: C) => unknown): TerminatedChain<number> {
    return new Terminated(count(this.#stack, match));
  }

  cut(position?: Position, options?: CutOptions): Chain<C> {
    return new StackChain(cut(this.#stack, position, options));
  }

  deal(
    handCount: number,
    handSize: HandSize,
    options?: DealOptions,
  ): TerminatedChain<DealResult<C>> {
    return new Terminated(deal(this.#stack, handCount, handSize, options));
  }

  draw(count?: number): TerminatedChain<DrawResult<C>> {
    return new Terminated(draw(this.#stack, count));
  }

  drawBottom(count?: number): TerminatedChain<DrawResult<C>> {
    return new Terminated(drawBottom(this.#stack, count));
  }

  groupByRank<D extends C & Readonly<Record<"rank", unknown>>>(
    this: Chain<D>,
    rankOrder: RankOrder<D["rank"]>,
  ): TerminatedChain<readonly CardStack<D>[]> {
    return new Terminated(groupByRank(this.value(), rankOrder));
  }

  groupBySuit<D extends C & Readonly<Record<"suit", unknown>>>(
    this: Chain<D>,
    suitOrder: SuitOrder<D["suit"]>,
  ): TerminatedChain<readonly CardStack<D>[]> {
    return new Terminated(groupBySuit(this.value(), suitOrder));
  }

  insert(
    cards: CardStack<C>,
    position?: Position,
    options?: InsertOptions,
  ): Chain<C> {
    return new StackChain(insert(this.#stack, cards, position, options));
  }

  peek(count?: number): TerminatedChain<CardStack<C>> {
    return new Terminated(peek(this.#stack, count));
  }

  peekBottom(count?: number): TerminatedChain<CardStack<C>> {
    return new Terminated(peekBottom(this.#stack, count));
  }

  remove(cards: CardStack<C>): Chain<C> {
    return new StackChain(remove(this.#stack, cards));
  }

  shuffle(options?: ShuffleOptions): Chain<C> {
    return new StackChain(shuffle(this.#stack, options));
  }

  sort<D extends C & Readonly<Record<"rank", unknown>>>(
    this: Chain<D>,
    rankOrder: RankOrder<D["rank"]>,
    options?: SortOptions<D extends { readonly suit: infer S } ? S : never>,
  ): Chain<D> {
    return new StackChain(sort(this.value(), rankOrder, options));
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
 * @since 1.0.0
 */
export function chain<C>(stack: CardStack<C>): Chain<C> {
  const problem = stackProblem(stack);
  if (problem !== undefined) throw problem;
  return new StackChain(stack);
}
