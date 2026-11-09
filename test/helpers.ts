import fc, { type Arbitrary } from "fast-check";

import type { RandomSource } from "../src/random.ts";
import type { ShuffleOptions } from "../src/shuffle.ts";
import type { CardStack } from "../src/stack.ts";

import { type Card, card, type Rank, type Suit } from "../src/card.ts";
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

/** Whether two arrays hold the very same values (`Object.is`) in the same order, reading a hole as `undefined`. */
export function sameValues(
  actual: readonly unknown[],
  expected: readonly unknown[],
): boolean {
  if (actual.length !== expected.length) return false;
  for (const [i, value] of actual.entries()) {
    if (!Object.is(value, expected[i])) return false;
  }
  return true;
}

/** Writes a card as its rank and suit, such as "10H", to compare whole stacks. */
export function short({ rank, suit }: Card): string {
  return `${rank}${suit}`;
}

// The standard ranks and suits are written out here rather than imported, so
// the tests don't share the implementation's lists.

/** Every standard rank, from ace to king. */
export const standardRanks: readonly unknown[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

/** Every standard suit. */
export const standardSuits: readonly unknown[] = ["S", "H", "D", "C"];

/** Lets a test pass a value that isn't a rank, as untyped callers can. */
export function asRank(value: unknown): Rank {
  return value as Rank;
}

/** Lets a test pass a value that isn't a suit, as untyped callers can. */
export function asSuit(value: unknown): Suit {
  return value as Suit;
}

/** Every standard rank and suit pair, from {@link standardRanks} and {@link standardSuits}. */
export const standardPairs: readonly (readonly [Rank, Suit])[] =
  standardRanks.flatMap((rank) =>
    standardSuits.map((suit) => [asRank(rank), asSuit(suit)] as const),
  );

/** Labelled values that are neither a standard rank nor a standard suit. */
function neitherRankNorSuit(): readonly (readonly [
  label: string,
  value: unknown,
])[] {
  return [
    ["11", "11"],
    ["1", "1"],
    ["T", "T"],
    ["lower case", "a"],
    ["a suit symbol", "♠"],
    ["an empty string", ""],
    ["padding", " A"],
    ["a number", 10],
    ["null", null],
    ["undefined", undefined],
    ["an object without a prototype", Object.create(null)],
    ["a prototype key", "constructor"],
    ["__proto__", "__proto__"],
  ];
}

/** Labelled values for `it.each` that aren't standard ranks: those in {@link neitherRankNorSuit}, and a suit. */
export function nonRanks(): readonly (readonly [
  label: string,
  value: unknown,
])[] {
  return [...neitherRankNorSuit(), ["a suit", "S"]];
}

/** Labelled values for `it.each` that aren't standard suits: those in {@link neitherRankNorSuit}, a rank and a lower-case suit. */
export function nonSuits(): readonly (readonly [
  label: string,
  value: unknown,
])[] {
  return [...neitherRankNorSuit(), ["a rank", "A"], ["a lower-case suit", "s"]];
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

/** A subclass whose constructor takes a stack, so the `new Hand(length)` that `slice()` makes throws. */
class Hand<C> extends Array<C> {
  constructor(stack: CardStack<C>) {
    super();
    this.push(...stack);
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

/** A subclass whose iterator yields nothing, so spreading it silently loses the cards. */
class NoCardsIterated<C> extends Array<C> {
  override [Symbol.iterator](): ArrayIterator<C> {
    return ([] as C[])[Symbol.iterator]();
  }
}

/** A subclass with no iterator, so spreading it throws. */
class NoIterator<C> extends Array<C> {}
Object.defineProperty(NoIterator.prototype, Symbol.iterator, {
  value: undefined,
});

/** Labelled ways to build an array, for `it.each`, that copying with `slice()` or a spread gets wrong. A stack operation must still give plain frozen arrays holding the right cards. */
export function arraySubclasses(): readonly (readonly [
  label: string,
  make: <C>(stack: CardStack<C>) => CardStack<C>,
])[] {
  return [
    ["a subclass whose constructor takes a stack", (stack) => new Hand(stack)],
    ["a bare subclass", (stack) => Pile.from(stack)],
    [
      "a subclass with Object as its species",
      (stack) => ObjectSpecies.from(stack),
    ],
    [
      "a subclass whose slice loses the cards",
      (stack) => NoCardsSliced.from(stack),
    ],
    [
      "a subclass whose iterator loses the cards",
      (stack) => NoCardsIterated.from(stack),
    ],
    ["a subclass with no iterator", (stack) => NoIterator.from(stack)],
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

/** Stacks of standard cards with holes in them, up to two decks' worth of slots. */
export function sparseStacks(): Arbitrary<Card[]> {
  // Without `maxLength`, fast-check can make arrays too big to copy.
  return fc.sparseArray(fc.constantFrom(...standard52()), { maxLength: 104 });
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

/** What {@link deals} gives: the arguments for one deal. */
export interface DealArguments<C> {
  deck: C[];
  handCount: number;
  handSize: number;
  packetSize: number | undefined;
}

/**
 * A deck with a hand count and hand size it holds enough cards for, both 1 or
 * more, and a packet size that's sometimes left out and sometimes bigger than
 * the hand. The decks come from {@link stacks} unless `from` gives others.
 */
export function deals(): Arbitrary<DealArguments<Card>>;
export function deals<C>(from: Arbitrary<C[]>): Arbitrary<DealArguments<C>>;
export function deals(
  from: Arbitrary<unknown[]> = stacks(),
): Arbitrary<DealArguments<unknown>> {
  return from
    .filter((deck) => deck.length > 0)
    .chain((deck) =>
      fc.integer({ max: deck.length, min: 1 }).chain((handCount) =>
        fc.record({
          deck: fc.constant(deck),
          handCount: fc.constant(handCount),
          handSize: fc.integer({
            max: Math.floor(deck.length / handCount),
            min: 1,
          }),
          packetSize: fc.option(fc.integer({ max: 8, min: 1 }), {
            nil: undefined,
          }),
        }),
      ),
    );
}
