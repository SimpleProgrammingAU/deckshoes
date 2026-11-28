import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { CardStack } from "../stack.ts";

import {
  arraySubclasses,
  asStack,
  countingReads,
  isPlainFrozen,
  nonArrays,
  nonRanks,
  nonSuits,
  seeds,
  stacks,
  thrownBy,
} from "../../test/helpers.ts";
import { type Card, card, type Rank } from "../card.ts";
import { parseStack } from "../compact.ts";
import { deal } from "../deal.ts";
import { standard52 } from "../presets/standard52.ts";
import { seededRandom } from "../random.ts";
import { shuffle } from "../shuffle.ts";
import { distribution, highCardPoints } from "./hand.ts";

/** Each standard rank's high-card points, written out here rather than shared with the implementation. */
const POINTS: Readonly<Record<string, number>> = {
  A: 4,
  K: 3,
  Q: 2,
  J: 1,
  "10": 0,
  "9": 0,
  "8": 0,
  "7": 0,
  "6": 0,
  "5": 0,
  "4": 0,
  "3": 0,
  "2": 0,
};

/** The standard suits, spades first. */
const SUITS = ["S", "H", "D", "C"] as const;

/** The standard ranks, ace first. */
const RANKS: readonly Rank[] = [
  "A",
  "K",
  "Q",
  "J",
  "10",
  "9",
  "8",
  "7",
  "6",
  "5",
  "4",
  "3",
  "2",
];

/** How many hands of 13 cards there are: 52 choose 13. */
const ALL_HANDS = 635_013_559_600;

/** A hand's high-card points by brute force: each card's points, added up. */
function oraclePoints(hand: readonly Card[]): number {
  return hand.reduce((points, c) => points + (POINTS[c.rank] ?? NaN), 0);
}

/** A hand's distribution by brute force: the cards of each suit, counted, longest first. */
function oracleDistribution(hand: readonly Card[]): number[] {
  return SUITS.map(
    (suit) => hand.filter((c) => c.suit === suit).length,
  ).toSorted((a, b) => b - a);
}

/** How many ways there are to choose `k` of `n` things. Each step's result is a whole number, so the arithmetic is exact. */
function choose(n: number, k: number): number {
  let ways = 1;
  for (let i = 1; i <= k; i++) ways = (ways * (n - k + i)) / i;
  return ways;
}

/** Adds `weight` to the total that `key` has in `totals`. */
function addTo<K>(totals: Map<K, number>, key: K, weight: number): void {
  totals.set(key, (totals.get(key) ?? 0) + weight);
}

