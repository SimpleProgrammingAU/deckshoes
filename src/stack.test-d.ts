import { describe, expectTypeOf, it } from "vitest";

import type { Card } from "./card.ts";
import type { CardStack } from "./stack.ts";

describe("CardStack", () => {
  it("holds standard cards unless told otherwise", () => {
    expectTypeOf<CardStack>().toEqualTypeOf<readonly Card[]>();
    expectTypeOf<CardStack<number>>().toEqualTypeOf<readonly number[]>();
  });

  it("accepts a mutable array, but can't be used as one", () => {
    expectTypeOf<Card[]>().toExtend<CardStack>();
    expectTypeOf<CardStack>().not.toExtend<Card[]>();
  });

  it("has no methods that change it", () => {
    expectTypeOf<CardStack>().not.toHaveProperty("push");
    expectTypeOf<CardStack>().not.toHaveProperty("sort");
  });
});
