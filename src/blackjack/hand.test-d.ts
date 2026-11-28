import { describe, expectTypeOf, it } from "vitest";

import { type Card, card } from "../card.ts";
import { standard52 } from "../presets/standard52.ts";
import { handTotal, isBlackjack, isBust, isSoft } from "./hand.ts";

describe("handTotal", () => {
  it("returns a number", () => {
    expectTypeOf(handTotal(standard52())).toEqualTypeOf<number>();
  });
});

describe("isSoft, isBlackjack and isBust", () => {
  it("return a boolean", () => {
    expectTypeOf(isSoft(standard52())).toEqualTypeOf<boolean>();
    expectTypeOf(isBlackjack(standard52())).toEqualTypeOf<boolean>();
    expectTypeOf(isBust(standard52())).toEqualTypeOf<boolean>();
  });
});

describe.each([
  ["handTotal", handTotal],
  ["isSoft", isSoft],
  ["isBlackjack", isBlackjack],
  ["isBust", isBust],
] as const)("%s", (_name, operation) => {
  it("takes a hand of standard cards, frozen or not", () => {
    const hand: Card[] = [card("A", "S"), card("K", "H")];
    expectTypeOf(operation).toBeCallableWith(hand);
    expectTypeOf(operation).toBeCallableWith(Object.freeze(hand));
    expectTypeOf(operation).toBeCallableWith([]);
  });

  it("rejects a lone card and cards of another kind", () => {
    // @ts-expect-error A hand is always an array, even of one card.
    expectTypeOf(operation).toBeCallableWith(card("A", "S"));
    // @ts-expect-error A hand holds standard cards.
    expectTypeOf(operation).toBeCallableWith([1, 2]);
    // @ts-expect-error A look-alike isn't a standard card (ADR 0002).
    expectTypeOf(operation).toBeCallableWith([
      { rank: "A", suit: "S", color: "black" },
    ]);
  });
});
