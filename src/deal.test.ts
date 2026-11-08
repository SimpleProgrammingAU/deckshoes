import fc, { type Arbitrary } from "fast-check";
import { describe, expect, it } from "vitest";

import type { Card } from "./card.ts";

import {
  arraySubclasses,
  asStack,
  deals,
  isPlainFrozen,
  nonArrays,
  sparseStacks,
  stacks,
  thrownBy,
} from "../test/helpers.ts";
import { card } from "./card.ts";
import {
  deal,
  type DealOptions,
  HandSize,
  PacketSize,
  RunOut,
} from "./deal.ts";
import { draw } from "./draw.ts";
import { standard52 } from "./presets/standard52.ts";
import { seededRandom } from "./random.ts";

const ACE = card("A", "S");
const KING = card("K", "H");
const TEN = card("10", "D");
const hand = [ACE, KING, TEN];

/** Lets a test pass options that the types rule out. */
function asDealOptions(value: unknown): DealOptions {
  return value as DealOptions;
}

/** Whether two arrays hold the very same values in the same order. */
function sameValues(
  actual: readonly unknown[],
  expected: readonly unknown[],
): boolean {
  return (
    actual.length === expected.length &&
    actual.every((value, i) => Object.is(value, expected[i]))
  );
}

/** Puts dealt hands back in the order their cards were dealt, a packet from each hand in turn. */
function rejoin<C>(hands: readonly (readonly C[])[], packet: number): C[] {
  const cards: C[] = [];
  const longest = Math.max(0, ...hands.map((dealt) => dealt.length));
  for (let held = 0; held < longest; held += packet) {
    for (const dealt of hands) cards.push(...dealt.slice(held, held + packet));
  }
  return cards;
}

/** A deck with a hand count and hand size it holds too few cards for. */
function shortDeals(): Arbitrary<{
  deck: Card[];
  handCount: number;
  handSize: number;
}> {
  return stacks().chain((deck) =>
    fc.integer({ max: 10, min: 1 }).chain((handCount) =>
      fc.record({
        deck: fc.constant(deck),
        handCount: fc.constant(handCount),
        handSize: fc.integer({
          max: Math.floor(deck.length / handCount) + 5,
          min: Math.floor(deck.length / handCount) + 1,
        }),
      }),
    ),
  );
}

