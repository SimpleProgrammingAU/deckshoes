import { describe, expectTypeOf, it } from "vitest";

import type { CardStack } from "./stack.ts";

import { standard52 } from "./presets/standard52.ts";
import { type RandomSource, seededRandom } from "./random.ts";
import { shuffle, type ShuffleOptions } from "./shuffle.ts";

describe("shuffle", () => {
  it("returns a stack of the same kind of card", () => {
    expectTypeOf(shuffle(standard52())).toEqualTypeOf<CardStack>();
    expectTypeOf(shuffle([1, 2, 3])).toEqualTypeOf<CardStack<number>>();
    expectTypeOf(shuffle(["a", "b"] as const)).toEqualTypeOf<
      CardStack<"a" | "b">
    >();
  });

  it("returns a stack that can't be changed", () => {
    expectTypeOf(shuffle(standard52())).not.toHaveProperty("push");
  });

  it("takes a random source, or undefined, as its random option", () => {
    expectTypeOf<ShuffleOptions>().toEqualTypeOf<{
      readonly random?: RandomSource | undefined;
    }>();
    expectTypeOf(shuffle).toBeCallableWith(standard52(), {
      random: seededRandom(42),
    });
    expectTypeOf(shuffle).toBeCallableWith(standard52(), {
      random: Math.random,
    });
    expectTypeOf(shuffle).toBeCallableWith(standard52(), {
      random: undefined,
    });
    expectTypeOf(shuffle).toBeCallableWith(standard52(), {});
  });

  it("rejects a seed as the random option, and a source in place of the options", () => {
    // @ts-expect-error A random source is a function, not a seed.
    expectTypeOf(shuffle).toBeCallableWith(standard52(), { random: 42 });
    // @ts-expect-error Settings go in an options object (ADR 0009).
    expectTypeOf(shuffle).toBeCallableWith(standard52(), seededRandom(42));
  });
});
