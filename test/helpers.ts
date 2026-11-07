import fc, { type Arbitrary } from "fast-check";

import type { RandomSource } from "../src/random.ts";
import type { ShuffleOptions } from "../src/shuffle.ts";
import type { CardStack } from "../src/stack.ts";

import { type Card, card } from "../src/card.ts";
import { standard52 } from "../src/presets/standard52.ts";

// Most test files import this module, so nothing here makes a card as it loads.
// A broken deck then fails only the tests that use one, and the rest still report.

/** Returns what `run` throws, failing the test if it doesn't throw. */
export function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error("Expected a throw, but nothing was thrown");
}

/** Writes a card as its rank and suit, such as "10H", to compare whole stacks. */
export function short({ rank, suit }: Card): string {
  return `${rank}${suit}`;
}

/** A random source that returns what `next` returns, as untyped sources can, and counts its calls. */
export function counted(next: () => unknown): RandomSource & { calls: number } {
  const wrapped = Object.assign(
    () => {
      wrapped.calls += 1;
      return next() as number;
    },
    { calls: 0 },
  );
  return wrapped;
}

/** Lets a test pass a value that isn't a stack, as untyped callers can. */
export function asStack(value: unknown): CardStack {
  return value as CardStack;
}

/** Lets a test pass options that aren't `ShuffleOptions`, as untyped callers can. */
export function asShuffleOptions(value: unknown): ShuffleOptions {
  return value as ShuffleOptions;
}

/** Labelled values for `it.each` that a stack operation must reject as its stack, because they aren't arrays. */
export function nonArrays(): readonly (readonly [
  label: string,
  value: unknown,
])[] {
  return [
    ["undefined", undefined],
    ["null", null],
    ["a string", "AS KH"],
    ["a one-character string", "A"],
    ["a Set", new Set(standard52())],
    ["an array-like object", { 0: card("A", "S"), length: 1 }],
  ];
}

/** A subclass whose constructor takes cards, so the `new Hand(length)` that `slice()` makes throws. */
class Hand<C> extends Array<C> {
  constructor(cards: readonly C[]) {
    super();
    this.push(...cards);
  }
}

/** A subclass with nothing added, so `slice()` gives another `Pile`. */
class Pile<C> extends Array<C> {}

/** A subclass that has `slice()` make an `Object`, which isn't an array. */
class ObjectSpecies<C> extends Array<C> {
  static override get [Symbol.species](): ArrayConstructor {
    return Object as unknown as ArrayConstructor;
  }
}

/** A subclass whose `slice()` silently loses the cards. */
class NoCardsSliced<C> extends Array<C> {
  override slice(): C[] {
    return [];
  }
}

/** Labelled ways to build an array, for `it.each`, whose `slice()` doesn't give a plain copy. A stack operation must still give plain frozen arrays holding the right cards. */
export function arraySubclasses(): readonly (readonly [
  label: string,
  make: <C>(cards: readonly C[]) => CardStack<C>,
])[] {
  return [
    ["a subclass whose constructor takes cards", (cards) => new Hand(cards)],
    ["a bare subclass", (cards) => Pile.from(cards)],
    [
      "a subclass with Object as its species",
      (cards) => ObjectSpecies.from(cards),
    ],
    [
      "a subclass whose slice loses the cards",
      (cards) => NoCardsSliced.from(cards),
    ],
  ];
}

/** Whether a value is a frozen array with nothing between it and `Array.prototype`. */
export function isPlainFrozen(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    Object.getPrototypeOf(value) === Array.prototype &&
    Object.isFrozen(value)
  );
}

/** Every seed a seeded random source takes. */
export const seeds: Arbitrary<number> = fc.integer({
  max: 0xff_ff_ff_ff,
  min: 0,
});

/** Stacks of standard cards, copies allowed, from none up to two decks' worth. */
export function stacks(): Arbitrary<Card[]> {
  // Without `size`, fast-check stops at 10 cards, whatever `maxLength` says.
  return fc.array(fc.constantFrom(...standard52()), {
    maxLength: 104,
    size: "max",
  });
}

/** A stack and a count from 0 up to its size. The stacks come from {@link stacks} unless `from` gives others. */
export function stacksWithCounts(): Arbitrary<{ count: number; stack: Card[] }>;
export function stacksWithCounts<C>(
  from: Arbitrary<C[]>,
): Arbitrary<{ count: number; stack: C[] }>;
export function stacksWithCounts(
  from: Arbitrary<unknown[]> = stacks(),
): Arbitrary<{ count: number; stack: unknown[] }> {
  return from.chain((stack) =>
    fc.record({
      count: fc.nat({ max: stack.length }),
      stack: fc.constant(stack),
    }),
  );
}
