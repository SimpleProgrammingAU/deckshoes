import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { card, type Color, isCard, type Rank, type Suit } from "./card.ts";

// Written out here rather than imported, so the tests don't share the
// implementation's lists.
const RANKS: readonly unknown[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];
const SUITS: readonly unknown[] = ["S", "H", "D", "C"];
const COLORS: Readonly<Record<Suit, Color>> = {
  C: "black",
  D: "red",
  H: "red",
  S: "black",
};

/** Every rank and suit pair, as the test lists them. */
const PAIRS: readonly (readonly [Rank, Suit])[] = RANKS.flatMap((rank) =>
  SUITS.map((suit) => [rank as Rank, suit as Suit] as const),
);

/** Lets a test pass a value that isn't a rank, as untyped callers can. */
function asRank(value: unknown): Rank {
  return value as Rank;
}

/** Lets a test pass a value that isn't a suit, as untyped callers can. */
function asSuit(value: unknown): Suit {
  return value as Suit;
}

/** Returns what `run` throws, failing the test if it doesn't throw. */
function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error("Expected a throw, but nothing was thrown");
}

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
    for (const rank of RANKS) {
      expect(card(asRank(rank), suit).color).toBe(color);
    }
  });
});

describe("card with input that isn't standard", () => {
  const notStandard: readonly (readonly [string, unknown])[] = [
    ["11", "11"],
    ["1", "1"],
    ["T", "T"],
    ["lower case", "a"],
    ["a suit symbol", "♠"],
    ["an empty string", ""],
    ["padding", " A"],
    ["a number", 10],
    ["null", null],
    ["undefined", undefined],
    ["an object without a prototype", Object.create(null)],
    ["a prototype key", "constructor"],
    ["__proto__", "__proto__"],
  ];

  it.each(notStandard)("rejects %s as a rank", (_label, rank) => {
    expect(thrownBy(() => card(asRank(rank), "S"))).toMatchObject({
      code: "INVALID_CARD",
    });
  });

  const notSuits: readonly (readonly [string, unknown])[] = [
    ...notStandard,
    ["a rank", "A"],
    ["a lower-case suit", "s"],
  ];

  it.each(notSuits)("rejects %s as a suit", (_label, suit) => {
    expect(thrownBy(() => card("A", asSuit(suit)))).toMatchObject({
      code: "INVALID_CARD",
    });
  });

  it("rejects any other value as a rank", () => {
    fc.assert(
      fc.property(
        fc.anything().filter((value) => !RANKS.includes(value)),
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
        fc.anything().filter((value) => !SUITS.includes(value)),
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
    ["shows a number as it is", asRank(10), "S", "Unknown rank 10"],
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
  ] as const)("%s in the message", (_label, rank, suit, message) => {
    expect(thrownBy(() => card(rank, suit))).toMatchObject({ message });
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
    ["a spread copy", { ...card("A", "S") }],
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
