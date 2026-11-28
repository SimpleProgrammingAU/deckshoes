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
  short,
  tally,
  thrownBy,
} from "../../test/helpers.ts";
import { type Card, card } from "../card.ts";
import { formatStack, parseStack } from "../compact.ts";
import { standard52 } from "../presets/standard52.ts";
import { Category } from "./category.ts";
import { bestHand, compareHands, handCategory } from "./hand.ts";

/** Each standard rank's place, with an ace high, written out here rather than shared with the implementation. */
const PLACES: Readonly<Record<string, number>> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

/** The categories from lowest to highest. */
const CATEGORIES: readonly Category[] = [
  Category.HIGH_CARD,
  Category.ONE_PAIR,
  Category.TWO_PAIR,
  Category.THREE_OF_A_KIND,
  Category.STRAIGHT,
  Category.FLUSH,
  Category.FULL_HOUSE,
  Category.FOUR_OF_A_KIND,
  Category.STRAIGHT_FLUSH,
];

/**
 * A poker hand of five cards or fewer, judged by brute force: its category's
 * index in CATEGORIES, then the places that settle a tie, in the order they're
 * compared. Written without the implementation's approach: the ranks grouped
 * by how often they come, and a straight read off the sorted places.
 */
function oracleScore(cards: readonly Card[]): number[] {
  const places = cards
    .map((c) => PLACES[c.rank] ?? NaN)
    .toSorted((a, b) => b - a);
  const groups = [...tally(places)].toSorted(
    ([placeA, countA], [placeB, countB]) => countB - countA || placeB - placeA,
  );
  const shape = groups.map(([, count]) => count).join("");
  const grouped = groups.map(([place]) => place);
  const five = cards.length === 5;
  const flush = five && cards.every((c) => c.suit === cards[0]?.suit);
  let top: number | undefined;
  if (five && shape === "11111") {
    if (places[0] === (places[4] ?? NaN) + 4) top = places[0];
    if (places.join(",") === "14,5,4,3,2") top = 5;
  }
  if (flush && top !== undefined) return [8, top];
  if (shape.startsWith("4")) return [7, ...grouped];
  if (shape === "32") return [6, ...grouped];
  if (flush) return [5, ...places];
  if (top !== undefined) return [4, top];
  if (shape.startsWith("3")) return [3, ...grouped];
  if (shape.startsWith("22")) return [2, ...grouped];
  if (shape.startsWith("2")) return [1, ...grouped];
  return [0, ...places];
}

