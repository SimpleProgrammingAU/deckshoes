import { describe, expectTypeOf, it } from "vitest";

import type { Card } from "../card.ts";
import type { CardStack } from "../stack.ts";

import { pinochle, type PinochleOptions } from "./pinochle.ts";

describe("pinochle", () => {
  it("returns a stack of standard cards", () => {
    expectTypeOf(pinochle()).toEqualTypeOf<CardStack>();
    expectTypeOf(pinochle({ size: 80 })).toEqualTypeOf<readonly Card[]>();
  });

  it("returns a stack that can't be changed", () => {
    expectTypeOf(pinochle()).not.toHaveProperty("push");
  });

  it("takes a size of 48, 64, 80 or 120, or none", () => {
    expectTypeOf<PinochleOptions["size"]>().toEqualTypeOf<
      48 | 64 | 80 | 120 | undefined
    >();
    expectTypeOf(pinochle).toBeCallableWith();
    expectTypeOf(pinochle).toBeCallableWith({});
    expectTypeOf(pinochle).toBeCallableWith({ size: undefined });
    expectTypeOf(pinochle).toBeCallableWith({ size: 120 });
  });

  it("rejects other sizes, and a size in place of the options", () => {
    // @ts-expect-error 72 isn't one of the documented decks.
    expectTypeOf(pinochle).toBeCallableWith({ size: 72 });
    // @ts-expect-error The size is a number, not a string.
    expectTypeOf(pinochle).toBeCallableWith({ size: "80" });
    // @ts-expect-error The size goes in the options object (ADR 0009).
    expectTypeOf(pinochle).toBeCallableWith(80);
  });
});
