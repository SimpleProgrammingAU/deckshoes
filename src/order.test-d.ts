import { describe, expectTypeOf, it } from "vitest";

import { type Card, card, type Rank, type Suit } from "./card.ts";
import { compareCards, RankOrder, SuitOrder } from "./order.ts";

/** A card from a deck with ranks beyond the standard ones, as in the 500 deck. */
interface FiveHundredCard {
  readonly rank: "11" | "12" | "13" | Rank;
  readonly suit: Suit;
}

/** A card with a rank and a colour but no suit. */
interface UnsuitedCard {
  readonly color: "green";
  readonly rank: number;
}

const ace = card("A", "S");
const king = card("K", "S");

describe("RankOrder and SuitOrder", () => {
  it("are read-only lists of standard ranks and suits by default", () => {
    expectTypeOf(RankOrder.ACE_HIGH).toEqualTypeOf<readonly Rank[]>();
    expectTypeOf(RankOrder.ACE_LOW).toEqualTypeOf<RankOrder>();
    expectTypeOf(SuitOrder.BRIDGE).toEqualTypeOf<readonly Suit[]>();
    expectTypeOf<RankOrder<number>>().toEqualTypeOf<readonly number[]>();
    expectTypeOf<SuitOrder<"stars">>().toEqualTypeOf<readonly "stars"[]>();
    expectTypeOf(RankOrder.ACE_HIGH).not.toHaveProperty("push");
  });

  it("type an order written out, and reject one that isn't", () => {
    const pinochle: RankOrder = ["9", "J", "Q", "K", "10", "A"];
    expectTypeOf(pinochle).toEqualTypeOf<readonly Rank[]>();
    // @ts-expect-error "11" isn't a standard rank.
    const eleven: RankOrder = ["10", "11"];
    expectTypeOf(eleven).toEqualTypeOf<readonly Rank[]>();
    // @ts-expect-error "X" isn't a standard suit.
    const unknown: SuitOrder = ["S", "X"];
    expectTypeOf(unknown).toEqualTypeOf<readonly Suit[]>();
  });
});

describe("compareCards", () => {
  it("returns -1, 0 or 1", () => {
    expectTypeOf(compareCards(ace, king, RankOrder.ACE_HIGH)).toEqualTypeOf<
      -1 | 0 | 1
    >();
  });

  it("takes orders of the cards' ranks and suits, frozen or not", () => {
    expectTypeOf(compareCards<Card>).toBeCallableWith(
      ace,
      king,
      ["9", "J", "Q", "K", "10", "A"],
      { suitOrder: ["D", "C", "H", "S"] },
    );
    expectTypeOf(compareCards<Card>).toBeCallableWith(
      ace,
      king,
      RankOrder.ACE_LOW,
      { suitOrder: undefined },
    );
    expectTypeOf(compareCards<Card>).toBeCallableWith(
      ace,
      king,
      RankOrder.ACE_HIGH.toReversed(),
    );
  });

  it("rejects ranks and suits the cards can't have, and an order typed as strings", () => {
    // @ts-expect-error "11" isn't a standard rank.
    expectTypeOf(compareCards<Card>).toBeCallableWith(ace, king, ["11"]);
    // @ts-expect-error "X" isn't a standard suit.
    compareCards(ace, king, RankOrder.ACE_HIGH, { suitOrder: ["X"] });
    const untyped = ["9", "J"];
    // @ts-expect-error An order typed string[] could hold anything.
    expectTypeOf(compareCards<Card>).toBeCallableWith(ace, king, untyped);
  });

  it("works on cards that aren't standard cards, by their own ranks and suits", () => {
    const eleven: FiveHundredCard = { rank: "11", suit: "S" };
    expectTypeOf(
      compareCards(eleven, eleven, ["10", "11", "12", "13", "J"]),
    ).toEqualTypeOf<-1 | 0 | 1>();
    const green: UnsuitedCard = { color: "green", rank: 7 };
    expectTypeOf(compareCards(green, green, [1, 7])).toEqualTypeOf<
      -1 | 0 | 1
    >();
    // @ts-expect-error A card with no suit takes no suit order.
    compareCards(green, green, [7], { suitOrder: ["S"] });
    // @ts-expect-error A card with no rank can't be compared by rank.
    compareCards({ color: "red" }, { color: "red" }, []);
  });

  it("rejects two different kinds of card", () => {
    const green: UnsuitedCard = { color: "green", rank: 7 };
    // @ts-expect-error Both cards are the same kind.
    const mixed = compareCards(ace, green, RankOrder.ACE_HIGH);
    expectTypeOf(mixed).toEqualTypeOf<-1 | 0 | 1>();
  });
});
