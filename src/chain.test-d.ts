import { describe, expectTypeOf, it } from "vitest";

import type { Card } from "./card.ts";
import type { draw, drawBottom, DrawResult, peek, peekBottom } from "./draw.ts";
import type { shuffle, ShuffleOptions } from "./shuffle.ts";
import type { CardStack } from "./stack.ts";

import { chain, type Chain, type TerminatedChain } from "./chain.ts";
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

describe("TerminatedChain", () => {
  it("can only be unwrapped, to what it holds", () => {
    expectTypeOf<keyof TerminatedChain<unknown>>().toEqualTypeOf<"value">();
    expectTypeOf<TerminatedChain<boolean>["value"]>().toEqualTypeOf<
      () => boolean
    >();
  });
});

describe("Chain.draw and Chain.drawBottom", () => {
  it("end the chain, keeping the kind of card", () => {
    expectTypeOf(chain(standard52()).draw()).toEqualTypeOf<
      TerminatedChain<DrawResult>
    >();
    expectTypeOf(chain(standard52()).drawBottom()).toEqualTypeOf<
      TerminatedChain<DrawResult>
    >();
    expectTypeOf(chain(["a", "b"] as const).draw()).toEqualTypeOf<
      TerminatedChain<DrawResult<"a" | "b">>
    >();
    expectTypeOf(chain(["a", "b"] as const).drawBottom()).toEqualTypeOf<
      TerminatedChain<DrawResult<"a" | "b">>
    >();
  });

  it("unwrap to what the functions return", () => {
    expectTypeOf(chain(standard52()).draw().value()).toEqualTypeOf<
      ReturnType<typeof draw<Card>>
    >();
    expectTypeOf(chain(standard52()).drawBottom().value()).toEqualTypeOf<
      ReturnType<typeof drawBottom<Card>>
    >();
  });

  it("take the functions' parameters after the stack", () => {
    expectTypeOf<Parameters<Chain["draw"]>>().toEqualTypeOf<
      AfterStack<typeof draw<Card>>
    >();
    expectTypeOf<Parameters<Chain["drawBottom"]>>().toEqualTypeOf<
      AfterStack<typeof drawBottom<Card>>
    >();
    expectTypeOf<Parameters<Chain["draw"]>>().toEqualTypeOf<
      // An optional parameter also takes undefined, under exactOptionalPropertyTypes.
      [count?: number | undefined]
    >();
  });
});

describe("Chain.peek and Chain.peekBottom", () => {
  it("end the chain, keeping the kind of card", () => {
    expectTypeOf(chain(standard52()).peek()).toEqualTypeOf<
      TerminatedChain<CardStack>
    >();
    expectTypeOf(chain(standard52()).peekBottom()).toEqualTypeOf<
      TerminatedChain<CardStack>
    >();
    expectTypeOf(chain(["a", "b"] as const).peek()).toEqualTypeOf<
      TerminatedChain<CardStack<"a" | "b">>
    >();
    expectTypeOf(chain(["a", "b"] as const).peekBottom()).toEqualTypeOf<
      TerminatedChain<CardStack<"a" | "b">>
    >();
  });

  it("unwrap to what the functions return", () => {
    expectTypeOf(chain(standard52()).peek().value()).toEqualTypeOf<
      ReturnType<typeof peek<Card>>
    >();
    expectTypeOf(chain(standard52()).peekBottom().value()).toEqualTypeOf<
      ReturnType<typeof peekBottom<Card>>
    >();
  });

  it("take the functions' parameters after the stack", () => {
    expectTypeOf<Parameters<Chain["peek"]>>().toEqualTypeOf<
      AfterStack<typeof peek<Card>>
    >();
    expectTypeOf<Parameters<Chain["peekBottom"]>>().toEqualTypeOf<
      AfterStack<typeof peekBottom<Card>>
    >();
  });

  it("can't be carried on from, as the peeked cards are still in the stack", () => {
    // @ts-expect-error A pipeline can't carry on from peeked cards.
    expectTypeOf(chain(standard52()).peek(2)).toHaveProperty("shuffle");
    // @ts-expect-error A pipeline can't carry on from peeked cards.
    expectTypeOf(chain(standard52()).peekBottom(2)).toHaveProperty("shuffle");
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
    // The function for the same kind of card as Chain's, so that a parameter
    // that mentions the card type matches too.
    expectTypeOf<Parameters<Chain["shuffle"]>>().toEqualTypeOf<
      AfterStack<typeof shuffle<Card>>
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
