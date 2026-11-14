import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { Card, Rank } from "../card.ts";

import { short, thrownBy } from "../../test/helpers.ts";
import { card, isCard } from "../card.ts";
import { pinochle, type PinochleOptions } from "./pinochle.ts";
import { standard52 } from "./standard52.ts";

/** Lets a test pass options that aren't `PinochleOptions`, as untyped callers can. */
function asPinochleOptions(value: unknown): PinochleOptions {
  return value as PinochleOptions;
}

/** A list repeated, one after another. */
function repeated<T>(list: readonly T[], times: number): T[] {
  return Array.from({ length: times }, () => list).flat();
}

const NINE_TO_ACE = [
  "AH 9H 10H JH QH KH",
  "AC 9C 10C JC QC KC",
  "KD QD JD 10D 9D AD",
  "KS QS JS 10S 9S AS",
];
const SEVEN_TO_ACE = [
  "AH 7H 8H 9H 10H JH QH KH",
  "AC 7C 8C 9C 10C JC QC KC",
  "KD QD JD 10D 9D 8D 7D AD",
  "KS QS JS 10S 9S 8S 7S AS",
];
const TEN_TO_ACE = [
  "AH 10H JH QH KH",
  "AC 10C JC QC KC",
  "KD QD JD 10D AD",
  "KS QS JS 10S AS",
];

/** Each deck's size, the ranks it keeps, its stripped deck's order, and how many times it repeats that. */
const DECKS = [
  {
    copies: 2,
    kept: ["9", "10", "J", "Q", "K", "A"],
    order: NINE_TO_ACE,
    size: 48,
  },
  {
    copies: 2,
    kept: ["7", "8", "9", "10", "J", "Q", "K", "A"],
    order: SEVEN_TO_ACE,
    size: 64,
  },
  { copies: 4, kept: ["10", "J", "Q", "K", "A"], order: TEN_TO_ACE, size: 80 },
  { copies: 6, kept: ["10", "J", "Q", "K", "A"], order: TEN_TO_ACE, size: 120 },
] as const satisfies readonly {
  copies: number;
  kept: readonly Rank[];
  order: readonly string[];
  size: PinochleOptions["size"];
}[];

describe("pinochle", () => {
  describe.each(DECKS)(
    "with a size of $size",
    ({ copies, kept, order, size }) => {
      const ranks = new Set<Rank>(kept);

      // Fixed for 1.x (ADR 0008): a stripped deck repeated, one on top of the other.
      it("is its stripped deck in new deck order, again and again, top first", () => {
        expect(pinochle({ size }).map((c) => short(c))).toStrictEqual(
          repeated(order.join(" ").split(" "), copies),
        );
      });

      // ADR 0008: the stripped deck keeps the standard 52's order each time.
      it("is the standard 52 with only its ranks, again and again", () => {
        const once = standard52().filter(({ rank }) => ranks.has(rank));
        expect(pinochle({ size })).toStrictEqual(repeated(once, copies));
      });

      it("holds the same number of copies of each card from its ranks", () => {
        const deck = pinochle({ size });
        expect(deck).toHaveLength(size);
        expect(deck.every((c) => isCard(c))).toBe(true);
        expect(deck.every(({ rank }) => ranks.has(rank))).toBe(true);

        const tally = new Map<Card, number>();
        for (const c of deck) tally.set(c, (tally.get(c) ?? 0) + 1);
        expect(tally.size).toBe(ranks.size * 4);
        expect(new Set(tally.values())).toStrictEqual(new Set([copies]));
      });

      it("holds the same objects that card() returns", () => {
        for (const c of pinochle({ size })) {
          expect(c).toBe(card(c.rank, c.suit));
        }
      });

      it("returns the same frozen stack on every call", () => {
        const deck = pinochle({ size });
        expect(pinochle({ size })).toBe(deck);
        expect(Object.isFrozen(deck)).toBe(true);
      });
    },
  );

  it("gives the 48-card deck when the size is left out", () => {
    const deck = pinochle({ size: 48 });
    expect(pinochle()).toBe(deck);
    expect(pinochle(undefined)).toBe(deck);
    expect(pinochle({})).toBe(deck);
    expect(pinochle({ size: undefined })).toBe(deck);
  });

  it("gives each size its own stack", () => {
    const decks = new Set(DECKS.map(({ size }) => pinochle({ size })));
    expect(decks.size).toBe(DECKS.length);
  });

  it("reads the size once", () => {
    const sizes = [80, 96];
    let reads = 0;
    const options = asPinochleOptions({
      get size() {
        return sizes[reads++];
      },
    });
    expect(pinochle(options)).toBe(pinochle({ size: 80 }));
    expect(reads).toBe(1);
  });

  it.each([
    ["72, the five-handed deck", 72],
    ["96", 96],
    ["0", 0],
    ["a negative size", -48],
    ["a fraction", 48.5],
    ["NaN", NaN],
    ["Infinity", Infinity],
    ["a numeric string", "48"],
    ["a key of an object's prototype", "constructor"],
    ["a bigint", 48n],
    ["null", null],
    ["true", true],
    ["an array", [48]],
  ])("rejects %s as the size", (_label, size) => {
    expect(thrownBy(() => pinochle(asPinochleOptions({ size })))).toMatchObject(
      { code: "INVALID_ARGUMENT" },
    );
  });

  it("rejects any size but 48, 64, 80 and 120", () => {
    const sizes = new Set<unknown>([48, 64, 80, 120, undefined]);
    fc.assert(
      fc.property(
        fc.anything().filter((size) => !sizes.has(size)),
        (size) => {
          expect(
            thrownBy(() => pinochle(asPinochleOptions({ size }))),
          ).toMatchObject({ code: "INVALID_ARGUMENT" });
        },
      ),
    );
  });

  it.each([
    ["null", null],
    ["a size", 80],
    ["a string", "double deck"],
    ["a function", () => 80],
    ["an array", [80]],
  ])("rejects %s in place of the options object", (_label, options) => {
    expect(thrownBy(() => pinochle(asPinochleOptions(options)))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });
});