/** Compares two scores from {@link oracleScore} in turn, as -1, 0 or 1. */
function compareScores(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

/** Every way to choose `count` of the cards, keeping their order. */
function choose(cards: readonly Card[], count: number): Card[][] {
  return count === 0
    ? [[]]
    : cards.flatMap((c, i) =>
        choose(cards.slice(i + 1), count - 1).map((rest) => [c, ...rest]),
      );
}

/** The score of the best poker hand among some cards, by brute force: the best of every five, or all of them when there are fewer. */
function oracleBest(cards: readonly Card[]): number[] {
  return cards.length < 5
    ? oracleScore(cards)
    : choose(cards, 5)
        .map((five) => oracleScore(five))
        .reduce((best, score) =>
          compareScores(score, best) > 0 ? score : best,
        );
}

/** Distinct standard cards, as one deck deals them, in any order: from `min` to `max` of them. */
function dealt(min: number, max: number): fc.Arbitrary<Card[]> {
  return fc.shuffledSubarray([...standard52()], {
    maxLength: max,
    minLength: min,
  });
}

/** The cards of a stack as compact text, to compare whole stacks. */
function text(cards: CardStack): string {
  return formatStack(cards);
}

describe("known poker hands", () => {
  // [cards, category, best hand]
  it.each([
    ["AS KS QS JS 10S", Category.STRAIGHT_FLUSH, "AS KS QS JS 10S"],
    ["5D 4D 3D 2D AD", Category.STRAIGHT_FLUSH, "5D 4D 3D 2D AD"],
    ["9C 9D 9H 9S 2C", Category.FOUR_OF_A_KIND, "9C 9D 9H 9S 2C"],
    ["KS KH KD 4C 4S", Category.FULL_HOUSE, "KS KH KD 4C 4S"],
    ["2H 5H 7H 9H JH", Category.FLUSH, "JH 9H 7H 5H 2H"],
    ["AS KD QC JH 10S", Category.STRAIGHT, "AS KD QC JH 10S"],
    ["5S 4H 3D 2C AS", Category.STRAIGHT, "5S 4H 3D 2C AS"],
    ["7S 7H 7D KC 2S", Category.THREE_OF_A_KIND, "7S 7H 7D KC 2S"],
    ["JS 4D JH 4C 9S", Category.TWO_PAIR, "JS JH 4D 4C 9S"],
    ["10S 3S AD 10H 8C", Category.ONE_PAIR, "10S 10H AD 8C 3S"],
    ["QH KC AD 2S 3H", Category.HIGH_CARD, "AD KC QH 3H 2S"],
    ["AS 7D 5C 3H 2S", Category.HIGH_CARD, "AS 7D 5C 3H 2S"],
    // Seven cards.
    ["AS KS QS JS 10S 2H 3D", Category.STRAIGHT_FLUSH, "AS KS QS JS 10S"],
    ["9S 8S 7S 6S 5S 10H JD", Category.STRAIGHT_FLUSH, "9S 8S 7S 6S 5S"],
    ["9H 8H 7C 6H 5D 2H KH", Category.FLUSH, "KH 9H 8H 6H 2H"],
    ["KS KH KD 4C 4S 4H 2D", Category.FULL_HOUSE, "KS KH KD 4C 4S"],
    ["3S 3H 3D KS KH KD 2C", Category.FULL_HOUSE, "KS KH KD 3S 3H"],
    ["9C 9D 9H 9S KC KD KH", Category.FOUR_OF_A_KIND, "9C 9D 9H 9S KC"],
    ["9C 9D 9H 9S QC QD KH", Category.FOUR_OF_A_KIND, "9C 9D 9H 9S KH"],
    ["AS AH KS KH QS QH 2C", Category.TWO_PAIR, "AS AH KS KH QS"],
    ["AS AH KS KH 3S 3H 7C", Category.TWO_PAIR, "AS AH KS KH 7C"],
    ["AS 2D 3C 4H 5S 6D KC", Category.STRAIGHT, "6D 5S 4H 3C 2D"],
    ["AS 2D 3C 4H 5S 9D KC", Category.STRAIGHT, "5S 4H 3C 2D AS"],
    ["9S 9H 8D 7C 6S 5H 2C", Category.STRAIGHT, "9S 8D 7C 6S 5H"],
    ["QH KC AD 2S 3H 4D 9C", Category.HIGH_CARD, "AD KC QH 9C 4D"],
    ["3D JC 3S 9H 2C 7D 5S", Category.ONE_PAIR, "3D 3S JC 9H 7D"],
    // More than seven cards.
    ["KS KH KD 3S 3H 3D AS AH", Category.FULL_HOUSE, "KS KH KD AS AH"],
    ["2H 5H 7H 9H JH 3S 6S 8S 10S QS", Category.FLUSH, "QS 10S 8S 6S 3S"],
    ["2H 5H 7H 9H JH 2S 5S 7S 9S JS", Category.FLUSH, "JH 9H 7H 5H 2H"],
    [
      "5H 6H 7H 8H 9H 6S 7S 8S 9S 10S",
      Category.STRAIGHT_FLUSH,
      "10S 9S 8S 7S 6S",
    ],
    // Fewer than five cards.
    ["AS", Category.HIGH_CARD, "AS"],
    ["8C 8D", Category.ONE_PAIR, "8C 8D"],
    ["7H KS 7C", Category.ONE_PAIR, "7H 7C KS"],
    ["KH 7C KS AD", Category.ONE_PAIR, "KH KS AD 7C"],
    ["7S 7H 7D", Category.THREE_OF_A_KIND, "7S 7H 7D"],
    ["7S 2C 7H 7D", Category.THREE_OF_A_KIND, "7S 7H 7D 2C"],
    ["JS JH 4D 4C", Category.TWO_PAIR, "JS JH 4D 4C"],
    ["9S 9H 9D 9C", Category.FOUR_OF_A_KIND, "9S 9H 9D 9C"],
    ["AS KS QS JS", Category.HIGH_CARD, "AS KS QS JS"],
    ["5S 4S 3S 2S", Category.HIGH_CARD, "5S 4S 3S 2S"],
  ] as const)("%s is %s: %s", (cards, category, best) => {
    const stack = parseStack(cards);
    expect(handCategory(stack)).toBe(category);
    expect(text(bestHand(stack))).toBe(best);
  });

  it("finds the royal flush in hearts in a standard 52, whose hearts come first", () => {
    expect(handCategory(standard52())).toBe(Category.STRAIGHT_FLUSH);
    expect(text(bestHand(standard52()))).toBe("AH KH QH JH 10H");
  });
});

describe("comparing poker hands", () => {
  // [cards, other cards, result]
  it.each([
    ["2H 5H 7H 9H JH", "AS KD QC JH 10S", 1],
    ["5S 4H 3D 2C AS", "AH AD AC KS QH", 1],
    ["9C 9D 9H 9S 2C", "KS KH KD AC AH", 1],
    ["QS QD 9C 5H 2D", "QH QC 9S 7D 3C", -1],
    ["KS KH 9C 9D 2S", "KD KC 8S 8H AS", 1],
    ["KS KH 9C 9D 3S", "KD KC 9S 9H 2C", 1],
    ["AH KH 9H 6H 3H", "AS KS 9S 6S 2S", 1],
    ["5S 4H 3D 2C AS", "6S 5H 4D 3C 2H", -1],
    ["4S 4H 4D 2S 2H", "3S 3H 3D AS AH", 1],
    ["KS KH KD 5C 5S", "KS KH KC 4C 4S", 1],
    ["9C 9D 9H 9S AC", "9C 9D 9H 9S KC", 1],
    ["AS KS QD JC 10H", "AH KD QS JH 10C", 0],
    ["AH KH 9H 6H 3H", "AS KS 9S 6S 3S", 0],
    ["AS KD QC JH 9S", "AH KC QD JS 8H", 1],
    // Hands of different sizes, both of five cards or more.
    ["AS KS QS JS 10S 2H 3D", "AH AD AC KS KH QD", 1],
    ["AS KS 2D 3C 4H", "AH KH 2S 3D 4C 7S 8S", -1],
    // Fewer than five cards, of the same size.
    ["AS AH", "KS KH", 1],
    ["2C 2D", "AS KH", 1],
    ["AS KD", "AH KC", 0],
    ["AS AH KD", "AC AD QH", 1],
    ["7S 7H 7D", "AS AH KD", 1],
    ["JS JH 4D 4C", "JD JC 3S 3H", 1],
  ] as const)("%s against %s is %i", (cards, otherCards, result) => {
    expect(compareHands(parseStack(cards), parseStack(otherCards))).toBe(
      result,
    );
    expect(compareHands(parseStack(otherCards), parseStack(cards))).toBe(
      result === 0 ? 0 : -result,
    );
  });
});

describe("every distinct five-card poker hand", () => {
  /** One five-card poker hand for each of the 7,462 that differ in ranks or in being a flush. */
  function distinctHands(): Card[][] {
    const ranks = Object.keys(PLACES) as Card["rank"][];
    const suits = ["S", "H", "D", "C"] as const;
    const hands: Card[][] = [];
    const build = (start: number, chosen: number[]): void => {
      if (chosen.length < 5) {
        for (let index = start; index < ranks.length; index++) {
          const held = chosen.filter((i) => i === index).length;
          if (held < 4) build(index, [...chosen, index]);
        }
        return;
      }
      // Each copy of a rank gets the next suit, so a repeated rank can't make
      // a flush. Five different ranks all get spades, a flush, and then again
      // with the last in hearts, which isn't.
      const copies = new Map<number, number>();
      const hand = chosen.map((index) => {
        const copy = copies.get(index) ?? 0;
        copies.set(index, copy + 1);
        return card(ranks[index] ?? "2", suits[copy] ?? "S");
      });
      hands.push(hand);
      const last = hand[4];
      if (copies.size === 5 && last !== undefined) {
        hands.push([...hand.slice(0, 4), card(last.rank, "H")]);
      }
    };
    build(0, []);
    return hands;
  }

  const hands = distinctHands();

  it("number 7,462", () => {
    expect(hands).toHaveLength(7462);
  });

  it("fall into the categories in the numbers poker's odds give", () => {
    const counts = tally(hands.map((hand) => handCategory(hand)));
    expect(Object.fromEntries(counts)).toStrictEqual({
      [Category.STRAIGHT_FLUSH]: 10,
      [Category.FOUR_OF_A_KIND]: 156,
      [Category.FULL_HOUSE]: 156,
      [Category.FLUSH]: 1277,
      [Category.STRAIGHT]: 10,
      [Category.THREE_OF_A_KIND]: 858,
      [Category.TWO_PAIR]: 858,
      [Category.ONE_PAIR]: 2860,
      [Category.HIGH_CARD]: 1277,
    });
  });

  it("sort into 7,462 places with no ties, in the order brute force gives", () => {
    const sorted = hands.toSorted(compareHands);
    for (let i = 1; i < sorted.length; i++) {
      const lower = sorted[i - 1] ?? [];
      const higher = sorted[i] ?? [];
      expect(compareHands(lower, higher)).toBe(-1);
      expect(compareScores(oracleScore(lower), oracleScore(higher))).toBe(-1);
    }
  });
});

describe("judging any cards", () => {
  it("finds the category and best five that brute force finds, from 1 to 9 cards", () => {
    fc.assert(
      fc.property(dealt(1, 9), (cards) => {
        const best = oracleBest(cards);
        expect(handCategory(cards)).toBe(CATEGORIES[best[0] ?? NaN]);
        const hand = bestHand(cards);
        expect(hand).toHaveLength(Math.min(cards.length, 5));
        expect(oracleScore(hand)).toStrictEqual(best);
      }),
    );
  });

  it("compares as brute force does", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ max: 9, min: 1 })
          .chain((size) =>
            fc.tuple(
              dealt(size, size),
              size >= 5 ? dealt(5, 9) : dealt(size, size),
            ),
          ),
        ([cards, otherCards]) => {
          expect(compareHands(cards, otherCards)).toBe(
            compareScores(oracleBest(cards), oracleBest(otherCards)),
          );
        },
      ),
    );
  });

  it("gives some of the cards it was given, each once, as a plain frozen stack", () => {
    fc.assert(
      fc.property(dealt(1, 20), (cards) => {
        const hand = bestHand(cards);
        expect(isPlainFrozen(hand)).toBe(true);
        expect(new Set(hand).size).toBe(hand.length);
        for (const c of hand) expect(cards).toContain(c);
      }),
    );
  });

  it("judges the best five as it judges all the cards", () => {
    fc.assert(
      fc.property(dealt(5, 20), (cards) => {
        const hand = bestHand(cards);
        expect(handCategory(hand)).toBe(handCategory(cards));
        expect(compareHands(hand, cards)).toBe(0);
        expect(text(bestHand(hand))).toBe(text(hand));
      }),
    );
  });

  it("doesn't depend on the order of the cards", () => {
    fc.assert(
      fc.property(
        dealt(1, 12).chain((cards) =>
          fc.tuple(
            fc.constant(cards),
            fc.shuffledSubarray(cards, {
              maxLength: cards.length,
              minLength: cards.length,
            }),
          ),
        ),
        ([cards, reordered]) => {
          expect(handCategory(reordered)).toBe(handCategory(cards));
          expect(compareHands(reordered, cards)).toBe(0);
        },
      ),
    );
  });

  it("is antisymmetric and transitive", () => {
    fc.assert(
      fc.property(dealt(5, 7), dealt(5, 7), dealt(5, 7), (a, b, c) => {
        expect(compareHands(a, b) + compareHands(b, a)).toBe(0);
        // Sorted, the three compare in order.
        const [low, middle, high] = [a, b, c].toSorted(compareHands);
        expect(compareHands(low ?? a, middle ?? a)).toBeLessThanOrEqual(0);
        expect(compareHands(middle ?? a, high ?? a)).toBeLessThanOrEqual(0);
        expect(compareHands(low ?? a, high ?? a)).toBeLessThanOrEqual(0);
      }),
    );
  });

  it("gives the same answers for cloned cards, which it reads by rank and suit, and gives the clones back", () => {
    fc.assert(
      fc.property(dealt(1, 9), (cards) => {
        const clone = structuredClone(cards);
        expect(handCategory(clone)).toBe(handCategory(cards));
        expect(compareHands(clone, cards)).toBe(0);
        const hand = bestHand(clone);
        expect(hand.map((c) => short(c))).toStrictEqual(
          bestHand(cards).map((c) => short(c)),
        );
        for (const c of hand) expect(clone).toContain(c);
      }),
    );
  });
});

