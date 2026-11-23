import fc, { type Arbitrary } from "fast-check";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  arraySubclasses,
  asStack,
  deals,
  isPlainFrozen,
  nonArrays,
  sameValues,
  seeds,
  stacks,
  stacksWithCounts,
  tally,
  thrownBy,
} from "../test/helpers.ts";
import { type Card, card } from "./card.ts";
import { chain } from "./chain.ts";
import { deal, HandSize, RunOut } from "./deal.ts";
import { draw } from "./draw.ts";
import { pinochle } from "./presets/pinochle.ts";
import { standard52 } from "./presets/standard52.ts";
import { seededRandom } from "./random.ts";
import {
  dealFromShoe,
  drawFromShoe,
  type Shoe,
  shoe,
  type ShoeOptions,
} from "./shoe.ts";
import { shuffle } from "./shuffle.ts";

const ACE = card("A", "S");
const KING = card("K", "H");
const TEN = card("10", "D");

/** Lets a test pass a value that isn't a shoe, as untyped callers can. */
function asShoe(value: unknown): Shoe {
  return value as Shoe;
}

/** Lets a test pass options that aren't `ShoeOptions`, as untyped callers can. */
function asShoeOptions(value: unknown): ShoeOptions {
  return value as ShoeOptions;
}

/** The copies of a deck one on top of another, as a shoe holds them before its shuffle. */
function stackedCopies<C>(deck: readonly C[], deckCount: number): C[] {
  return Array.from({ length: deckCount }, () => deck).flat();
}

/** Wraps a stack in a Proxy that counts the reads of its length and of each of its positions. */
function countingReads<C>(stack: readonly C[]): {
  reads: { length: number; positions: number[] };
  stack: readonly C[];
} {
  const reads = { length: 0, positions: stack.map(() => 0) };
  const proxy = new Proxy(stack, {
    get(target, key, receiver) {
      if (key === "length") reads.length += 1;
      if (typeof key === "string" && /^\d+$/.test(key)) {
        const position = Number(key);
        reads.positions[position] = (reads.positions[position] ?? 0) + 1;
      }
      return Reflect.get(target, key, receiver) as unknown;
    },
  });
  return { reads, stack: proxy };
}

/** Shoes of standard cards with the cut card anywhere in them, top to bottom, and any discard pile. */
function shoes(): Arbitrary<Shoe> {
  return fc
    .tuple(stacksWithCounts(), stacks())
    .map(([{ count, stack }, discardPile]) => ({
      cards: stack,
      cutCard: count,
      discardPile,
    }));
}

