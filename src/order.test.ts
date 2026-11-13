import fc, { type Arbitrary } from "fast-check";
import { describe, expect, it } from "vitest";

import {
  arraySubclasses,
  asStack,
  isPlainFrozen,
  nonArrays,
  sameValues,
  stacks,
  standardRanks,
  standardSuits,
  thrownBy,
} from "../test/helpers.ts";
import { type Card, card, type Rank, type Suit } from "./card.ts";
import {
  compareCards,
  type CompareCardsOptions,
  RankOrder,
  sort,
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

describe("sort", () => {
  it("sorts as a stable sort with compareCards does", () => {
    fc.assert(
      fc.property(
        stacks(),
        rankOrders(),
        fc.option(suitOrders(), { nil: undefined }),
        (stack, rankOrder, suitOrder) => {
          const options = { suitOrder };
          // Array.prototype.sort is stable, so it's the oracle.
          const expected = [...stack];
          expected.sort((a, b) => compareCards(a, b, rankOrder, options));
          expect(sort(stack, rankOrder, options)).toStrictEqual(expected);
        },
      ),
    );
  });

  it("keeps cards that tie in the order they had", () => {
    fc.assert(
      fc.property(
        stacks(),
        rankOrders(),
        fc.option(suitOrders(), { nil: undefined }),
        (stack, rankOrder, suitOrder) => {
          // Distinct objects for each card, so copies can be told apart.
          const marked = stack.map(({ rank, suit }, from) => ({
            from,
            rank,
            suit,
          }));
          // Ties broken by where each card started: what a stable sort gives.
          const expected = marked.toSorted(
            (a, b) =>
              compareCards(a, b, rankOrder, { suitOrder }) || a.from - b.from,
          );
          expect(sort(marked, rankOrder, { suitOrder })).toStrictEqual(
            expected,
          );
        },
      ),
    );
  });

  it("leaves the stack unchanged, frozen or not, and returns a new plain frozen stack", () => {
    fc.assert(
      fc.property(stacks(), fc.boolean(), (original, frozen) => {
        const stack = frozen ? Object.freeze([...original]) : [...original];
        const sorted = sort(stack, RankOrder.ACE_HIGH);
        expect(sameValues(stack, original)).toBe(true);
        expect(Object.isFrozen(stack)).toBe(frozen);
        expect(isPlainFrozen(sorted)).toBe(true);
        expect(sorted).not.toBe(stack);
      }),
    );
  });

  it.each(arraySubclasses())(
    "gives what a plain array gives for %s as the stack, frozen or not",
    (_label, make) => {
      fc.assert(
        fc.property(stacks(), fc.boolean(), (stack, frozen) => {
          const given = frozen ? Object.freeze(make(stack)) : make(stack);
          const sorted = sort(given, RankOrder.ACE_LOW, {
            suitOrder: SuitOrder.BRIDGE,
          });
          expect(sorted).toStrictEqual(
            sort(stack, RankOrder.ACE_LOW, { suitOrder: SuitOrder.BRIDGE }),
          );
          expect(isPlainFrozen(sorted)).toBe(true);
        }),
      );
    },
  );

  it("works on the examples, putting the lowest card on top", () => {
    const hand = [
      card("K", "S"),
      card("2", "H"),
      card("A", "D"),
      card("2", "C"),
    ];
    expect(sort(hand, RankOrder.ACE_HIGH)).toStrictEqual([
      card("2", "H"),
      card("2", "C"),
      card("K", "S"),
      card("A", "D"),
    ]);
    expect(
      sort(hand, RankOrder.ACE_HIGH, { suitOrder: SuitOrder.BRIDGE }),
    ).toStrictEqual([
      card("2", "C"),
      card("2", "H"),
      card("K", "S"),
      card("A", "D"),
    ]);
    expect(
      sort(standard52(), RankOrder.ACE_LOW, {
        suitOrder: SuitOrder.BRIDGE,
      }).slice(0, 5),
    ).toStrictEqual([
      card("A", "C"),
      card("A", "D"),
      card("A", "H"),
      card("A", "S"),
      card("2", "C"),
    ]);
  });

  it("returns a new frozen stack for an empty stack, but still checks the orders", () => {
    const empty: Card[] = [];
    const sorted = sort(empty, RankOrder.ACE_HIGH);
    expect(sorted).toStrictEqual([]);
    expect(sorted).not.toBe(empty);
    expect(isPlainFrozen(sorted)).toBe(true);
    expect(thrownBy(() => sort(empty, ["A", "A"]))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });

  it("sorts cards that aren't standard cards, by whatever ranks and suits the orders list", () => {
    const cards = [
      { rank: 12, suit: "stars" },
      { rank: 11, suit: "moons" },
      { rank: 12, suit: "moons" },
    ];
    expect(
      sort(cards, [11, 12], { suitOrder: ["moons", "stars"] }),
    ).toStrictEqual([
      { rank: 11, suit: "moons" },
      { rank: 12, suit: "moons" },
      { rank: 12, suit: "stars" },
    ]);
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
    sort([counting, counting, counting], ["A"], { suitOrder: ["S"] });
    expect(reads).toBe(6);
  });

  describe("with bad input", () => {
    const hand = [card("A", "S"), card("2", "C"), card("K", "H")];

    it.each(nonArrays())("rejects %s as the stack", (_label, stack) => {
      expect(
        thrownBy(() => sort(asStack(stack), RankOrder.ACE_HIGH)),
      ).toMatchObject({ code: "INVALID_ARGUMENT" });
    });

    it("rejects a rank order that isn't an array or lists a rank twice", () => {
      expect(thrownBy(() => sort(hand, asRankOrder("A2K")))).toMatchObject({
        code: "INVALID_ARGUMENT",
      });
      expect(thrownBy(() => sort(hand, ["2", "K", "A", "K"]))).toMatchObject({
        code: "INVALID_ARGUMENT",
      });
    });

    it("rejects options that aren't an object, and a bad suit order", () => {
      expect(
        thrownBy(() => sort(hand, RankOrder.ACE_HIGH, asOptions(null))),
      ).toMatchObject({ code: "INVALID_ARGUMENT" });
      expect(
        thrownBy(() =>
          sort(hand, RankOrder.ACE_HIGH, asOptions({ suitOrder: "CDHS" })),
        ),
      ).toMatchObject({ code: "INVALID_ARGUMENT" });
      expect(
        thrownBy(() =>
          sort(hand, RankOrder.ACE_HIGH, { suitOrder: ["C", "C"] }),
        ),
      ).toMatchObject({ code: "INVALID_ARGUMENT" });
    });

    it("names the first card whose rank or suit isn't in its order", () => {
      const pinochle: RankOrder = ["9", "J", "Q", "K", "10", "A"];
      expect(thrownBy(() => sort(hand, pinochle))).toMatchObject({
        code: "INVALID_ARGUMENT",
        message: `Can't sort stack[1]: its rank "2" isn't in the rank order`,
      });
      expect(
        thrownBy(() =>
          sort(hand, RankOrder.ACE_HIGH, { suitOrder: ["C", "H"] }),
        ),
      ).toMatchObject({
        code: "INVALID_ARGUMENT",
        message: `Can't sort stack[0]: its suit "S" isn't in the suit order`,
      });
    });

    it("rejects a hole, which has no rank", () => {
      // eslint-disable-next-line no-sparse-arrays -- the hole is the point
      const holey = [card("A", "S"), , card("K", "H")];
      expect(
        thrownBy(() => sort(asStack(holey), RankOrder.ACE_HIGH)),
      ).toMatchObject({
        code: "INVALID_ARGUMENT",
        message:
          "Can't sort stack[1]: its rank undefined isn't in the rank order",
      });
    });
  });
});