describe("every hand of 13 cards", () => {
  // Richard Pavlicek's Basic HCP Table, http://www.rpbridge.net/7z76.htm: how
  // many of the 635,013,559,600 hands of 13 cards hold each number of
  // high-card points.
  const HANDS_BY_POINTS = [
    2_310_789_600, 5_006_710_800, 8_611_542_576, 15_636_342_960, 24_419_055_136,
    32_933_031_040, 41_619_399_184, 50_979_441_968, 56_466_608_128,
    59_413_313_872, 59_723_754_816, 56_799_933_520, 50_971_682_080,
    43_906_944_752, 36_153_374_224, 28_090_962_724, 21_024_781_756,
    14_997_082_848, 10_192_504_020, 6_579_838_440, 4_086_538_404, 2_399_507_844,
    1_333_800_036, 710_603_628, 354_993_864, 167_819_892, 74_095_248,
    31_157_940, 11_790_760, 4_236_588, 1_396_068, 388_196, 109_156, 22_360,
    4484, 624, 60, 4,
  ];

  // Richard Pavlicek's table of hand patterns, http://www.rpbridge.net/7z77.htm:
  // how many of the hands of 13 cards have each distribution.
  const HANDS_BY_DISTRIBUTION: ReadonlyMap<string, number> = new Map([
    ["4-4-3-2", 136_852_887_600],
    ["5-3-3-2", 98_534_079_072],
    ["5-4-3-1", 82_111_732_560],
    ["5-4-2-2", 67_182_326_640],
    ["4-3-3-3", 66_905_856_160],
    ["6-3-2-2", 35_830_574_208],
    ["6-4-2-1", 29_858_811_840],
    ["6-3-3-1", 21_896_462_016],
    ["5-5-2-1", 20_154_697_992],
    ["4-4-4-1", 19_007_345_500],
    ["7-3-2-1", 11_943_524_736],
    ["6-4-3-0", 8_421_716_160],
    ["5-4-4-0", 7_895_358_900],
    ["5-5-3-0", 5_684_658_408],
    ["6-5-1-1", 4_478_821_776],
    ["6-5-2-0", 4_134_297_024],
    ["7-2-2-2", 3_257_324_928],
    ["7-4-1-1", 2_488_234_320],
    ["7-4-2-0", 2_296_831_680],
    ["7-3-3-0", 1_684_343_232],
    ["8-2-2-1", 1_221_496_848],
    ["8-3-1-1", 746_470_296],
    ["7-5-1-0", 689_049_504],
    ["8-3-2-0", 689_049_504],
    ["6-6-1-0", 459_366_336],
    ["8-4-1-0", 287_103_960],
    ["9-2-1-1", 113_101_560],
    ["9-3-1-0", 63_800_880],
    ["9-2-2-0", 52_200_720],
    ["7-6-0-0", 35_335_872],
    ["8-5-0-0", 19_876_428],
    ["10-2-1-0", 6_960_096],
    ["9-4-0-0", 6_134_700],
    ["10-1-1-1", 2_513_368],
    ["10-3-0-0", 981_552],
    ["11-1-1-0", 158_184],
    ["11-2-0-0", 73_008],
    ["12-1-0-0", 2028],
    ["13-0-0-0", 4],
  ]);

  it("are counted in full by both tables", () => {
    const sum = (counts: Iterable<number>) =>
      [...counts].reduce((total, count) => total + count, 0);
    expect(sum(HANDS_BY_POINTS)).toBe(ALL_HANDS);
    expect(sum(HANDS_BY_DISTRIBUTION.values())).toBe(ALL_HANDS);
  });

  it("hold each number of high-card points in the numbers Pavlicek counts", () => {
    // Only the aces, kings, queens and jacks score, so hands with as many of
    // each score the same. One hand stands for each of the 610 ways to hold
    // them in 13 cards, weighted by how many hands share them.
    const spotCards = RANKS.slice(4).flatMap((rank) =>
      SUITS.map((suit) => card(rank, suit)),
    );
    const handsByPoints = new Map<number, number>();
    let ways = 0;
    for (let aces = 0; aces <= 4; aces++) {
      for (let kings = 0; kings <= 4; kings++) {
        for (let queens = 0; queens <= 4; queens++) {
          for (let jacks = 0; jacks <= 4; jacks++) {
            const spots = 13 - aces - kings - queens - jacks;
            if (spots < 0) continue;
            const hand = [
              ...SUITS.slice(0, aces).map((suit) => card("A", suit)),
              ...SUITS.slice(0, kings).map((suit) => card("K", suit)),
              ...SUITS.slice(0, queens).map((suit) => card("Q", suit)),
              ...SUITS.slice(0, jacks).map((suit) => card("J", suit)),
              ...spotCards.slice(0, spots),
            ];
            const weight =
              choose(4, aces) *
              choose(4, kings) *
              choose(4, queens) *
              choose(4, jacks) *
              choose(36, spots);
            addTo(handsByPoints, highCardPoints(hand), weight);
            ways += 1;
          }
        }
      }
    }
    expect(ways).toBe(610);
    expect(
      HANDS_BY_POINTS.map((_count, points) => handsByPoints.get(points) ?? 0),
    ).toStrictEqual(HANDS_BY_POINTS);
    expect(handsByPoints.size).toBe(HANDS_BY_POINTS.length);
  });

  it("have each distribution in the numbers Pavlicek counts", () => {
    // Hands with as many spades, hearts, diamonds and clubs as each other have
    // the same distribution. One hand stands for each of the 560 ways to hold
    // four suit lengths adding up to 13, weighted by how many hands share them.
    const handsByDistribution = new Map<string, number>();
    let ways = 0;
    for (let spades = 0; spades <= 13; spades++) {
      for (let hearts = 0; hearts <= 13 - spades; hearts++) {
        for (let diamonds = 0; diamonds <= 13 - spades - hearts; diamonds++) {
          const lengths = [
            spades,
            hearts,
            diamonds,
            13 - spades - hearts - diamonds,
          ];
          const hand = SUITS.flatMap((suit, i) =>
            RANKS.slice(0, lengths[i]).map((rank) => card(rank, suit)),
          );
          const weight = lengths.reduce(
            (product, length) => product * choose(13, length),
            1,
          );
          addTo(handsByDistribution, distribution(hand).join("-"), weight);
          ways += 1;
        }
      }
    }
    expect(ways).toBe(560);
    expect(handsByDistribution).toStrictEqual(HANDS_BY_DISTRIBUTION);
  });
});