describe("shoe", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("holds deckCount copies of every card in the deck", () => {
    fc.assert(
      fc.property(
        stacks(),
        fc.integer({ max: 8, min: 1 }),
        seeds,
        (deck, deckCount, seed) => {
          const { cards } = shoe(deck, deckCount, {
            random: seededRandom(seed),
          });
          expect(cards).toHaveLength(deck.length * deckCount);
          const inShoe = tally(cards);
          for (const [each, copies] of tally(deck)) {
            expect(inShoe.get(each)).toBe(copies * deckCount);
          }
          expect(inShoe.size).toBe(tally(deck).size);
        },
      ),
    );
  });

  it("shuffles the copies stacked one on top of another, as shuffle does", () => {
    fc.assert(
      fc.property(
        fc.array(fc.anything(), { maxLength: 40 }),
        fc.integer({ max: 8, min: 1 }),
        seeds,
        (deck, deckCount, seed) => {
          const built = shoe(deck, deckCount, { random: seededRandom(seed) });
          const shuffled = shuffle(stackedCopies(deck, deckCount), {
            random: seededRandom(seed),
          });
          expect(sameValues(built.cards, shuffled)).toBe(true);
        },
      ),
    );
  });

  it("puts the cut card at the penetration, rounded to the nearest card", () => {
    fc.assert(
      fc.property(
        stacks(),
        fc.integer({ max: 8, min: 1 }),
        fc.double({ max: 1, min: 0, noNaN: true }),
        (deck, deckCount, penetration) => {
          const { cutCard } = shoe(deck, deckCount, {
            penetration,
            random: seededRandom(1),
          });
          const size = deck.length * deckCount;
          expect(cutCard).toBe(Math.round(penetration * size) || 0);
          expect(Object.is(cutCard, -0)).toBe(false);
        },
      ),
    );
  });

  it("uses a penetration of 0.75 when it's left out or undefined", () => {
    for (const penetration of [{}, { penetration: undefined }]) {
      const options = { ...penetration, random: seededRandom(1) };
      expect(shoe(standard52(), 6, options).cutCard).toBe(234);
    }
  });

  it("puts the cut card on top at 0, and at the bottom at 1", () => {
    const random = seededRandom(1);
    expect(shoe(standard52(), 2, { penetration: 0, random }).cutCard).toBe(0);
    expect(shoe(standard52(), 2, { penetration: 1, random }).cutCard).toBe(104);
  });

  it("puts the cut card at 0, not -0, for a penetration of -0", () => {
    const { cutCard } = shoe(standard52(), 2, {
      penetration: -0,
      random: seededRandom(1),
    });
    expect(Object.is(cutCard, 0)).toBe(true);
  });

  it("rounds a penetration that falls between cards to the nearest card", () => {
    const random = seededRandom(1);
    // 0.8 × 52 = 41.6, 0.29 × 100 = 28.999…, 0.5 × 3 = 1.5, and 0.58 × 25 =
    // 14.4999…, because 0.58 is held as a little less than 0.58 (ADR 0013).
    expect(shoe(standard52(), 1, { penetration: 0.8, random }).cutCard).toBe(
      42,
    );
    const hundred = Array.from({ length: 100 }, () => ACE);
    expect(shoe(hundred, 1, { penetration: 0.29, random }).cutCard).toBe(29);
    expect(
      shoe([ACE, KING, TEN], 1, { penetration: 0.5, random }).cutCard,
    ).toBe(2);
    const twentyFive = Array.from({ length: 25 }, () => ACE);
    expect(shoe(twentyFive, 1, { penetration: 0.58, random }).cutCard).toBe(14);
  });

  it("gives the same six-deck shoe for the same seed", () => {
    const sixDecks = shoe(standard52(), 6, { random: seededRandom(42) });
    expect(sixDecks.cards).toHaveLength(312);
    expect(sixDecks.cutCard).toBe(234);
    expect(sixDecks.cards.slice(0, 3)).toStrictEqual([
      card("Q", "S"),
      card("7", "D"),
      card("8", "D"),
    ]);
    expect(shoe(standard52(), 6, { random: seededRandom(42) })).toStrictEqual(
      sixDecks,
    );
  });

  it("builds a shoe from one deck", () => {
    const oneDeck = shoe(standard52(), 1, { random: seededRandom(1) });
    expect(oneDeck.cards).toHaveLength(52);
    expect(oneDeck.cutCard).toBe(39);
  });

  it("builds an empty shoe from an empty deck, with its cut card reached", () => {
    expect(shoe([], 6)).toStrictEqual({
      cards: [],
      cutCard: 0,
      discardPile: [],
    });
  });

  it("builds an empty shoe from an empty deck however many copies it takes", () => {
    expect(shoe([], 2 ** 40)).toStrictEqual({
      cards: [],
      cutCard: 0,
      discardPile: [],
    });
  });

  it("builds a shoe from a deck with copies of its own", () => {
    const twoPinochleDecks = shoe(pinochle(), 2, { random: seededRandom(1) });
    expect(twoPinochleDecks.cards).toHaveLength(96);
    expect(tally(twoPinochleDecks.cards).get(ACE)).toBe(4);
  });

  it("starts with an empty discard pile", () => {
    fc.assert(
      fc.property(
        stacks(),
        fc.integer({ max: 4, min: 1 }),
        (deck, deckCount) => {
          const built = shoe(deck, deckCount, { random: seededRandom(1) });
          expect(built.discardPile).toStrictEqual([]);
        },
      ),
    );
  });

  it("returns a frozen plain object holding plain frozen stacks", () => {
    const built = shoe(standard52(), 2, { random: seededRandom(1) });
    expect(Object.isFrozen(built)).toBe(true);
    expect(Object.getPrototypeOf(built)).toBe(Object.prototype);
    expect(isPlainFrozen(built.cards)).toBe(true);
    expect(isPlainFrozen(built.discardPile)).toBe(true);
    expect(isPlainFrozen(shoe([], 1).cards)).toBe(true);
  });

  it("leaves the deck unchanged, frozen or not", () => {
    fc.assert(
      fc.property(stacks(), fc.boolean(), (original, frozen) => {
        const deck = frozen ? Object.freeze([...original]) : [...original];
        shoe(deck, 2, { random: seededRandom(1) });
        expect(sameValues(deck, original)).toBe(true);
        expect(Object.isFrozen(deck)).toBe(frozen);
      }),
    );
  });

  it.each(arraySubclasses())(
    "reads the cards of %s by index",
    (_label, make) => {
      const deck = [ACE, KING, TEN];
      const fromSubclass = shoe(make(deck), 2, { random: seededRandom(7) });
      expect(fromSubclass).toStrictEqual(
        shoe(deck, 2, { random: seededRandom(7) }),
      );
      expect(isPlainFrozen(fromSubclass.cards)).toBe(true);
    },
  );

  it("shuffles with a secure source, and uses the default penetration, when the options are left out", () => {
    const spy = vi.spyOn(crypto, "getRandomValues");
    const built = shoe(standard52(), 2);
    expect(spy).toHaveBeenCalledOnce();
    expect(sameValues(built.cards, stackedCopies(standard52(), 2))).toBe(false);
    expect(tally(built.cards)).toStrictEqual(
      tally(stackedCopies(standard52(), 2)),
    );
    expect(built.cutCard).toBe(78);
  });

  it("reads each card of the deck once, however many copies it makes", () => {
    const { reads, stack } = countingReads([ACE, KING, TEN]);
    shoe(stack, 4, { random: seededRandom(1) });
    expect(reads).toStrictEqual({ length: 1, positions: [1, 1, 1] });
  });

  it("makes its copies of the deck from one read of each card", () => {
    let calls = 0;
    const changing = new Proxy([ACE, KING], {
      get(target, key, receiver) {
        if (key === "0") {
          calls += 1;
          return calls === 1 ? ACE : TEN;
        }
        return Reflect.get(target, key, receiver) as unknown;
      },
    });
    const built = shoe(changing, 4, { random: seededRandom(1) });
    expect(tally(built.cards)).toStrictEqual(
      tally(stackedCopies([ACE, KING], 4)),
    );
  });

  it("reads each option once", () => {
    const reads = { penetration: 0, random: 0 };
    const options = {
      get penetration() {
        reads.penetration++;
        return 0.5;
      },
      get random() {
        reads.random++;
        return seededRandom(1);
      },
    };
    shoe(standard52(), 2, options);
    expect(reads).toStrictEqual({ penetration: 1, random: 1 });
  });

  it.each(nonArrays())("rejects %s as the deck", (_label, deck) => {
    expect(thrownBy(() => shoe(asStack(deck), 2))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });

  it.each([
    ["0", 0],
    ["a negative number", -1],
    ["a fraction", 1.5],
    ["NaN", NaN],
    ["Infinity", Infinity],
    ["a numeric string", "2"],
    ["undefined", undefined],
    ["null", null],
    ["a bigint", 2n],
  ])(
    "rejects %s as the deck count, even for an empty deck",
    (_label, count) => {
      for (const deck of [standard52(), []]) {
        expect(thrownBy(() => shoe(deck, count as number))).toMatchObject({
          code: "INVALID_ARGUMENT",
        });
      }
    },
  );

  it("rejects a deck count that would hold more cards than an array can", () => {
    expect(thrownBy(() => shoe(standard52(), 2 ** 32))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
    expect(thrownBy(() => shoe([ACE], 2 ** 32))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });

  it("says card for a one-card deck, and cards otherwise, when the deck count is too big", () => {
    expect(thrownBy(() => shoe([ACE], 2 ** 32))).toMatchObject({
      message: expect.stringContaining("decks of 1 card would") as unknown,
    });
    expect(thrownBy(() => shoe(standard52(), 2 ** 32))).toMatchObject({
      message: expect.stringContaining("decks of 52 cards would") as unknown,
    });
  });

  it.each([
    ["null", null],
    ["a number", 0.75],
    ["a string", "0.75"],
    ["an array", [0.75]],
  ])("rejects %s as the options", (_label, options) => {
    expect(
      thrownBy(() => shoe(standard52(), 2, asShoeOptions(options))),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it.each([
    ["a negative number", -0.1],
    ["a number over 1", 1.1],
    ["NaN", NaN],
    ["Infinity", Infinity],
    ["a numeric string", "0.75"],
    ["null", null],
    ["a bigint", 1n],
  ])("rejects %s as the penetration", (_label, penetration) => {
    expect(
      thrownBy(() => shoe(standard52(), 2, asShoeOptions({ penetration }))),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it.each([
    ["a number", 42],
    ["a string", "seeded"],
    ["null", null],
  ])("rejects %s as the random source", (_label, random) => {
    expect(
      thrownBy(() => shoe(standard52(), 2, asShoeOptions({ random }))),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it("rejects a random source that returns something other than a number from 0 up to 1", () => {
    expect(
      thrownBy(() => shoe(standard52(), 2, { random: () => 1 })),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it("isn't a stack, so chain rejects it", () => {
    const built = shoe(standard52(), 2, { random: seededRandom(1) });
    expect(thrownBy(() => chain(asStack(built)))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
    expect(chain(built.cards).value()).toBe(built.cards);
  });
});

describe("drawFromShoe", () => {
  it("draws what draw would, and moves the cut card up by as many, stopping at 0", () => {
    fc.assert(
      fc.property(
        shoes().chain((original) =>
          fc.record({
            count: fc.nat({ max: original.cards.length }),
            original: fc.constant(original),
          }),
        ),
        ({ count, original }) => {
          const result = drawFromShoe(original, count);
          const expected = draw(original.cards, count);
          expect(sameValues(result.cards, expected.cards)).toBe(true);
          expect(sameValues(result.shoe.cards, expected.remainder)).toBe(true);
          expect(result.shoe.cutCard).toBe(
            Math.max(0, original.cutCard - count),
          );
          expect(
            sameValues(result.shoe.discardPile, original.discardPile),
          ).toBe(true);
        },
      ),
    );
  });

  it("draws one card when the count is left out or undefined", () => {
    const threeCards = { cards: [ACE, KING, TEN], cutCard: 2, discardPile: [] };
    expect(drawFromShoe(threeCards)).toStrictEqual(drawFromShoe(threeCards, 1));
    expect(drawFromShoe(threeCards, undefined)).toStrictEqual(
      drawFromShoe(threeCards, 1),
    );
    expect(drawFromShoe(threeCards).cards).toStrictEqual([ACE]);
  });

  it("counts -0 as 0", () => {
    const threeCards = { cards: [ACE, KING, TEN], cutCard: 2, discardPile: [] };
    expect(drawFromShoe(threeCards, -0)).toStrictEqual(
      drawFromShoe(threeCards, 0),
    );
  });

  it("draws past the cut card, keeping it at 0", () => {
    const reached = drawFromShoe(
      { cards: [ACE, KING, TEN], cutCard: 1, discardPile: [] },
      2,
    );
    expect(reached.shoe).toStrictEqual({
      cards: [TEN],
      cutCard: 0,
      discardPile: [],
    });
    expect(drawFromShoe(reached.shoe).shoe).toStrictEqual({
      cards: [],
      cutCard: 0,
      discardPile: [],
    });
  });

  it("returns frozen results holding plain frozen stacks", () => {
    const result = drawFromShoe(
      { cards: [ACE, KING, TEN], cutCard: 2, discardPile: [] },
      2,
    );
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.shoe)).toBe(true);
    expect(isPlainFrozen(result.cards)).toBe(true);
    expect(isPlainFrozen(result.shoe.cards)).toBe(true);
  });

  it("leaves the shoe unchanged", () => {
    const cards = [ACE, KING, TEN];
    const threeCards = { cards, cutCard: 2, discardPile: [] };
    drawFromShoe(threeCards, 2);
    expect(threeCards).toStrictEqual({
      cards: [ACE, KING, TEN],
      cutCard: 2,
      discardPile: [],
    });
    expect(threeCards.cards).toBe(cards);
  });

  it("throws with both counts when asked for more cards than the shoe holds", () => {
    fc.assert(
      fc.property(
        shoes(),
        fc.integer({ max: 1000, min: 1 }),
        (original, extra) => {
          const count = original.cards.length + extra;
          expect(thrownBy(() => drawFromShoe(original, count))).toMatchObject({
            available: original.cards.length,
            code: "INSUFFICIENT_CARDS",
            requested: count,
          });
        },
      ),
    );
  });

  it.each([
    ["a negative number", -1],
    ["a fraction", 1.5],
    ["NaN", NaN],
    ["a numeric string", "2"],
    ["null", null],
  ])("rejects %s as the count", (_label, count) => {
    expect(
      thrownBy(() =>
        drawFromShoe(
          { cards: [ACE, KING], cutCard: 1, discardPile: [] },
          count as number,
        ),
      ),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
  });
});

describe("dealFromShoe", () => {
  it("deals what deal would, and moves the cut card up by the cards dealt, stopping at 0", () => {
    fc.assert(
      fc.property(
        deals().chain((args) =>
          fc.record({
            args: fc.constant(args),
            cutCard: fc.nat({ max: args.deck.length }),
            discardPile: stacks(),
          }),
        ),
        ({
          args: { deck, handCount, handSize, packetSize },
          cutCard,
          discardPile,
        }) => {
          const result = dealFromShoe(
            { cards: deck, cutCard, discardPile },
            handCount,
            handSize,
            { packetSize },
          );
          const expected = deal(deck, handCount, handSize, { packetSize });
          expect(result.hands).toStrictEqual(expected.hands);
          expect(sameValues(result.shoe.cards, expected.remainder)).toBe(true);
          expect(result.shoe.cutCard).toBe(
            Math.max(0, cutCard - handCount * handSize),
          );
          expect(sameValues(result.shoe.discardPile, discardPile)).toBe(true);
        },
      ),
    );
  });

  it("moves the cut card by the cards actually dealt with RunOut.STOP", () => {
    const result = dealFromShoe(
      { cards: [ACE, KING, TEN], cutCard: 3, discardPile: [] },
      2,
      2,
      {
        runOut: RunOut.STOP,
      },
    );
    expect(result.hands).toStrictEqual([[ACE, TEN], [KING]]);
    expect(result.shoe).toStrictEqual({
      cards: [],
      cutCard: 0,
      discardPile: [],
    });
  });

  it("moves the cut card by the cards actually dealt with HandSize.MAXIMIZE", () => {
    const result = dealFromShoe(
      { cards: [ACE, KING, TEN, ACE], cutCard: 2, discardPile: [] },
      3,
      HandSize.MAXIMIZE,
    );
    expect(result.hands.map((hand) => hand.length)).toStrictEqual([2, 1, 1]);
    expect(result.shoe).toStrictEqual({
      cards: [],
      cutCard: 0,
      discardPile: [],
    });
  });

  it("leaves the cut card where it is when nothing is dealt", () => {
    const result = dealFromShoe(
      { cards: [], cutCard: 0, discardPile: [] },
      2,
      1,
      {
        runOut: RunOut.STOP,
      },
    );
    expect(result.hands).toStrictEqual([[], []]);
    expect(result.shoe).toStrictEqual({
      cards: [],
      cutCard: 0,
      discardPile: [],
    });
  });

  it("returns frozen results holding plain frozen stacks", () => {
    const result = dealFromShoe(
      { cards: [ACE, KING, TEN], cutCard: 2, discardPile: [] },
      2,
      1,
    );
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.hands)).toBe(true);
    expect(Object.isFrozen(result.shoe)).toBe(true);
    for (const hand of result.hands) expect(isPlainFrozen(hand)).toBe(true);
    expect(isPlainFrozen(result.shoe.cards)).toBe(true);
  });

  it("leaves the shoe unchanged", () => {
    const cards = [ACE, KING, TEN];
    const threeCards = { cards, cutCard: 2, discardPile: [] };
    dealFromShoe(threeCards, 2, 1);
    expect(threeCards).toStrictEqual({
      cards: [ACE, KING, TEN],
      cutCard: 2,
      discardPile: [],
    });
    expect(threeCards.cards).toBe(cards);
  });

  it("throws what deal throws", () => {
    const threeCards = { cards: [ACE, KING, TEN], cutCard: 2, discardPile: [] };
    expect(thrownBy(() => dealFromShoe(threeCards, 2, 2))).toMatchObject({
      available: 3,
      code: "INSUFFICIENT_CARDS",
      requested: 4,
    });
    expect(thrownBy(() => dealFromShoe(threeCards, 0, 1))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
    expect(
      thrownBy(() => dealFromShoe(threeCards, 1, 1, { packetSize: 0 })),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
  });
});

describe.each<
  readonly [name: string, takeFrom: (from: Shoe) => { shoe: Shoe }]
>([
  ["drawFromShoe", (from) => drawFromShoe(from, 1)],
  ["dealFromShoe", (from) => dealFromShoe(from, 1, 1)],
])("%s", (_name, takeFrom) => {
  it("takes a shoe written by hand, whose cards are an array subclass", () => {
    for (const [, make] of arraySubclasses()) {
      const result = takeFrom({
        cards: make([ACE, KING]),
        cutCard: 1,
        discardPile: [],
      });
      expect(result.shoe).toStrictEqual({
        cards: [KING],
        cutCard: 0,
        discardPile: [],
      });
      expect(isPlainFrozen(result.shoe.cards)).toBe(true);
    }
  });

  it("reads the shoe's cards, cut card and discard pile once each", () => {
    const reads = { cards: 0, cutCard: 0, discardPile: 0 };
    const fromGetters = {
      get cards() {
        reads.cards++;
        return [ACE, KING];
      },
      get cutCard() {
        reads.cutCard++;
        return 1;
      },
      get discardPile() {
        reads.discardPile++;
        return [TEN];
      },
    };
    takeFrom(fromGetters);
    expect(reads).toStrictEqual({ cards: 1, cutCard: 1, discardPile: 1 });
  });

  it("reads the length and each card of the shoe's cards once", () => {
    const { reads, stack } = countingReads([ACE, KING, TEN]);
    takeFrom({ cards: stack, cutCard: 1, discardPile: [] });
    expect(reads).toStrictEqual({ length: 1, positions: [1, 1, 1] });
  });

  it("reads the length and each card of the discard pile once", () => {
    const { reads, stack } = countingReads([ACE, KING, TEN]);
    takeFrom({ cards: [ACE, KING], cutCard: 1, discardPile: stack });
    expect(reads).toStrictEqual({ length: 1, positions: [1, 1, 1] });
  });

  it("keeps the discard pile, as a plain frozen stack", () => {
    for (const [, make] of arraySubclasses()) {
      const pile = make([TEN, ACE]);
      const result = takeFrom({
        cards: [ACE, KING],
        cutCard: 1,
        discardPile: pile,
      });
      expect(result.shoe.discardPile).toStrictEqual([TEN, ACE]);
      expect(isPlainFrozen(result.shoe.discardPile)).toBe(true);
    }
  });

  it("reads a discard pile that's left out or undefined as an empty one", () => {
    const leftOut = takeFrom(asShoe({ cards: [ACE, KING], cutCard: 1 }));
    expect(leftOut.shoe).toStrictEqual({
      cards: [KING],
      cutCard: 0,
      discardPile: [],
    });
    expect(isPlainFrozen(leftOut.shoe.discardPile)).toBe(true);
    const asUndefined = takeFrom(
      asShoe({ cards: [ACE, KING], cutCard: 1, discardPile: undefined }),
    );
    expect(asUndefined.shoe).toStrictEqual(leftOut.shoe);
  });

  it("leaves the discard pile unchanged", () => {
    const discardPile = [TEN];
    takeFrom({ cards: [ACE, KING], cutCard: 1, discardPile });
    expect(discardPile).toStrictEqual([TEN]);
    expect(Object.isFrozen(discardPile)).toBe(false);
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["a string", "AS KH"],
    ["a number", 1],
    ["a stack of cards", [ACE, KING]],
    ["an empty object", {}],
    [
      "cards that aren't an array",
      { cards: "AS KH", cutCard: 0, discardPile: [] },
    ],
    ["cards left out", { cutCard: 0, discardPile: [] }],
    ["a cut card left out", { cards: [ACE, KING] }],
    [
      "a negative cut card",
      { cards: [ACE, KING], cutCard: -1, discardPile: [] },
    ],
    [
      "a cut card below the bottom",
      { cards: [ACE, KING], cutCard: 3, discardPile: [] },
    ],
    [
      "a fractional cut card",
      { cards: [ACE, KING], cutCard: 0.5, discardPile: [] },
    ],
    ["a NaN cut card", { cards: [ACE, KING], cutCard: NaN, discardPile: [] }],
    [
      "a cut card that's a string",
      { cards: [ACE, KING], cutCard: "1", discardPile: [] },
    ],
    [
      "a discard pile that's null",
      { cards: [ACE, KING], cutCard: 1, discardPile: null },
    ],
    [
      "a discard pile that's a string",
      { cards: [ACE, KING], cutCard: 1, discardPile: "10D" },
    ],
    [
      "a discard pile that's an object",
      { cards: [ACE, KING], cutCard: 1, discardPile: {} },
    ],
  ])("rejects %s as the shoe", (_label, value) => {
    expect(thrownBy(() => takeFrom(asShoe(value)))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });
});

describe("drawFromShoe and dealFromShoe together", () => {
  /** One step of play: a draw of up to `count` cards, or a deal that stops when the shoe runs out. */
  type Step =
    | { readonly count: number; readonly kind: "draw" }
    | {
        readonly handCount: number;
        readonly handSize: number;
        readonly kind: "deal";
      };

  const steps: Arbitrary<Step[]> = fc.array(
    fc.oneof(
      fc.record({
        count: fc.nat({ max: 6 }),
        kind: fc.constant("draw" as const),
      }),
      fc.record({
        handCount: fc.integer({ max: 4, min: 1 }),
        handSize: fc.integer({ max: 3, min: 1 }),
        kind: fc.constant("deal" as const),
      }),
    ),
    { maxLength: 40 },
  );

  it("lose and gain no card, and move the cut card up by every card taken", () => {
    fc.assert(
      fc.property(
        stacks(),
        fc.integer({ max: 4, min: 1 }),
        seeds,
        steps,
        (deck, deckCount, seed, play) => {
          const start = shoe(deck, deckCount, { random: seededRandom(seed) });
          let current = start;
          const taken: Card[] = [];
          for (const step of play) {
            if (step.kind === "draw") {
              const result = drawFromShoe(
                current,
                Math.min(step.count, current.cards.length),
              );
              taken.push(...result.cards);
              current = result.shoe;
            } else {
              const result = dealFromShoe(
                current,
                step.handCount,
                step.handSize,
                { packetSize: step.handSize, runOut: RunOut.STOP },
              );
              for (const hand of result.hands) taken.push(...hand);
              current = result.shoe;
            }
          }
          expect(sameValues([...taken, ...current.cards], start.cards)).toBe(
            true,
          );
          expect(current.cutCard).toBe(
            Math.max(0, start.cutCard - taken.length),
          );
        },
      ),
    );
  });
});
