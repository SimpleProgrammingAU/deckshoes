import { describe, expectTypeOf, it } from "vitest";

import { type Card, card } from "../card.ts";
import { standard52 } from "../presets/standard52.ts";
import { distribution, highCardPoints } from "./hand.ts";

describe("highCardPoints", () => {
  it("returns a number", () => {
    expectTypeOf(highCardPoints(standard52())).toEqualTypeOf<number>();
  });
});

describe("distribution", () => {
  it("returns four suit lengths that can't be changed", () => {
    expectTypeOf(distribution(standard52())).toEqualTypeOf<
      readonly [number, number, number, number]
    >();
  });

  it("gives a number for each length taken apart, with no undefined", () => {
    const [longest, second, third, shortest] = distribution(standard52());
    expectTypeOf(longest).toEqualTypeOf<number>();
    expectTypeOf(second).toEqualTypeOf<number>();
    expectTypeOf(third).toEqualTypeOf<number>();
    expectTypeOf(shortest).toEqualTypeOf<number>();
  });

  it("isn't an array that can be sorted or written to", () => {
    expectTypeOf(distribution(standard52())).not.toExtend<number[]>();
  });
});

describe.each([
  ["highCardPoints", highCardPoints],
  ["distribution", distribution],
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
