import { describe, expectTypeOf, it } from "vitest";

import type { Card } from "../card.ts";
import type { CardStack } from "../stack.ts";

import { piquet } from "./piquet.ts";

describe("piquet", () => {
  it("returns a stack of standard cards", () => {
    expectTypeOf(piquet()).toEqualTypeOf<CardStack>();
    expectTypeOf(piquet()).toEqualTypeOf<readonly Card[]>();
  });

  it("returns a stack that can't be changed", () => {
    expectTypeOf(piquet()).not.toHaveProperty("push");
  });
});
