import { describe, expectTypeOf, it } from "vitest";

import type { Card } from "../card.ts";
import type { CardStack } from "../stack.ts";

import { euchre } from "./euchre.ts";

describe("euchre", () => {
  it("returns a stack of standard cards", () => {
    expectTypeOf(euchre()).toEqualTypeOf<CardStack>();
    expectTypeOf(euchre()).toEqualTypeOf<readonly Card[]>();
  });

  it("returns a stack that can't be changed", () => {
    expectTypeOf(euchre()).not.toHaveProperty("push");
  });
});
