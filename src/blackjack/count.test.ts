import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { RunningCountOptions } from "./count.ts";

import {
  arraySubclasses,
  asStack,
  countingReads,
  holes,
  nonArrays,
  nonRanks,
  stacks,
  standardRanks,
  thrownBy,
} from "../../test/helpers.ts";
import { type Card, card } from "../card.ts";
import { standard52 } from "../presets/standard52.ts";
import { runningCount, trueCount } from "./count.ts";

/** Each standard rank's Hi-Lo tag, written out here rather than shared with the implementation. */
const HI_LO: Readonly<Record<string, number>> = {
  A: -1,
  "2": 1,
  "3": 1,
  "4": 1,
  "5": 1,
  "6": 1,
  "7": 0,
  "8": 0,
  "9": 0,
  "10": -1,
  J: -1,
  Q: -1,
  K: -1,
};

/** Lets a test pass options that aren't `RunningCountOptions`, as untyped callers can. */
function asOptions(value: unknown): RunningCountOptions {
  return value as RunningCountOptions;
}

/** A tag function that records the cards it's given and tags each as `tag` says. */
function recording(tag: (card: Card) => number = () => 1): {
  given: Card[];
  tag: (card: Card) => number;
} {
  const given: Card[] = [];
  return {
    given,
    tag: (c) => {
      given.push(c);
      return tag(c);
    },
  };
}

