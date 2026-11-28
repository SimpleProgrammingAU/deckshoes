import { describe, expectTypeOf, it } from "vitest";

import type { CardStack } from "../stack.ts";
import type { Category } from "./category.ts";

import { type Card, card } from "../card.ts";
import { standard52 } from "../presets/standard52.ts";
import { bestHand, compareHands, handCategory } from "./hand.ts";

describe("handCategory", () => {
  it("returns a category", () => {
    expectTypeOf(handCategory(standard52())).toEqualTypeOf<Category>();
  });
});

describe("bestHand", () => {
  it("returns a stack of standard cards", () => {
    expectTypeOf(bestHand(standard52())).toEqualTypeOf<CardStack>();
  });
});

describe("compareHands", () => {
  it("returns -1, 0 or 1", () => {
    expectTypeOf(compareHands(standard52(), standard52())).toEqualTypeOf<
      -1 | 0 | 1
    >();
  });

  it("works as a sort comparator", () => {
    const players: CardStack[] = [standard52(), standard52()];
    expectTypeOf(players.toSorted(compareHands)).toEqualTypeOf<CardStack[]>();
  });
});

describe.each([
  ["handCategory", handCategory],
  ["bestHand", bestHand],
  ["compareHands", (cards: CardStack) => compareHands(cards, cards)],
] as const)("%s", (_name, operation) => {
  it("takes standard cards, frozen or not", () => {
    const cards: Card[] = [card("A", "S"), card("K", "H")];
    expectTypeOf(operation).toBeCallableWith(cards);
    expectTypeOf(operation).toBeCallableWith(Object.freeze(cards));
    expectTypeOf(operation).toBeCallableWith([]);
  });

  it("rejects a lone card and cards of another kind", () => {
    // @ts-expect-error The cards are always an array, even of one card.
    expectTypeOf(operation).toBeCallableWith(card("A", "S"));
    // @ts-expect-error The cards are standard cards.
    expectTypeOf(operation).toBeCallableWith([1, 2]);
    // @ts-expect-error A look-alike isn't a standard card (ADR 0002).
    expectTypeOf(operation).toBeCallableWith([
      { rank: "A", suit: "S", color: "black" },
    ]);
  });
});

describe("compareHands's other cards", () => {
  it("are standard cards too", () => {
    const cards: Card[] = [card("A", "S")];
    expectTypeOf(compareHands).toBeCallableWith(cards, Object.freeze(cards));
    // @ts-expect-error The other cards are always an array.
    expectTypeOf(compareHands).toBeCallableWith(cards, card("A", "S"));
  });
});
