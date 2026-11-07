import type { Card } from "../src/card.ts";
import type { RandomSource } from "../src/random.ts";

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

/** A random source that returns each 32-bit integer in turn as a value from 0 up to 1, and fails the test if it's called too often. */
export function integerSource(...integers: number[]): RandomSource {
  let calls = 0;
  return () => {
    const integer = integers[calls];
    calls += 1;
    if (integer === undefined)
      throw new Error("The source was called too often");
    return integer / 2 ** 32;
  };
}