describe("runningCount", () => {
  it.each(standardRanks)("tags each %s as Hi-Lo does", (rank) => {
    const each = (["S", "H", "D", "C"] as const).map((suit) =>
      card(rank as Card["rank"], suit),
    );
    for (const c of each) expect(runningCount([c])).toBe(HI_LO[c.rank]);
    expect(runningCount(each)).toBe(4 * (HI_LO[rank as string] ?? NaN));
  });

  it("counts a standard 52, and any number of them, as 0", () => {
    expect(runningCount(standard52())).toBe(0);
    expect(runningCount(Array.from({ length: 6 }, standard52).flat())).toBe(0);
  });

  it("counts 0 for no cards", () => {
    expect(runningCount([])).toBe(0);
  });

  it("sums the cards' Hi-Lo tags", () => {
    fc.assert(
      fc.property(stacks(), (cards) => {
        const sum = cards.reduce(
          (total, c) => total + (HI_LO[c.rank] ?? NaN),
          0,
        );
        expect(runningCount(cards)).toBe(sum);
      }),
    );
  });

  it("adds up: the count of some cards is the sum of the counts of any split of them", () => {
    fc.assert(
      fc.property(
        stacks().chain((cards) =>
          fc.record({
            at: fc.nat({ max: cards.length }),
            cards: fc.constant(cards),
          }),
        ),
        ({ at, cards }) => {
          expect(runningCount(cards)).toBe(
            runningCount(cards.slice(0, at)) + runningCount(cards.slice(at)),
          );
        },
      ),
    );
  });

  it("counts cloned cards the same as real ones, reading them by rank", () => {
    fc.assert(
      fc.property(stacks(), (cards) => {
        expect(runningCount(structuredClone(cards))).toBe(runningCount(cards));
      }),
    );
  });

  it("uses Hi-Lo when the tag is undefined", () => {
    const cards = [card("2", "S"), card("K", "H"), card("5", "D")];
    expect(runningCount(cards, { tag: undefined })).toBe(1);
    expect(runningCount(cards, {})).toBe(1);
  });

  it("counts with a tag of your own, such as Red Seven, which looks at the colour", () => {
    const redSeven = (c: Card): number =>
      c.rank === "7" && c.color === "red" ? 1 : (HI_LO[c.rank] ?? NaN);
    const cards = [
      card("7", "H"),
      card("7", "D"),
      card("7", "S"),
      card("K", "C"),
    ];
    expect(runningCount(cards)).toBe(-1);
    expect(runningCount(cards, { tag: redSeven })).toBe(1);
  });

  it("sums tags that aren't whole numbers, as Wong Halves gives", () => {
    const halves = (c: Card): number => (c.rank === "5" ? 1.5 : 0.5);
    expect(
      runningCount([card("5", "S"), card("9", "H")], { tag: halves }),
    ).toBe(2);
  });

  it("calls the tag once for each card, top first, with the card itself", () => {
    fc.assert(
      fc.property(stacks(), (cards) => {
        const { given, tag } = recording();
        expect(runningCount(cards, { tag })).toBe(cards.length);
        expect(given).toHaveLength(cards.length);
        for (const [i, c] of given.entries()) expect(c).toBe(cards[i]);
      }),
    );
  });

  it("doesn't call the tag for no cards", () => {
    const { given, tag } = recording();
    expect(runningCount([], { tag })).toBe(0);
    expect(given).toStrictEqual([]);
  });

  it.each([
    ["NaN", NaN, "NaN"],
    ["Infinity", Infinity, "Infinity"],
    ["-Infinity", -Infinity, "-Infinity"],
    ["a string", "1", '"1"'],
    ["undefined", undefined, "undefined"],
    ["null", null, "null"],
    ["a bigint", 1n, "1n"],
  ])(
    "rejects %s as a tag, naming the card's position",
    (_label, tag, shown) => {
      const cards = [card("2", "S"), card("K", "H")];
      const tagOf = (c: Card): number => (c.rank === "K" ? (tag as number) : 1);
      expect(thrownBy(() => runningCount(cards, { tag: tagOf }))).toMatchObject(
        {
          code: "INVALID_ARGUMENT",
          message: `Invalid tag ${shown} for the card at position 1: expected a finite number`,
        },
      );
    },
  );

  it("lets an error from the tag through unchanged", () => {
    const error = new Error("tag failed");
    const tag = (): number => {
      throw error;
    };
    expect(thrownBy(() => runningCount([card("A", "S")], { tag }))).toBe(error);
  });

  it.each([
    ["a string", "hi-lo"],
    ["a number", 1],
    ["an object", { A: -1 }],
    ["null", null],
  ])("rejects %s as the tag option", (_label, tag) => {
    expect(
      thrownBy(() => runningCount([card("A", "S")], asOptions({ tag }))),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it.each([
    ["null", null],
    ["an array", []],
    ["a string", "hi-lo"],
    ["a function", () => 1],
  ])("rejects %s as the options", (_label, options) => {
    expect(
      thrownBy(() => runningCount([card("A", "S")], asOptions(options))),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it.each(nonArrays())("rejects %s as the cards", (_label, cards) => {
    expect(thrownBy(() => runningCount(asStack(cards)))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });

  it.each(nonRanks())(
    "rejects a card with %s as its rank, naming its position, with or without a tag",
    (_label, rank) => {
      const cards = asStack([card("A", "S"), { rank, suit: "S" }]);
      const expected = {
        code: "INVALID_CARD",
        message: expect.stringMatching(
          /^Invalid card with rank .+ at position 1 of the cards: /u,
        ) as unknown,
      };
      expect(thrownBy(() => runningCount(cards))).toMatchObject(expected);
      const { given, tag } = recording();
      expect(thrownBy(() => runningCount(cards, { tag }))).toMatchObject(
        expected,
      );
      expect(given).toStrictEqual([card("A", "S")]);
    },
  );

  it("rejects a hole in the cards, naming its position", () => {
    const cards: Card[] = [card("A", "S")];
    cards.length = 2;
    expect(thrownBy(() => runningCount(cards))).toMatchObject({
      code: "INVALID_CARD",
      message: expect.stringMatching(
        /^Invalid card undefined at position 1 of the cards: /u,
      ) as unknown,
    });
  });

  it("reads the length once and each card once, by index, with or without a tag", () => {
    for (const options of [{}, { tag: () => 1 }]) {
      const { reads, stack } = countingReads([card("A", "S"), card("2", "H")]);
      runningCount(stack, options);
      expect(reads.length).toBe(1);
      expect(reads.positions).toStrictEqual([1, 1]);
    }
  });

  it.each(arraySubclasses())(
    "gives what a plain array gives for %s, frozen or not",
    (_label, make) => {
      fc.assert(
        fc.property(stacks(), fc.boolean(), (cards, frozen) => {
          const given = frozen ? Object.freeze(make(cards)) : make(cards);
          expect(runningCount(given)).toBe(runningCount(cards));
        }),
      );
    },
  );
});

describe("trueCount", () => {
  const deck = standard52();
  const threeDecks = Array.from({ length: 3 }, standard52).flat();

  it.each([
    [6, 156, 52, 2],
    [-3, 156, 52, -1],
    [5, 156, 52, 5 / 3],
    [6, 52, 52, 6],
    [6, 26, 52, 12],
    [0, 156, 52, 0],
    [6, 144, 48, 2],
    [1.5, 104, 52, 0.75],
  ])(
    "divides %d by %d cards left in decks of %d to give %d",
    (running, left, size, expected) => {
      expect(trueCount(running, holes(left), holes(size))).toBe(expected);
    },
  );

  it("divides by the decks left in the deck being used", () => {
    expect(trueCount(6, threeDecks, deck)).toBe(2);
    const spanish21 = deck.filter((c) => c.rank !== "10");
    expect(trueCount(6, threeDecks.slice(0, 144), spanish21)).toBe(2);
  });

  it("gives back the running count when multiplied by the decks left", () => {
    fc.assert(
      fc.property(
        fc.integer({ max: 1000, min: -1000 }),
        fc.integer({ max: 2000, min: 1 }),
        fc.integer({ max: 120, min: 1 }),
        (running, left, size) => {
          const decksLeft = left / size;
          expect(
            trueCount(running, holes(left), holes(size)) * decksLeft,
          ).toBeCloseTo(running);
        },
      ),
    );
  });

  it("reads only the length of each stack, once", () => {
    const remainder = countingReads(threeDecks);
    const counted = countingReads(deck);
    trueCount(6, remainder.stack, counted.stack);
    for (const { reads } of [remainder, counted]) {
      expect(reads.length).toBe(1);
      expect(reads.positions.every((n) => n === 0)).toBe(true);
    }
  });

  it.each([
    ["NaN", NaN],
    ["Infinity", Infinity],
    ["-Infinity", -Infinity],
    ["a string", "6"],
    ["undefined", undefined],
    ["null", null],
    ["a bigint", 6n],
  ])("rejects %s as the running count", (_label, running) => {
    expect(
      thrownBy(() => trueCount(running as number, threeDecks, deck)),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it.each(nonArrays())(
    "rejects %s as the remainder, naming it",
    (_label, remainder) => {
      expect(
        thrownBy(() => trueCount(6, asStack(remainder), deck)),
      ).toMatchObject({
        code: "INVALID_ARGUMENT",
        message: expect.stringMatching(/^Invalid remainder /u) as unknown,
      });
    },
  );

  it.each(nonArrays())("rejects %s as the deck, naming it", (_label, given) => {
    expect(
      thrownBy(() => trueCount(6, threeDecks, asStack(given))),
    ).toMatchObject({
      code: "INVALID_ARGUMENT",
      message: expect.stringMatching(/^Invalid deck /u) as unknown,
    });
  });

  it("rejects an empty remainder, since no decks are left", () => {
    expect(thrownBy(() => trueCount(6, [], deck))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });

  it("rejects an empty deck, which can't measure the decks left", () => {
    expect(thrownBy(() => trueCount(6, threeDecks, []))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });
});
