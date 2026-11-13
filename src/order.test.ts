import fc, { type Arbitrary } from "fast-check";
import { describe, expect, it } from "vitest";

import {
  arraySubclasses,
  standardRanks,
  standardSuits,
  thrownBy,
} from "../test/helpers.ts";
import { type Card, card, type Rank, type Suit } from "./card.ts";
import {
  compareCards,
  type CompareCardsOptions,
  RankOrder,
  SuitOrder,
} from "./order.ts";
import { standard52 } from "./presets/standard52.ts";

/** Every rank order of the standard ranks: each one listed once, in any order. */
function rankOrders(): Arbitrary<Rank[]> {
  return fc.shuffledSubarray(standardRanks as Rank[], {
    maxLength: 13,
    minLength: 13,
  });
}

/** Every suit order of the standard suits: each one listed once, in any order. */
function suitOrders(): Arbitrary<Suit[]> {
  return fc.shuffledSubarray(standardSuits as Suit[], {
    maxLength: 4,
    minLength: 4,
  });
}

/** Any standard card. */
function cards(): Arbitrary<Card> {
  return fc.constantFrom(...standard52());
}

/** Lets a test pass options that aren't `CompareCardsOptions`, as untyped callers can. */
function asOptions(value: unknown): CompareCardsOptions {
  return value as CompareCardsOptions;
}

/** Lets a test pass a value that isn't a rank order, as untyped callers can. */
function asRankOrder(value: unknown): RankOrder {
  return value as RankOrder;
}

/** What comparing two cards should give, worked out with `indexOf`: -1, 0 or 1. */
function compareOracle(
  a: Card,
  b: Card,
  rankOrder: readonly Rank[],
  suitOrder?: readonly Suit[],
): number {
  const byRank = Math.sign(
    rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank),
  );
  const bySuit =
    suitOrder === undefined
      ? 0
      : Math.sign(suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit));
  // `|| 0` turns -0 into 0, which toBe tells apart.
  return byRank || bySuit || 0;
}

describe("RankOrder", () => {
  it("lists the standard ranks with the ace low, then with it high", () => {
    // standardRanks runs from ace to king.
    expect(RankOrder.ACE_LOW).toStrictEqual(standardRanks);
    expect(RankOrder.ACE_HIGH).toStrictEqual([...standardRanks.slice(1), "A"]);
  });

  it("is frozen, and so is each order", () => {
    expect(Object.isFrozen(RankOrder)).toBe(true);
    expect(Object.isFrozen(RankOrder.ACE_HIGH)).toBe(true);
    expect(Object.isFrozen(RankOrder.ACE_LOW)).toBe(true);
    expect(Object.keys(RankOrder)).toStrictEqual(["ACE_HIGH", "ACE_LOW"]);
  });
});

describe("SuitOrder", () => {
  it("lists the standard suits in bridge order, clubs lowest", () => {
    expect(SuitOrder.BRIDGE).toStrictEqual(["C", "D", "H", "S"]);
    expect(new Set(SuitOrder.BRIDGE)).toStrictEqual(new Set(standardSuits));
  });

  it("is frozen, and so is its order", () => {
    expect(Object.isFrozen(SuitOrder)).toBe(true);
    expect(Object.isFrozen(SuitOrder.BRIDGE)).toBe(true);
    expect(Object.keys(SuitOrder)).toStrictEqual(["BRIDGE"]);
  });
});

