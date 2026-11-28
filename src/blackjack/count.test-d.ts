import { describe, expectTypeOf, it } from "vitest";

import { type Card, card } from "../card.ts";
import { standard52 } from "../presets/standard52.ts";
import { runningCount, type RunningCountOptions, trueCount } from "./count.ts";

describe("runningCount", () => {
  it("returns a number, and takes cards of the standard kind, frozen or not", () => {
    const cards: Card[] = [card("A", "S")];
    expectTypeOf(runningCount(standard52())).toEqualTypeOf<number>();
    expectTypeOf(runningCount).toBeCallableWith(cards);
    expectTypeOf(runningCount).toBeCallableWith(Object.freeze(cards));
    expectTypeOf(runningCount).toBeCallableWith([]);
  });

  it("gives the tag a standard card, and wants a number back", () => {
    runningCount(standard52(), {
      tag: (each) => {
        expectTypeOf(each).toEqualTypeOf<Card>();
        return 1;
      },
    });
    // @ts-expect-error A tag is a number.
    runningCount(standard52(), { tag: () => "1" });
    expectTypeOf<RunningCountOptions["tag"]>().toEqualTypeOf<
      ((card: Card) => number) | undefined
    >();
  });

  it("rejects a lone card and cards of another kind", () => {
    // @ts-expect-error The cards are always an array, even for one card.
    expectTypeOf(runningCount).toBeCallableWith(card("A", "S"));
    // @ts-expect-error The cards are standard cards.
    expectTypeOf(runningCount).toBeCallableWith([1, 2]);
  });
});

describe("trueCount", () => {
  it("returns a number from a running count, the cards left and a deck", () => {
    expectTypeOf(
      trueCount(6, standard52(), standard52()),
    ).toEqualTypeOf<number>();
  });

  it("requires the deck", () => {
    // @ts-expect-error The deck measures the decks left, so it's required.
    expectTypeOf(trueCount).toBeCallableWith(6, standard52());
  });
});