/** A royal flush, the other poker hand when `compareHands` is under test. */
const ROYAL_FLUSH = parseStack("AS KS QS JS 10S");

/** Five cards that make a poker hand, with room for a card to go wrong at position 1. */
const FIVE = "AS 6H KC 6D 2S";

/** The functions under test, each taking one stack, with `compareHands` given a royal flush as its other poker hand. */
const OPERATIONS = [
  ["handCategory", "cards", handCategory],
  ["bestHand", "cards", bestHand],
  [
    "compareHands",
    "cards",
    (cards: CardStack) => compareHands(cards, ROYAL_FLUSH),
  ],
  [
    "compareHands, for its other cards",
    "other cards",
    (cards: CardStack) => compareHands(ROYAL_FLUSH, cards),
  ],
] as const;

describe.each(OPERATIONS)(
  "%s",
  (_name, stackName, operation: (cards: CardStack) => unknown) => {
    /** Five cards with `value` at position 1. */
    const withSecond = (value: unknown): CardStack =>
      asStack([card("Q", "D"), value, ...parseStack("JC 10H 9S 8D")]);

    it("reads the length once and each card once, by index", () => {
      const { reads, stack } = countingReads(parseStack(FIVE));
      operation(stack);
      expect(reads.length).toBe(1);
      expect(reads.positions).toStrictEqual([1, 1, 1, 1, 1]);
    });

    it("leaves the cards untouched", () => {
      const cards = [...parseStack(FIVE)];
      operation(cards);
      expect(cards).toStrictEqual(parseStack(FIVE));
      expect(Object.isFrozen(cards)).toBe(false);
    });

    it.each(arraySubclasses())(
      "gives what a plain array gives for %s, frozen or not",
      (_label, make) => {
        fc.assert(
          fc.property(dealt(5, 9), fc.boolean(), (cards, frozen) => {
            const given = frozen ? Object.freeze(make(cards)) : make(cards);
            expect(operation(given)).toStrictEqual(operation(cards));
          }),
        );
      },
    );

    it.each(nonArrays())(
      `rejects %s as the ${stackName}, naming them`,
      (_label, cards) => {
        expect(thrownBy(() => operation(asStack(cards)))).toMatchObject({
          code: "INVALID_ARGUMENT",
          message: expect.stringMatching(
            new RegExp(`^Invalid ${stackName} `, "u"),
          ) as unknown,
        });
      },
    );

    it("rejects no cards", () => {
      expect(thrownBy(() => operation([]))).toMatchObject({
        available: 0,
        code: "INSUFFICIENT_CARDS",
        requested: 1,
      });
    });

    it.each(nonRanks())(
      "rejects a card with %s as its rank, naming its position",
      (_label, rank) => {
        expect(
          thrownBy(() => operation(withSecond({ rank, suit: "S" }))),
        ).toMatchObject({
          code: "INVALID_CARD",
          message: expect.stringMatching(
            new RegExp(
              `^Invalid card with rank .+ at position 1 of the ${stackName}: `,
              "u",
            ),
          ) as unknown,
        });
      },
    );

    it.each(nonSuits())(
      "rejects a card with %s as its suit, naming its position",
      (_label, suit) => {
        expect(
          thrownBy(() => operation(withSecond({ rank: "K", suit }))),
        ).toMatchObject({
          code: "INVALID_CARD",
          message: expect.stringMatching(
            new RegExp(
              `^Invalid card with suit .+ at position 1 of the ${stackName}: expected a card with suit "S", "H", "D" or "C"$`,
              "u",
            ),
          ) as unknown,
        });
      },
    );

    it.each([
      ["undefined", undefined, "undefined"],
      ["null", null, "null"],
      ["a string", "AS", '"AS"'],
      ["a number", 1, "1"],
    ])(
      "rejects %s in the cards, naming its position",
      (_label, value, shown) => {
        expect(thrownBy(() => operation(withSecond(value)))).toMatchObject({
          code: "INVALID_CARD",
          message: `Invalid card ${shown} at position 1 of the ${stackName}: expected a card with rank "A", "2" to "10", "J", "Q" or "K"`,
        });
      },
    );

    it("rejects a hole in the cards, naming its position", () => {
      const cards: Card[] = [card("Q", "D")];
      cards.length = 2;
      cards.push(...parseStack("JC 10H 9S 8D"));
      expect(thrownBy(() => operation(cards))).toMatchObject({
        code: "INVALID_CARD",
        message: expect.stringMatching(
          new RegExp(
            `^Invalid card undefined at position 1 of the ${stackName}: `,
            "u",
          ),
        ) as unknown,
      });
    });

    it("rejects a copy of a card, naming both positions, even a clone", () => {
      for (const copy of [card("A", "S"), structuredClone(card("A", "S"))]) {
        const cards = asStack([
          card("A", "S"),
          card("K", "H"),
          copy,
          ...parseStack("QD JC"),
        ]);
        expect(thrownBy(() => operation(cards))).toMatchObject({
          code: "INVALID_ARGUMENT",
          message: `Can't judge the ${stackName}: the cards at positions 0 and 2 are the same card, and a poker hand is dealt from one deck`,
        });
      }
    });

    it("checks every card, even past the ones it needs", () => {
      const cards = asStack([...parseStack("AS KS QS JS 10S 2H"), null]);
      expect(thrownBy(() => operation(cards))).toMatchObject({
        code: "INVALID_CARD",
      });
    });
  },
);

describe("compareHands with hands of different sizes", () => {
  it.each([
    ["AS AH", "KS KH KD"],
    ["AS AH KS KH", "QS QH QD QC 2S"],
    ["AS", "KS KH KD KC 2S 3S 4S"],
  ])("rejects %s against %s", (cards, otherCards) => {
    for (const [a, b] of [
      [cards, otherCards],
      [otherCards, cards],
    ] as const) {
      expect(
        thrownBy(() => compareHands(parseStack(a), parseStack(b))),
      ).toMatchObject({
        code: "INVALID_ARGUMENT",
        message: expect.stringMatching(
          /^Can't compare poker hands of \d+ cards? and \d+ cards?: below five cards, a poker hand is only compared with one of the same size$/u,
        ) as unknown,
      });
    }
  });

  it("names the sizes, one card or more", () => {
    expect(
      thrownBy(() => compareHands(parseStack("AS"), parseStack("KS KH"))),
    ).toMatchObject({
      message: expect.stringMatching(
        /^Can't compare poker hands of 1 card and 2 cards: /u,
      ) as unknown,
    });
  });
});
