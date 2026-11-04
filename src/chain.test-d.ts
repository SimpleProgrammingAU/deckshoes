import { describe, expectTypeOf, it } from "vitest";

import type { Card } from "./card.ts";
import type { shuffle, ShuffleOptions } from "./shuffle.ts";
import type { CardStack } from "./stack.ts";

import { chain, type Chain } from "./chain.ts";
import { standard52 } from "./presets/standard52.ts";
import { seededRandom } from "./random.ts";

/** A function's parameters without the first one, the stack. */
type AfterStack<F extends (...args: never[]) => unknown> =
  Parameters<F> extends [unknown, ...infer Rest] ? Rest : never;

describe("chain", () => {
  it("holds the same kind of card as the stack", () => {
    expectTypeOf(chain(standard52())).toEqualTypeOf<Chain>();
    expectTypeOf<ReturnType<Chain["value"]>>().toEqualTypeOf<readonly Card[]>();
    expectTypeOf(chain([1, 2, 3])).toEqualTypeOf<Chain<number>>();
    expectTypeOf(chain(["a", "b"] as const)).toEqualTypeOf<Chain<"a" | "b">>();
  });

  it("accepts a mutable array, but not a string", () => {
    expectTypeOf(chain).toBeCallableWith([...standard52()]);
    // @ts-expect-error A stack is an array of cards, not a string of them.
    expectTypeOf(chain).toBeCallableWith("AS KH");
  });

  it("unwraps to a stack that can't be changed", () => {
    expectTypeOf(chain(standard52()).value()).toEqualTypeOf<CardStack>();
    expectTypeOf(chain([1, 2, 3]).value()).toEqualTypeOf<CardStack<number>>();
    expectTypeOf(chain(standard52()).value()).not.toHaveProperty("push");
  });
});

describe("Chain.shuffle", () => {
  it("keeps the kind of card, and unwraps to what the function returns", () => {
    expectTypeOf(chain(["a", "b"] as const).shuffle()).toEqualTypeOf<
      Chain<"a" | "b">
    >();
    expectTypeOf(chain(standard52()).shuffle().value()).toEqualTypeOf<
      ReturnType<typeof shuffle<Card>>
    >();
  });

  it("takes the function's parameters after the stack", () => {
    expectTypeOf<Parameters<Chain["shuffle"]>>().toEqualTypeOf<
      AfterStack<typeof shuffle>
    >();
    expectTypeOf<Parameters<Chain["shuffle"]>>().toEqualTypeOf<
      // An optional parameter also takes undefined, under exactOptionalPropertyTypes.
      [options?: ShuffleOptions | undefined]
    >();
  });

  it("takes a random source, or undefined, as its random option", () => {
    expectTypeOf<Chain["shuffle"]>().toBeCallableWith({
      random: seededRandom(42),
    });
    expectTypeOf<Chain["shuffle"]>().toBeCallableWith({ random: undefined });
    expectTypeOf<Chain["shuffle"]>().toBeCallableWith({});
    expectTypeOf<Chain["shuffle"]>().toBeCallableWith();
  });

  it("rejects a seed as the random option, and a source in place of the options", () => {
    // @ts-expect-error A random source is a function, not a seed.
    expectTypeOf<Chain["shuffle"]>().toBeCallableWith({ random: 42 });
    // @ts-expect-error Settings go in an options object (ADR 0009).
    expectTypeOf<Chain["shuffle"]>().toBeCallableWith(seededRandom(42));
  });
});
