import { describe, expectTypeOf, it } from "vitest";

import type { Card } from "../card.ts";
import type { CardStack } from "../stack.ts";

import { standard52 } from "./standard52.ts";

describe("standard52", () => {
  it("returns a stack of standard cards", () => {
    expectTypeOf(standard52()).toEqualTypeOf<CardStack>();
    expectTypeOf(standard52()).toEqualTypeOf<readonly Card[]>();
  });

  it("returns a stack that can't be changed", () => {
    expectTypeOf(standard52()).not.toHaveProperty("push");
  });
});
