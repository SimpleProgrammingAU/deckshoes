import { describe, expectTypeOf, it } from "vitest";

import type { CardStack } from "./stack.ts";

import { draw, drawBottom, type DrawResult, peek, peekBottom } from "./draw.ts";
import { standard52 } from "./presets/standard52.ts";

describe("DrawResult", () => {
  it("names two stacks that can't be changed", () => {
    expectTypeOf<DrawResult<number>>().toEqualTypeOf<{
      readonly cards: CardStack<number>;
      readonly remainder: CardStack<number>;
    }>();
    expectTypeOf<DrawResult["cards"]>().not.toHaveProperty("push");
    expectTypeOf<DrawResult["remainder"]>().not.toHaveProperty("push");
  });
});

describe("draw and drawBottom", () => {
  it("draw the same kind of card", () => {
    expectTypeOf(draw(standard52(), 2)).toEqualTypeOf<DrawResult>();
    expectTypeOf(drawBottom(standard52(), 2)).toEqualTypeOf<DrawResult>();
    expectTypeOf(draw([1, 2, 3])).toEqualTypeOf<DrawResult<number>>();
    expectTypeOf(drawBottom([1, 2, 3])).toEqualTypeOf<DrawResult<number>>();
    expectTypeOf(draw(["a", "b"] as const)).toEqualTypeOf<
      DrawResult<"a" | "b">
    >();
    expectTypeOf(drawBottom(["a", "b"] as const)).toEqualTypeOf<
      DrawResult<"a" | "b">
    >();
  });
});

describe("peek and peekBottom", () => {
  it("return a stack of the same kind of card, which can't be changed", () => {
    expectTypeOf(peek(standard52(), 2)).toEqualTypeOf<CardStack>();
    expectTypeOf(peekBottom(standard52(), 2)).toEqualTypeOf<CardStack>();
    expectTypeOf(peek([1, 2, 3])).toEqualTypeOf<CardStack<number>>();
    expectTypeOf(peekBottom([1, 2, 3])).toEqualTypeOf<CardStack<number>>();
    expectTypeOf(peek(standard52())).not.toHaveProperty("push");
    expectTypeOf(peekBottom(standard52())).not.toHaveProperty("push");
  });
});

describe("every operation here", () => {
  it("takes a count, or undefined, or none at all", () => {
    expectTypeOf(draw).toBeCallableWith(standard52());
    expectTypeOf(draw).toBeCallableWith(standard52(), 2);
    expectTypeOf(draw).toBeCallableWith(standard52(), undefined);
    expectTypeOf(drawBottom).toBeCallableWith(standard52());
    expectTypeOf(drawBottom).toBeCallableWith(standard52(), 2);
    expectTypeOf(drawBottom).toBeCallableWith(standard52(), undefined);
    expectTypeOf(peek).toBeCallableWith(standard52());
    expectTypeOf(peek).toBeCallableWith(standard52(), 2);
    expectTypeOf(peek).toBeCallableWith(standard52(), undefined);
    expectTypeOf(peekBottom).toBeCallableWith(standard52());
    expectTypeOf(peekBottom).toBeCallableWith(standard52(), 2);
    expectTypeOf(peekBottom).toBeCallableWith(standard52(), undefined);
  });

  it("accepts a mutable array", () => {
    expectTypeOf(draw).toBeCallableWith([...standard52()], 1);
    expectTypeOf(peek).toBeCallableWith([...standard52()], 1);
  });

  it("rejects a count that isn't a number, a count in an options object, and a string as the stack", () => {
    // @ts-expect-error A count is a number.
    expectTypeOf(draw).toBeCallableWith(standard52(), "2");
    // @ts-expect-error Counts stay positional (ADR 0009).
    expectTypeOf(draw).toBeCallableWith(standard52(), { count: 2 });
    // @ts-expect-error A stack is an array of cards, not a string of them.
    expectTypeOf(draw).toBeCallableWith("AS KH", 1);
    // @ts-expect-error A count is a number.
    expectTypeOf(drawBottom).toBeCallableWith(standard52(), "2");
    // @ts-expect-error Counts stay positional (ADR 0009).
    expectTypeOf(drawBottom).toBeCallableWith(standard52(), { count: 2 });
    // @ts-expect-error A count is a number.
    expectTypeOf(peek).toBeCallableWith(standard52(), "2");
    // @ts-expect-error Counts stay positional (ADR 0009).
    expectTypeOf(peek).toBeCallableWith(standard52(), { count: 2 });
    // @ts-expect-error A count is a number.
    expectTypeOf(peekBottom).toBeCallableWith(standard52(), "2");
    // @ts-expect-error Counts stay positional (ADR 0009).
    expectTypeOf(peekBottom).toBeCallableWith(standard52(), { count: 2 });
  });
});