describe("known hands", () => {
  // [label, hand, high-card points, distribution]
  it.each([
    ["an empty hand", "", 0, [0, 0, 0, 0]],
    ["one card", "QH", 2, [1, 0, 0, 0]],
    [
      "a hand with no ace, king, queen or jack",
      "10S 9S 8H 7H 6H 5D 4D 3D 2D 10C 9C 8C 7C",
      0,
      [4, 4, 3, 2],
    ],
    [
      "the most high-card points 13 cards can hold",
      "AS KS QS JS AH KH QH AD KD QD AC KC QC",
      37,
      [4, 3, 3, 3],
    ],
    ["one suit", "AS KS QS JS 10S 9S 8S 7S 6S 5S 4S 3S 2S", 10, [13, 0, 0, 0]],
    ["two voids", "AS KS QS JS 10S 9S 8S AH KH QH JH 10H 9H", 20, [7, 6, 0, 0]],
    [
      "a hand with a doubleton",
      "AS KS 7S 2S QH 9H 4H 3H KD JD 8D 6C 5C",
      13,
      [4, 4, 3, 2],
    ],
    ["a hand in mid-play", "KS 7S QH 9H 4H JD 8D 6C 5C", 6, [3, 2, 2, 2]],
    ["a copy, counted twice", "AS AS KH", 11, [2, 1, 0, 0]],
  ])("counts %s", (_label, text, points, lengths) => {
    const hand = parseStack(text);
    expect(highCardPoints(hand)).toBe(points);
    expect(distribution(hand)).toStrictEqual(lengths);
  });

  it("counts a standard 52 as 40 high-card points, 13 cards in each suit", () => {
    expect(highCardPoints(standard52())).toBe(40);
    expect(distribution(standard52())).toStrictEqual([13, 13, 13, 13]);
  });
});

describe("counting any cards", () => {
  it("counts as brute force does", () => {
    fc.assert(
      fc.property(stacks(), (hand) => {
        expect(highCardPoints(hand)).toBe(oraclePoints(hand));
        expect(distribution(hand)).toStrictEqual(oracleDistribution(hand));
      }),
    );
  });

  it("gives four suit lengths that add up to the hand's size, longest first", () => {
    fc.assert(
      fc.property(stacks(), (hand) => {
        const lengths = distribution(hand);
        expect(lengths).toHaveLength(4);
        expect(lengths.reduce((total, length) => total + length, 0)).toBe(
          hand.length,
        );
        expect(lengths).toStrictEqual(lengths.toSorted((a, b) => b - a));
      }),
    );
  });

  it("gives a new plain frozen array each time", () => {
    fc.assert(
      fc.property(stacks(), (hand) => {
        const lengths = distribution(hand);
        expect(isPlainFrozen(lengths)).toBe(true);
        expect(distribution(hand)).not.toBe(lengths);
      }),
    );
  });

  it("doesn't depend on the order of the cards", () => {
    const shuffled = stacks().chain((hand) =>
      fc.tuple(
        fc.constant(hand),
        fc.shuffledSubarray(hand, { minLength: hand.length }),
      ),
    );
    fc.assert(
      fc.property(shuffled, ([hand, reordered]) => {
        expect(highCardPoints(reordered)).toBe(highCardPoints(hand));
        expect(distribution(reordered)).toStrictEqual(distribution(hand));
      }),
    );
  });

  it("gives the same answers for cloned cards, which it reads by rank and suit", () => {
    fc.assert(
      fc.property(stacks(), (hand) => {
        const clone = asStack(structuredClone(hand));
        expect(highCardPoints(clone)).toBe(highCardPoints(hand));
        expect(distribution(clone)).toStrictEqual(distribution(hand));
      }),
    );
  });

  it("finds 40 high-card points among four hands dealt from a standard 52, each with 13 cards", () => {
    fc.assert(
      fc.property(seeds, (seed) => {
        const deck = shuffle(standard52(), { random: seededRandom(seed) });
        const { hands } = deal(deck, 4, 13);
        const points = hands.map((hand) => highCardPoints(hand));
        expect(points.reduce((total, each) => total + each, 0)).toBe(40);
        for (const hand of hands) {
          const lengths = distribution(hand);
          expect(lengths.reduce((total, length) => total + length, 0)).toBe(13);
        }
      }),
    );
  });

  it("counts a card with a standard rank but not a standard suit, whose suit it doesn't need for points", () => {
    for (const [, suit] of nonSuits()) {
      const hand = asStack([card("K", "H"), { rank: "A", suit }]);
      expect(highCardPoints(hand)).toBe(7);
    }
  });
});

