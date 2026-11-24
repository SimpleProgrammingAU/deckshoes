import { describe, expectTypeOf, it } from "vitest";

import type { Shoe } from "./shoe.ts";
import type { CardStack } from "./stack.ts";

import { type Card, card } from "./card.ts";
import { cardFromJSON, shoeFromJSON, stackFromJSON } from "./json.ts";

describe("cardFromJSON, stackFromJSON and shoeFromJSON", () => {
  it("take any value, since parsed JSON is untyped", () => {
    expectTypeOf(cardFromJSON).parameters.toEqualTypeOf<[unknown]>();
    expectTypeOf(stackFromJSON).parameters.toEqualTypeOf<[unknown]>();
    expectTypeOf(shoeFromJSON).parameters.toEqualTypeOf<[unknown]>();
    expectTypeOf(cardFromJSON).toBeCallableWith(JSON.parse("{}"));
    expectTypeOf(stackFromJSON).toBeCallableWith([card("A", "S")]);
  });

  it("return a standard card, a stack of them, or a shoe of them", () => {
    expectTypeOf(cardFromJSON).returns.toEqualTypeOf<Card>();
    expectTypeOf(stackFromJSON).returns.toEqualTypeOf<CardStack>();
    expectTypeOf(shoeFromJSON).returns.toEqualTypeOf<Shoe>();
  });
});
