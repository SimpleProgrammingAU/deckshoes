import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  asRank,
  asSuit,
  nonRanks,
  nonSuits,
  standardRanks,
  standardSuits,
  thrownBy,
} from "../test/helpers.ts";
import { card, type Color, isCard, type Rank, type Suit } from "./card.ts";

// Written out here rather than imported, so the tests don't share the
// implementation's table.
const COLORS: Readonly<Record<Suit, Color>> = {
  C: "black",
  D: "red",
  H: "red",
  S: "black",
};

/** Every rank and suit pair, as the test lists them. */
const PAIRS: readonly (readonly [Rank, Suit])[] = standardRanks.flatMap(
  (rank) => standardSuits.map((suit) => [asRank(rank), asSuit(suit)] as const),
);

describe("card", () => {
  it("creates every standard card with its rank, suit and colour", () => {
    for (const [rank, suit] of PAIRS) {
      expect(card(rank, suit)).toStrictEqual({
        color: COLORS[suit],
        rank,
        suit,
      });
    }
  });

  it("gives 52 distinct cards", () => {
    const cards = new Set(PAIRS.map(([rank, suit]) => card(rank, suit)));
    expect(cards.size).toBe(52);
  });

  it("returns the same object every time", () => {
    for (const [rank, suit] of PAIRS) {
      expect(card(rank, suit)).toBe(card(rank, suit));
    }
  });

  it("returns frozen plain objects with only rank, suit and color", () => {
    for (const [rank, suit] of PAIRS) {
      const created = card(rank, suit);
      expect(Object.isFrozen(created)).toBe(true);
      expect(Object.getPrototypeOf(created)).toBe(Object.prototype);
      expect(Reflect.ownKeys(created)).toStrictEqual(["rank", "suit", "color"]);
    }
  });

  it("can't be changed", () => {
    const ace = card("A", "S") as { rank: string };
    expect(() => {
      ace.rank = "K";
    }).toThrow(TypeError);
    expect(card("A", "S").rank).toBe("A");
  });

  it.each([
    ["S", "black"],
    ["H", "red"],
    ["D", "red"],
    ["C", "black"],
  ] as const)("colours %s cards %s", (suit, color) => {
    for (const rank of standardRanks) {
      expect(card(asRank(rank), suit).color).toBe(color);
    }
  });
});

describe("card with input that isn't standard", () => {
  it.each(nonRanks())("rejects %s as a rank", (_label, rank) => {
    expect(thrownBy(() => card(asRank(rank), "S"))).toMatchObject({
      code: "INVALID_CARD",
    });
  });

  it.each(nonSuits())("rejects %s as a suit", (_label, suit) => {
    expect(thrownBy(() => card("A", asSuit(suit)))).toMatchObject({
      code: "INVALID_CARD",
    });
  });

  it("rejects any other value as a rank", () => {
    fc.assert(
      fc.property(
        fc.anything().filter((value) => !standardRanks.includes(value)),
        (rank) => {
          expect(thrownBy(() => card(asRank(rank), "S"))).toMatchObject({
            code: "INVALID_CARD",
          });
        },
      ),
    );
  });

  it("rejects any other value as a suit", () => {
    fc.assert(
      fc.property(
        fc.anything().filter((value) => !standardSuits.includes(value)),
        (suit) => {
          expect(thrownBy(() => card("A", asSuit(suit)))).toMatchObject({
            code: "INVALID_CARD",
          });
        },
      ),
    );
  });

  it.each([
    ["quotes a string", asRank("11"), "S", 'Unknown rank "11"'],
    [
      "shows a 30-character string in full",
      asRank("x".repeat(30)),
      "S",
      `Unknown rank "${"x".repeat(30)}"`,
    ],
    [
      "cuts a longer string short",
      asRank("x".repeat(1_000_000)),
      "S",
      `Unknown rank "${"x".repeat(30)}"…`,
    ],
    ["shows a number as it is", asRank(10), "S", "Unknown rank 10"],
    ["marks a bigint", asRank(10n), "S", "Unknown rank 10n"],
    ["shows null as it is", asRank(null), "S", "Unknown rank null"],
    ["shows only an object's type", asRank({}), "S", "Unknown rank (object)"],
    [
      "shows only a function's type",
      asRank(() => "A"),
      "S",
      "Unknown rank (function)",
    ],
    ["names the suit", "A", asSuit("X"), 'Unknown suit "X"'],
    ["checks the rank first", asRank("11"), asSuit("X"), 'Unknown rank "11"'],
  ] as const)("%s in the message", (_label, rank, suit, start) => {
    // Each message ends by listing what would have been accepted.
    const expected = start.startsWith("Unknown rank")
      ? ': expected "A", "2" to "10", "J", "Q" or "K"'
      : ': expected "S", "H", "D" or "C"';
    expect(thrownBy(() => card(rank, suit))).toMatchObject({
      message: `${start}${expected}`,
    });
  });
});

describe("isCard", () => {
  it("accepts every standard card", () => {
    for (const [rank, suit] of PAIRS) {
      expect(isCard(card(rank, suit))).toBe(true);
    }
  });

  it.each([
    ["an object literal", { color: "black", rank: "A", suit: "S" }],
    ["an object spread from a card", { ...card("A", "S") }],
    ["a structured clone", structuredClone(card("A", "S"))],
    ["an object inheriting from a card", Object.create(card("A", "S"))],
    ["a card's text", "AS"],
    ["null", null],
    ["undefined", undefined],
  ])("rejects %s", (_label, value) => {
    expect(isCard(value)).toBe(false);
  });

  it("rejects anything that isn't a card", () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        expect(isCard(value)).toBe(false);
      }),
    );
  });
});
