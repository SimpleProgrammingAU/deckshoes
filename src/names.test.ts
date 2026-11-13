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
import { card } from "./card.ts";
import {
  rankName,
  type RankNameOptions,
  suitName,
  type SuitNameOptions,
} from "./names.ts";

// Written out here rather than imported, so the tests don't share the
// implementation's tables.
const RANK_NAMES = [
  ["A", "Ace", "ace"],
  ["2", "Two", "two"],
  ["3", "Three", "three"],
  ["4", "Four", "four"],
  ["5", "Five", "five"],
  ["6", "Six", "six"],
  ["7", "Seven", "seven"],
  ["8", "Eight", "eight"],
  ["9", "Nine", "nine"],
  ["10", "Ten", "ten"],
  ["J", "Jack", "jack"],
  ["Q", "Queen", "queen"],
  ["K", "King", "king"],
] as const;

const SUIT_NAMES = [
  ["S", "Spades", "Spade"],
  ["H", "Hearts", "Heart"],
  ["D", "Diamonds", "Diamond"],
  ["C", "Clubs", "Club"],
] as const;

/** Lets a test pass options that the types rule out. */
function asRankNameOptions(value: unknown): RankNameOptions {
  return value as RankNameOptions;
}

/** Lets a test pass options that the types rule out. */
function asSuitNameOptions(value: unknown): SuitNameOptions {
  return value as SuitNameOptions;
}

/** Ways to leave a setting off, for `it.each`. */
const SETTINGS_OFF = [
  ["no options", undefined],
  ["empty options", {}],
  ["settings set to false", { lowercase: false, singular: false }],
  ["settings set to undefined", { lowercase: undefined, singular: undefined }],
] as const;

describe("rankName", () => {
  it("names every standard rank", () => {
    expect(RANK_NAMES.map(([rank]) => rank)).toStrictEqual(standardRanks);
  });

  it.each(RANK_NAMES)(
    "names %s %s, or %s in lower case",
    (rank, name, lower) => {
      expect(rankName(rank)).toBe(name);
      expect(rankName(rank, { lowercase: true })).toBe(lower);
    },
  );

  it.each(SETTINGS_OFF)("gives a capital with %s", (_label, options) => {
    expect(rankName("A", options)).toBe("Ace");
  });
});

describe("suitName", () => {
  it("names every standard suit", () => {
    expect(SUIT_NAMES.map(([suit]) => suit)).toStrictEqual(standardSuits);
  });

  it.each(SUIT_NAMES)(
    "names %s %s, or %s in the singular",
    (suit, plural, singular) => {
      expect(suitName(suit)).toBe(plural);
      expect(suitName(suit, { singular: true })).toBe(singular);
      expect(suitName(suit, { lowercase: true })).toBe(plural.toLowerCase());
      expect(suitName(suit, { lowercase: true, singular: true })).toBe(
        singular.toLowerCase(),
      );
    },
  );

  it.each(SETTINGS_OFF)(
    "gives a capital and the plural with %s",
    (_label, options) => {
      expect(suitName("D", options)).toBe("Diamonds");
    },
  );
});

describe("rankName and suitName with input that isn't standard", () => {
  it.each(nonRanks())("rejects %s as a rank, as card does", (_label, rank) => {
    const error = thrownBy(() => rankName(asRank(rank)));
    expect(error).toMatchObject({ code: "INVALID_CARD" });
    expect(error).toStrictEqual(thrownBy(() => card(asRank(rank), "S")));
  });

  it.each(nonSuits())("rejects %s as a suit, as card does", (_label, suit) => {
    const error = thrownBy(() => suitName(asSuit(suit)));
    expect(error).toMatchObject({ code: "INVALID_CARD" });
    expect(error).toStrictEqual(thrownBy(() => card("A", asSuit(suit))));
  });

  it("rejects any other value as a rank", () => {
    fc.assert(
      fc.property(
        fc.anything().filter((value) => !standardRanks.includes(value)),
        (rank) => {
          expect(thrownBy(() => rankName(asRank(rank)))).toMatchObject({
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
          expect(thrownBy(() => suitName(asSuit(suit)))).toMatchObject({
            code: "INVALID_CARD",
          });
        },
      ),
    );
  });

  it("checks the rank or suit before the options", () => {
    expect(
      thrownBy(() => rankName(asRank("11"), asRankNameOptions(null))),
    ).toMatchObject({ code: "INVALID_CARD" });
    expect(
      thrownBy(() => suitName(asSuit("X"), asSuitNameOptions(null))),
    ).toMatchObject({ code: "INVALID_CARD" });
  });
});

describe("rankName and suitName options", () => {
  it.each([
    ["null", null],
    ["a number", 1],
    ["a string", "lowercase"],
    ["true", true],
    ["a function", () => true],
    ["an array", []],
  ])("reject %s in place of the options object", (_label, options) => {
    expect(
      thrownBy(() => rankName("A", asRankNameOptions(options))),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
    expect(
      thrownBy(() => suitName("S", asSuitNameOptions(options))),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  const notBooleans = [
    ["a string", "yes"],
    ["the string true", "true"],
    ["the string false", "false"],
    ["one", 1],
    ["zero", 0],
    ["null", null],
    ["an object", {}],
  ] as const;

  it.each(notBooleans)("reject %s as lowercase", (_label, lowercase) => {
    expect(
      thrownBy(() => rankName("A", asRankNameOptions({ lowercase }))),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
    expect(
      thrownBy(() => suitName("S", asSuitNameOptions({ lowercase }))),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it.each(notBooleans)("reject %s as singular", (_label, singular) => {
    expect(
      thrownBy(() => suitName("S", asSuitNameOptions({ singular }))),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it("read each option once", () => {
    const reads = { lowercase: 0, singular: 0 };
    const options = {
      get lowercase() {
        reads.lowercase++;
        return true;
      },
      get singular() {
        reads.singular++;
        return true;
      },
    };
    expect(rankName("K", options)).toBe("king");
    expect(reads).toStrictEqual({ lowercase: 1, singular: 0 });
    expect(suitName("C", options)).toBe("club");
    expect(reads).toStrictEqual({ lowercase: 2, singular: 1 });
  });
});
