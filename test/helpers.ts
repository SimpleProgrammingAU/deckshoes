import fc, { type Arbitrary } from "fast-check";

import type { RandomSource } from "../src/random.ts";
import type { ShuffleOptions } from "../src/shuffle.ts";

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
export function asStack(value: unknown): readonly Card[] {
  return value as readonly Card[];
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

/** Every seed a seeded random source takes. */
export const seeds: Arbitrary<number> = fc.integer({
  max: 0xff_ff_ff_ff,
  min: 0,
});

/** Stacks of standard cards, copies allowed, from none up to two decks' worth. */
export function stacks(): Arbitrary<Card[]> {
  return fc.array(fc.constantFrom(...standard52()), { maxLength: 104 });
}