describe("deal", () => {
  describe("with a hand size", () => {
    it("gives each hand its cards, and loses no card or changes its order", () => {
      fc.assert(
        fc.property(deals(), ({ deck, handCount, handSize, packetSize }) => {
          const { hands, remainder } = deal(deck, handCount, handSize, {
            packetSize,
          });
          expect(hands).toHaveLength(handCount);
          expect(hands.every((dealt) => dealt.length === handSize)).toBe(true);
          expect(
            sameValues([...rejoin(hands, packetSize ?? 1), ...remainder], deck),
          ).toBe(true);
        }),
      );
    });

    it("keeps every value of a stack of anything, in order", () => {
      fc.assert(
        fc.property(
          deals(fc.array(fc.anything())),
          ({ deck, handCount, handSize, packetSize }) => {
            const { hands, remainder } = deal(deck, handCount, handSize, {
              packetSize,
            });
            expect(
              sameValues(
                [...rejoin(hands, packetSize ?? 1), ...remainder],
                deck,
              ),
            ).toBe(true);
          },
        ),
      );
    });

    it("deals round-robin when the packet size is left out, undefined or 1", () => {
      fc.assert(
        fc.property(deals(), ({ deck, handCount, handSize }) => {
          const expected = deal(deck, handCount, handSize, { packetSize: 1 });
          expect(deal(deck, handCount, handSize)).toStrictEqual(expected);
          expect(deal(deck, handCount, handSize, {})).toStrictEqual(expected);
          expect(
            deal(deck, handCount, handSize, { packetSize: undefined }),
          ).toStrictEqual(expected);
        }),
      );
    });

    it("gives each hand all its cards at once for PacketSize.HAND, or any packet that big", () => {
      fc.assert(
        fc.property(
          deals(),
          fc.nat({ max: 10 }),
          ({ deck, handCount, handSize }, bigger) => {
            const result = deal(deck, handCount, handSize, {
              packetSize: PacketSize.HAND,
            });
            expect(
              deal(deck, handCount, handSize, {
                packetSize: handSize + bigger,
              }),
            ).toStrictEqual(result);
            let left = deck;
            for (const dealt of result.hands) {
              const drawn = draw(left, handSize);
              expect(dealt).toStrictEqual(drawn.cards);
              left = [...drawn.remainder];
            }
            expect(result.remainder).toStrictEqual(left);
          },
        ),
      );
    });

    it("deals the same with RunOut.STOP as with RunOut.THROW when there are enough cards", () => {
      fc.assert(
        fc.property(deals(), ({ deck, handCount, handSize, packetSize }) => {
          const expected = deal(deck, handCount, handSize, {
            packetSize,
            runOut: RunOut.THROW,
          });
          expect(
            deal(deck, handCount, handSize, { packetSize, runOut: undefined }),
          ).toStrictEqual(expected);
          expect(
            deal(deck, handCount, handSize, {
              packetSize,
              runOut: RunOut.STOP,
            }),
          ).toStrictEqual(expected);
        }),
      );
    });

    it("deals packets of 3 then 2 for hands of 5, as in Euchre", () => {
      const deck = standard52().slice(0, 24);
      const { hands, remainder } = deal(deck, 4, 5, { packetSize: 3 });
      const at = (...indices: number[]) => indices.map((i) => deck[i]);
      expect(hands).toStrictEqual([
        at(0, 1, 2, 12, 13),
        at(3, 4, 5, 14, 15),
        at(6, 7, 8, 16, 17),
        at(9, 10, 11, 18, 19),
      ]);
      expect(remainder).toStrictEqual(at(20, 21, 22, 23));
    });

    it("puts the first card dealt to a hand on top", () => {
      expect(deal(hand, 1, 3).hands).toStrictEqual([[ACE, KING, TEN]]);
      expect(deal(hand, 3, 1).hands).toStrictEqual([[ACE], [KING], [TEN]]);
    });

    it("deals copies as separate cards", () => {
      expect(deal([ACE, ACE, KING, KING], 2, 2).hands).toStrictEqual([
        [ACE, KING],
        [ACE, KING],
      ]);
    });
  });

  describe("with HandSize.MAXIMIZE", () => {
    it("deals out the whole deck as evenly as possible, the first hands getting the extra cards", () => {
      fc.assert(
        fc.property(
          stacks().filter((deck) => deck.length > 0),
          fc.option(fc.integer({ max: 8, min: 1 }), { nil: undefined }),
          fc.integer({ max: 104, min: 1 }),
          (deck, packetSize, count) => {
            const handCount = Math.min(count, deck.length);
            const { hands, remainder } = deal(
              deck,
              handCount,
              HandSize.MAXIMIZE,
              { packetSize },
            );
            const sizes = hands.map((dealt) => dealt.length);
            expect(sizes).toHaveLength(handCount);
            expect(
              sizes.every((size, i) => size <= (sizes[i - 1] ?? size)),
            ).toBe(true);
            expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThan(2);
            expect(remainder).toStrictEqual([]);
            expect(sameValues(rejoin(hands, packetSize ?? 1), deck)).toBe(true);
          },
        ),
      );
    });

    it("gives 18, 17 and 17 cards from 52 to 3 hands, whatever the packet size", () => {
      for (const packetSize of [1, 3, 17, PacketSize.HAND]) {
        const { hands } = deal(standard52(), 3, HandSize.MAXIMIZE, {
          packetSize,
        });
        expect(hands.map((dealt) => dealt.length)).toStrictEqual([18, 17, 17]);
      }
    });

    it("gives the first hands a card each, and the rest none, with more hands than cards and RunOut.STOP", () => {
      expect(
        deal([ACE, KING], 4, HandSize.MAXIMIZE, { runOut: RunOut.STOP }),
      ).toStrictEqual({ hands: [[ACE], [KING], [], []], remainder: [] });
      expect(
        deal([], 3, HandSize.MAXIMIZE, { runOut: RunOut.STOP }),
      ).toStrictEqual({ hands: [[], [], []], remainder: [] });
    });
  });

  describe("with RunOut.STOP and too few cards", () => {
    it("deals every card, leaving short hands", () => {
      fc.assert(
        fc.property(
          shortDeals(),
          fc.option(fc.integer({ max: 8, min: 1 }), { nil: undefined }),
          ({ deck, handCount, handSize }, packetSize) => {
            const { hands, remainder } = deal(deck, handCount, handSize, {
              packetSize,
              runOut: RunOut.STOP,
            });
            expect(hands).toHaveLength(handCount);
            expect(hands.every((dealt) => dealt.length <= handSize)).toBe(true);
            expect(remainder).toStrictEqual([]);
            expect(sameValues(rejoin(hands, packetSize ?? 1), deck)).toBe(true);
          },
        ),
      );
    });

    it("stops partway through a round, as a dealer following packets would", () => {
      const { hands } = deal(standard52(), 3, 18, {
        packetSize: 3,
        runOut: RunOut.STOP,
      });
      expect(hands.map((dealt) => dealt.length)).toStrictEqual([18, 18, 16]);
    });
  });

  describe("its inputs and results", () => {
    it("leaves the deck unchanged, frozen or not", () => {
      fc.assert(
        fc.property(
          deals(),
          fc.boolean(),
          ({ deck: original, handCount, handSize, packetSize }, frozen) => {
            const deck = frozen ? Object.freeze([...original]) : [...original];
            deal(deck, handCount, handSize, { packetSize });
            expect(sameValues(deck, original)).toBe(true);
            expect(Object.isFrozen(deck)).toBe(frozen);
          },
        ),
      );
    });

    it.each([
      ["some cards to each of several hands", 2, 1],
      ["every card to several hands", 3, 1],
      ["every card to one hand", 1, 3],
    ])(
      "returns new frozen stacks in frozen objects for %s",
      (_label, handCount, handSize) => {
        const deck = Object.freeze([ACE, KING, TEN]);
        const result = deal(deck, handCount, handSize);
        expect(Object.isFrozen(result)).toBe(true);
        expect(Object.isFrozen(result.hands)).toBe(true);
        expect(result.hands.every((dealt) => Object.isFrozen(dealt))).toBe(
          true,
        );
        expect(Object.isFrozen(result.remainder)).toBe(true);
        expect(result.hands.every((dealt) => dealt !== deck)).toBe(true);
        expect(result.remainder).not.toBe(deck);
      },
    );

    it.each(arraySubclasses())(
      "gives plain frozen stacks holding the right cards for %s, frozen or not",
      (_label, make) => {
        fc.assert(
          fc.property(
            deals(),
            fc.boolean(),
            ({ deck, handCount, handSize, packetSize }, frozen) => {
              const given = frozen ? Object.freeze(make(deck)) : make(deck);
              const result = deal(given, handCount, handSize, { packetSize });
              expect(result).toStrictEqual(
                deal(deck, handCount, handSize, { packetSize }),
              );
              expect(isPlainFrozen(result.hands)).toBe(true);
              expect(result.hands.every((dealt) => isPlainFrozen(dealt))).toBe(
                true,
              );
              expect(isPlainFrozen(result.remainder)).toBe(true);
            },
          ),
        );
      },
    );

    it("reads a hole as undefined", () => {
      fc.assert(
        fc.property(
          deals(sparseStacks()),
          ({ deck, handCount, handSize, packetSize }) => {
            // Spreading turns each hole into undefined, and toStrictEqual tells them apart.
            expect(
              deal(deck, handCount, handSize, { packetSize }),
            ).toStrictEqual(
              deal([...deck], handCount, handSize, { packetSize }),
            );
          },
        ),
      );
    });

    it("reads each option once", () => {
      const reads = { packetSize: 0, runOut: 0 };
      const options = {
        get packetSize() {
          reads.packetSize++;
          return 2;
        },
        get runOut() {
          reads.runOut++;
          return RunOut.THROW;
        },
      };
      deal(standard52(), 4, 5, options);
      expect(reads).toStrictEqual({ packetSize: 1, runOut: 1 });
    });
  });

  describe("with too few cards", () => {
    it("throws with the cards needed and the cards in the deck", () => {
      fc.assert(
        fc.property(shortDeals(), ({ deck, handCount, handSize }) => {
          expect(thrownBy(() => deal(deck, handCount, handSize))).toMatchObject(
            {
              available: deck.length,
              code: "INSUFFICIENT_CARDS",
              requested: handCount * handSize,
            },
          );
        }),
      );
    });

    it("throws for an empty deck", () => {
      expect(thrownBy(() => deal([], 1, 1))).toMatchObject({
        available: 0,
        code: "INSUFFICIENT_CARDS",
        requested: 1,
      });
    });

    it("gives the product as computed, even when it's too big to hold", () => {
      expect(
        thrownBy(() => deal(hand, 2 ** 32 - 1, Number.MAX_VALUE)),
      ).toMatchObject({ code: "INSUFFICIENT_CARDS", requested: Infinity });
    });

    it("needs a card for each hand with HandSize.MAXIMIZE", () => {
      expect(thrownBy(() => deal(hand, 5, HandSize.MAXIMIZE))).toMatchObject({
        available: 3,
        code: "INSUFFICIENT_CARDS",
        requested: 5,
      });
    });

    it("takes the most hands an array can hold as a count, not a bad one", () => {
      expect(thrownBy(() => deal(hand, 2 ** 32 - 1, 1))).toMatchObject({
        code: "INSUFFICIENT_CARDS",
        requested: 2 ** 32 - 1,
      });
    });
  });

  describe("with bad arguments", () => {
    const badCounts = [
      ["0", 0],
      ["-0", -0],
      ["a negative number", -1],
      ["a fraction", 1.5],
      ["NaN", NaN],
      ["Infinity", Infinity],
      ["-Infinity", -Infinity],
      ["a numeric string", "2"],
      ["null", null],
      ["a bigint", 2n],
      ["an array", [2]],
      ["an object", {}],
    ] as const;

    it.each(badCounts)(
      "rejects %s as the hand count, even with too few cards",
      (_label, value) => {
        for (const deck of [hand, []]) {
          expect(thrownBy(() => deal(deck, value as number, 1))).toMatchObject({
            code: "INVALID_ARGUMENT",
          });
        }
      },
    );

    it.each(badCounts)(
      "rejects %s as the hand size, even with too few cards",
      (_label, value) => {
        for (const deck of [hand, []]) {
          expect(
            thrownBy(() => deal(deck, 1, value as HandSize)),
          ).toMatchObject({ code: "INVALID_ARGUMENT" });
        }
      },
    );

    it.each(badCounts)(
      "rejects %s as the packet size, even with too few cards",
      (_label, value) => {
        for (const deck of [hand, []]) {
          expect(
            thrownBy(() =>
              deal(deck, 1, 1, asDealOptions({ packetSize: value })),
            ),
          ).toMatchObject({ code: "INVALID_ARGUMENT" });
        }
      },
    );

    it("rejects more hands than an array can hold", () => {
      expect(thrownBy(() => deal(hand, 2 ** 32, 1))).toMatchObject({
        code: "INVALID_ARGUMENT",
      });
    });

    it("rejects each named value in the other's place", () => {
      expect(
        thrownBy(() => deal(hand, 1, PacketSize.HAND as HandSize)),
      ).toMatchObject({ code: "INVALID_ARGUMENT" });
      expect(
        thrownBy(() =>
          deal(hand, 1, 1, asDealOptions({ packetSize: HandSize.MAXIMIZE })),
        ),
      ).toMatchObject({ code: "INVALID_ARGUMENT" });
    });

    it.each([
      ["RESHUFFLE, which isn't a setting yet", "reshuffle"],
      ["a constant's key rather than its value", "THROW"],
      ["null", null],
      ["a number", 1],
      ["an object", {}],
    ])("rejects %s as runOut, even with too few cards", (_label, runOut) => {
      for (const deck of [hand, []]) {
        expect(
          thrownBy(() => deal(deck, 1, 1, asDealOptions({ runOut }))),
        ).toMatchObject({ code: "INVALID_ARGUMENT" });
      }
    });

    it.each([
      ["null", null],
      ["a number", 42],
      ["a string", "packets"],
      ["a random source", seededRandom(42)],
    ])("rejects %s in place of the options object", (_label, options) => {
      expect(
        thrownBy(() => deal(hand, 1, 1, asDealOptions(options))),
      ).toMatchObject({ code: "INVALID_ARGUMENT" });
    });

    it.each(nonArrays())("rejects %s as the deck", (_label, deck) => {
      expect(thrownBy(() => deal(asStack(deck), 1, 1))).toMatchObject({
        code: "INVALID_ARGUMENT",
      });
    });
  });
});