describe.each([
  ["highCardPoints", highCardPoints],
  ["distribution", distribution],
] as const)("%s", (_name, operation: (hand: CardStack) => unknown) => {
  it("reads the length once and each card once, by index", () => {
    const { reads, stack } = countingReads(parseStack("AS 6H KC"));
    operation(stack);
    expect(reads.length).toBe(1);
    expect(reads.positions).toStrictEqual([1, 1, 1]);
  });

  it("leaves the hand untouched", () => {
    const hand = [...parseStack("AS 6H KC")];
    operation(hand);
    expect(hand).toStrictEqual(parseStack("AS 6H KC"));
    expect(Object.isFrozen(hand)).toBe(false);
  });

  it.each(arraySubclasses())(
    "gives what a plain array gives for %s, frozen or not",
    (_label, make) => {
      fc.assert(
        fc.property(stacks(), fc.boolean(), (hand, frozen) => {
          const given = frozen ? Object.freeze(make(hand)) : make(hand);
          expect(operation(given)).toStrictEqual(operation(hand));
        }),
      );
    },
  );

  it.each(nonArrays())("rejects %s as the hand, naming it", (_label, hand) => {
    expect(thrownBy(() => operation(asStack(hand)))).toMatchObject({
      code: "INVALID_ARGUMENT",
      message: expect.stringMatching(/^Invalid hand /u) as unknown,
    });
  });

  it.each(nonRanks())(
    "rejects a card with %s as its rank, naming its position",
    (_label, rank) => {
      const hand = asStack([card("A", "S"), { rank, suit: "S" }]);
      expect(thrownBy(() => operation(hand))).toMatchObject({
        code: "INVALID_CARD",
        message: expect.stringMatching(
          /^Invalid card with rank .+ at position 1 of the hand: /u,
        ) as unknown,
      });
    },
  );

  it("rejects a hole in the hand, naming its position", () => {
    const hand: Card[] = [card("K", "H")];
    hand.length = 2;
    expect(thrownBy(() => operation(hand))).toMatchObject({
      code: "INVALID_CARD",
      message: expect.stringMatching(
        /^Invalid card undefined at position 1 of the hand: /u,
      ) as unknown,
    });
  });

  it.each([
    ["undefined", undefined, "undefined"],
    ["null", null, "null"],
    ["a string", "AS", '"AS"'],
    ["a number", 1, "1"],
  ])("rejects %s in the hand, naming its position", (_label, value, shown) => {
    const hand = asStack([card("K", "H"), value]);
    expect(thrownBy(() => operation(hand))).toMatchObject({
      code: "INVALID_CARD",
      message: `Invalid card ${shown} at position 1 of the hand: expected a card with rank "A", "2" to "10", "J", "Q" or "K"`,
    });
  });

  it("checks every card, however many come before", () => {
    const hand = asStack([...parseStack("AS KH QD JC 10S"), null]);
    expect(thrownBy(() => operation(hand))).toMatchObject({
      code: "INVALID_CARD",
      message: expect.stringMatching(
        / at position 5 of the hand: /u,
      ) as unknown,
    });
  });
});

describe("distribution's suits", () => {
  it.each(nonSuits())(
    "rejects a card with %s as its suit, naming its position",
    (_label, suit) => {
      const hand = asStack([card("A", "S"), { rank: "K", suit }]);
      expect(thrownBy(() => distribution(hand))).toMatchObject({
        code: "INVALID_CARD",
        message: expect.stringMatching(
          /^Invalid card with suit .+ at position 1 of the hand: expected a card with suit "S", "H", "D" or "C"$/u,
        ) as unknown,
      });
    },
  );
});
