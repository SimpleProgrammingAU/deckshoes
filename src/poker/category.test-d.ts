import { describe, expectTypeOf, it } from "vitest";

import { Category } from "./category.ts";

describe("Category", () => {
  it("is the nine categories' names", () => {
    expectTypeOf<Category>().toEqualTypeOf<
      | "flush"
      | "four of a kind"
      | "full house"
      | "high card"
      | "one pair"
      | "straight"
      | "straight flush"
      | "three of a kind"
      | "two pair"
    >();
  });

  it("has a key for each, its value in capitals", () => {
    expectTypeOf(Category.STRAIGHT_FLUSH).toEqualTypeOf<"straight flush">();
    expectTypeOf(Category.ONE_PAIR).toEqualTypeOf<"one pair">();
  });
});