describe("compareCards", () => {
  it("compares by rank, leaving cards of the same rank tied, as the oracle does", () => {
    fc.assert(
      fc.property(cards(), cards(), rankOrders(), (a, b, rankOrder) => {
        expect(compareCards(a, b, rankOrder)).toBe(
          compareOracle(a, b, rankOrder),
        );
      }),
    );
  });

  it("separates cards of the same rank with a suit order, as the oracle does", () => {
    fc.assert(
      fc.property(
        cards(),
        cards(),
        rankOrders(),
        suitOrders(),
        (a, b, rankOrder, suitOrder) => {
          expect(compareCards(a, b, rankOrder, { suitOrder })).toBe(
            compareOracle(a, b, rankOrder, suitOrder),
          );
        },
      ),
    );
  });

  it("is antisymmetric", () => {
    fc.assert(
      fc.property(
        cards(),
        cards(),
        rankOrders(),
        fc.option(suitOrders(), { nil: undefined }),
        (a, b, rankOrder, suitOrder) => {
          const options = { suitOrder };
          const forward = compareCards(a, b, rankOrder, options);
          expect(compareCards(b, a, rankOrder, options)).toBe(-forward || 0);
        },
      ),
    );
  });

  it("ties a card only with itself when there's a suit order", () => {
    fc.assert(
      fc.property(
        cards(),
        cards(),
        rankOrders(),
        suitOrders(),
        (a, b, rankOrder, suitOrder) => {
          const tie = compareCards(a, b, rankOrder, { suitOrder }) === 0;
          expect(tie).toBe(a === b);
        },
      ),
    );
  });

  it("works on the examples", () => {
    const ace = card("A", "S");
    const two = card("2", "H");
    expect(compareCards(ace, two, RankOrder.ACE_HIGH)).toBe(1);
    expect(compareCards(ace, two, RankOrder.ACE_LOW)).toBe(-1);
    expect(compareCards(ace, card("A", "D"), RankOrder.ACE_HIGH)).toBe(0);
    const bridge = { suitOrder: SuitOrder.BRIDGE };
    expect(compareCards(ace, card("A", "D"), RankOrder.ACE_HIGH, bridge)).toBe(
      1,
    );
    expect(compareCards(ace, ace, RankOrder.ACE_HIGH, bridge)).toBe(0);
  });

  it("compares cards that aren't standard cards, by whatever ranks and suits the orders list", () => {
    const eleven = { rank: 11, suit: "stars" };
    const twelve = { rank: 12, suit: "moons" };
    expect(compareCards(eleven, twelve, [10, 11, 12])).toBe(-1);
    expect(compareCards(twelve, eleven, [12, 11])).toBe(-1);
    expect(
      compareCards(eleven, { rank: 11, suit: "moons" }, [11], {
        suitOrder: ["moons", "stars"],
      }),
    ).toBe(1);
  });

  it("matches a rank or suit as includes does, so NaN finds NaN", () => {
    expect(compareCards({ rank: NaN }, { rank: 0 }, [NaN, -0])).toBe(-1);
  });

  it("takes an order frozen or not, and reads it by index", () => {
    const rankOrder = [...RankOrder.ACE_HIGH];
    const suitOrder = [...SuitOrder.BRIDGE];
    const ace = card("A", "S");
    const king = card("K", "S");
    expect(compareCards(ace, king, rankOrder, { suitOrder })).toBe(1);
    for (const [, make] of arraySubclasses()) {
      expect(
        compareCards(ace, king, make(rankOrder), {
          suitOrder: make(suitOrder),
        }),
      ).toBe(1);
    }
  });

  it("reads each card's rank, and its suit when there's a suit order, once", () => {
    let reads = 0;
    const counting = {
      get rank() {
        reads += 1;
        return "A";
      },
      get suit() {
        reads += 1;
        return "S";
      },
    };
    compareCards(counting, counting, ["A"]);
    expect(reads).toBe(2);
    reads = 0;
    compareCards(counting, counting, ["A"], { suitOrder: ["S"] });
    expect(reads).toBe(4);
  });

  it("leaves out the suit order when it's undefined", () => {
    const options = asOptions({ suitOrder: undefined });
    expect(
      compareCards(card("7", "S"), card("7", "H"), RankOrder.ACE_HIGH, options),
    ).toBe(0);
  });

  describe("with bad input", () => {
    const ace = card("A", "S");
    const king = card("K", "H");

    it.each([
      ["a string", "2345678910JQKA"],
      ["undefined", undefined],
      ["a Set", new Set(RankOrder.ACE_HIGH)],
    ])("rejects %s as the rank order", (_label, rankOrder) => {
      expect(
        thrownBy(() => compareCards(ace, king, asRankOrder(rankOrder))),
      ).toMatchObject({ code: "INVALID_ARGUMENT" });
    });

    it("rejects a rank order that lists a rank twice, even when it isn't one compared", () => {
      expect(
        thrownBy(() => compareCards(ace, king, ["2", "2", "K", "A"])),
      ).toMatchObject({ code: "INVALID_ARGUMENT" });
    });

    it.each([
      ["null", null],
      ["a string", "C D H S"],
    ])("rejects %s as the options", (_label, options) => {
      expect(
        thrownBy(() =>
          compareCards(ace, king, RankOrder.ACE_HIGH, asOptions(options)),
        ),
      ).toMatchObject({ code: "INVALID_ARGUMENT" });
    });

    it.each([
      ["a string", "CDHS"],
      ["null", null],
      ["an order that lists a suit twice", ["C", "D", "H", "S", "C"]],
    ])("rejects %s as the suit order", (_label, suitOrder) => {
      expect(
        thrownBy(() =>
          compareCards(ace, king, RankOrder.ACE_HIGH, asOptions({ suitOrder })),
        ),
      ).toMatchObject({ code: "INVALID_ARGUMENT" });
    });

    it("names the card whose rank isn't in the rank order", () => {
      const pinochle: RankOrder = ["9", "J", "Q", "K", "10", "A"];
      const two = card("2", "C");
      expect(thrownBy(() => compareCards(two, ace, pinochle))).toMatchObject({
        code: "INVALID_ARGUMENT",
        message: `Can't compare a: its rank "2" isn't in the rank order`,
      });
      expect(thrownBy(() => compareCards(ace, two, pinochle))).toMatchObject({
        code: "INVALID_ARGUMENT",
        message: `Can't compare b: its rank "2" isn't in the rank order`,
      });
    });

    it("names the card whose suit isn't in the suit order, even when the ranks decide", () => {
      expect(
        thrownBy(() =>
          compareCards(ace, king, RankOrder.ACE_HIGH, {
            suitOrder: ["H"],
          }),
        ),
      ).toMatchObject({
        code: "INVALID_ARGUMENT",
        message: `Can't compare a: its suit "S" isn't in the suit order`,
      });
    });

    it.each([
      ["undefined", undefined],
      ["null", null],
      ["a string", "AS"],
      ["a number", 1],
    ])("rejects %s as a card, since it has no rank", (_label, notACard) => {
      expect(
        thrownBy(() =>
          compareCards(notACard as unknown as Card, ace, RankOrder.ACE_HIGH),
        ),
      ).toMatchObject({ code: "INVALID_ARGUMENT" });
    });
  });
});
