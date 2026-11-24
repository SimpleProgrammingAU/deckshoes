import fc, { type Arbitrary } from "fast-check";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  arraySubclasses,
  asShoe,
  asStack,
  countingReads,
  deals,
  holes,
  isPlainFrozen,
  nonArrays,
  sameValues,
  seeds,
  shoes,
  stacks,
  tally,
  thrownBy,
} from "../test/helpers.ts";
import { type Card, card } from "./card.ts";
import { chain } from "./chain.ts";
import { formatShoe, parseShoe } from "./compact.ts";
import { deal, HandSize, RunOut } from "./deal.ts";
import { draw } from "./draw.ts";
import { isDeckshoesError } from "./errors.ts";
import { shoeFromJSON } from "./json.ts";
import { pinochle } from "./presets/pinochle.ts";
import { standard52 } from "./presets/standard52.ts";
import { seededRandom } from "./random.ts";
import {
  burn,
  dealFromShoe,
  discard,
  drawFromShoe,
  reshuffle,
  type Shoe,
  shoe,
  type ShoeOptions,
} from "./shoe.ts";
import { shuffle } from "./shuffle.ts";

const ACE = card("A", "S");
const KING = card("K", "H");
const TEN = card("10", "D");

/** Lets a test pass options that aren't `ShoeOptions`, as untyped callers can. */
function asShoeOptions(value: unknown): ShoeOptions {
  return value as ShoeOptions;
}

/** The copies of a deck one on top of another, as a shoe holds them before its shuffle. */
function stackedCopies<C>(deck: readonly C[], deckCount: number): C[] {
  return Array.from({ length: deckCount }, () => deck).flat();
}

/** Six decks, 312 cards, with 100 of them burned onto the discard pile. */
function sixDecksPartBurned(): Shoe {
  return burn(shoe(standard52(), 6, { random: seededRandom(3) }), 100);
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

  it("isn't a stack, so chain rejects it", () => {
    const built = shoe(standard52(), 2, { random: seededRandom(1) });
    expect(thrownBy(() => chain(asStack(built)))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
    expect(chain(built.cards).value()).toBe(built.cards);
  });
});

describe.each<readonly [name: string, build: (options?: ShoeOptions) => Shoe]>([
  ["shoe", (options) => shoe(standard52(), 6, options)],
  ["reshuffle", (options) => reshuffle(sixDecksPartBurned(), options)],
])("%s, given options for 312 cards,", (_name, build) => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses a penetration of 0.75 when it's left out or undefined", () => {
    for (const penetration of [{}, { penetration: undefined }]) {
      const options = { ...penetration, random: seededRandom(1) };
      expect(build(options).cutCard).toBe(234);
    }
  });

  it("puts the cut card on top at 0, and at the bottom at 1", () => {
    const random = seededRandom(1);
    expect(build({ penetration: 0, random }).cutCard).toBe(0);
    expect(build({ penetration: 1, random }).cutCard).toBe(312);
  });

  it("puts the cut card at 0, not -0, for a penetration of -0", () => {
    const { cutCard } = build({ penetration: -0, random: seededRandom(1) });
    expect(Object.is(cutCard, 0)).toBe(true);
  });

  it("shuffles with a secure source when the options are left out", () => {
    const spy = vi.spyOn(crypto, "getRandomValues");
    const built = build();
    expect(spy).toHaveBeenCalled();
    expect(built.cutCard).toBe(234);
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
    build(options);
    expect(reads).toStrictEqual({ penetration: 1, random: 1 });
  });

  it.each([
    ["null", null],
    ["a number", 0.75],
    ["a string", "0.75"],
    ["an array", [0.75]],
  ])("rejects %s as the options", (_label, options) => {
    expect(thrownBy(() => build(asShoeOptions(options)))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
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
    expect(thrownBy(() => build(asShoeOptions({ penetration })))).toMatchObject(
      { code: "INVALID_ARGUMENT" },
    );
  });

  it.each([
    ["a number", 42],
    ["a string", "seeded"],
    ["null", null],
  ])("rejects %s as the random source", (_label, random) => {
    expect(thrownBy(() => build(asShoeOptions({ random })))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });

  it("rejects a random source that returns something other than a number from 0 up to 1", () => {
    expect(thrownBy(() => build({ random: () => 1 }))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
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
    expect(isPlainFrozen(result.shoe.discardPile)).toBe(true);
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
    expect(isPlainFrozen(result.shoe.discardPile)).toBe(true);
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

describe("burn", () => {
  it("moves what draw would draw to the top of the discard pile, and the cut card up by as many, stopping at 0", () => {
    fc.assert(
      fc.property(
        shoes().chain((original) =>
          fc.record({
            count: fc.nat({ max: original.cards.length }),
            original: fc.constant(original),
          }),
        ),
        ({ count, original }) => {
          const burned = burn(original, count);
          const expected = draw(original.cards, count);
          expect(sameValues(burned.cards, expected.remainder)).toBe(true);
          expect(
            sameValues(burned.discardPile, [
              ...expected.cards,
              ...original.discardPile,
            ]),
          ).toBe(true);
          expect(burned.cutCard).toBe(Math.max(0, original.cutCard - count));
        },
      ),
    );
  });

  it("burns one card when the count is left out or undefined", () => {
    const threeCards = { cards: [ACE, KING, TEN], cutCard: 2, discardPile: [] };
    expect(burn(threeCards)).toStrictEqual(burn(threeCards, 1));
    expect(burn(threeCards, undefined)).toStrictEqual(burn(threeCards, 1));
    expect(burn(threeCards)).toStrictEqual({
      cards: [KING, TEN],
      cutCard: 1,
      discardPile: [ACE],
    });
  });

  it("counts -0 as 0", () => {
    const threeCards = { cards: [ACE, KING, TEN], cutCard: 2, discardPile: [] };
    expect(burn(threeCards, -0)).toStrictEqual(burn(threeCards, 0));
  });

  it("puts the burned cards on the pile in the order they had in the shoe", () => {
    const burned = burn(
      { cards: [ACE, KING, TEN], cutCard: 3, discardPile: [TEN] },
      2,
    );
    expect(burned.discardPile).toStrictEqual([ACE, KING, TEN]);
  });

  it("burns past the cut card, keeping it at 0", () => {
    const reached = burn(
      { cards: [ACE, KING, TEN], cutCard: 1, discardPile: [] },
      2,
    );
    expect(reached.cutCard).toBe(0);
    expect(burn(reached)).toStrictEqual({
      cards: [],
      cutCard: 0,
      discardPile: [TEN, ACE, KING],
    });
  });

  it("returns a frozen shoe holding plain frozen stacks", () => {
    const burned = burn(
      { cards: [ACE, KING, TEN], cutCard: 2, discardPile: [] },
      2,
    );
    expect(Object.isFrozen(burned)).toBe(true);
    expect(Object.getPrototypeOf(burned)).toBe(Object.prototype);
    expect(isPlainFrozen(burned.cards)).toBe(true);
    expect(isPlainFrozen(burned.discardPile)).toBe(true);
  });

  it("throws with both counts when asked to burn more cards than the shoe holds", () => {
    fc.assert(
      fc.property(
        shoes(),
        fc.integer({ max: 1000, min: 1 }),
        (original, extra) => {
          const count = original.cards.length + extra;
          expect(thrownBy(() => burn(original, count))).toMatchObject({
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
        burn(
          { cards: [ACE, KING], cutCard: 1, discardPile: [] },
          count as number,
        ),
      ),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
  });
});

describe("discard", () => {
  it("puts the cards on top of the discard pile, leaving the shoe's cards and cut card alone", () => {
    fc.assert(
      fc.property(shoes(), stacks(), (original, cards) => {
        const played = discard(original, cards);
        expect(sameValues(played.cards, original.cards)).toBe(true);
        expect(played.cutCard).toBe(original.cutCard);
        expect(
          sameValues(played.discardPile, [...cards, ...original.discardPile]),
        ).toBe(true);
      }),
    );
  });

  it("puts the cards on the pile in the order given", () => {
    const played = discard({ cards: [ACE], cutCard: 1, discardPile: [TEN] }, [
      KING,
      ACE,
    ]);
    expect(played).toStrictEqual({
      cards: [ACE],
      cutCard: 1,
      discardPile: [KING, ACE, TEN],
    });
  });

  it("gives a new shoe holding the same cards when there's nothing to discard", () => {
    const original = { cards: [ACE, KING], cutCard: 1, discardPile: [TEN] };
    const played = discard(original, []);
    expect(played).toStrictEqual(original);
    expect(played).not.toBe(original);
  });

  it("returns a frozen shoe holding plain frozen stacks", () => {
    const played = discard({ cards: [ACE], cutCard: 0, discardPile: [] }, [
      KING,
    ]);
    expect(Object.isFrozen(played)).toBe(true);
    expect(Object.getPrototypeOf(played)).toBe(Object.prototype);
    expect(isPlainFrozen(played.cards)).toBe(true);
    expect(isPlainFrozen(played.discardPile)).toBe(true);
  });

  it("leaves the cards unchanged, frozen or not", () => {
    fc.assert(
      fc.property(stacks(), fc.boolean(), (original, frozen) => {
        const cards = frozen ? Object.freeze([...original]) : [...original];
        discard({ cards: [ACE], cutCard: 0, discardPile: [] }, cards);
        expect(sameValues(cards, original)).toBe(true);
        expect(Object.isFrozen(cards)).toBe(frozen);
      }),
    );
  });

  it("reads the length and each of the cards once", () => {
    const { reads, stack } = countingReads([ACE, KING, TEN]);
    discard({ cards: [], cutCard: 0, discardPile: [] }, stack);
    expect(reads).toStrictEqual({ length: 1, positions: [1, 1, 1] });
  });

  it.each(arraySubclasses())(
    "reads the cards of %s by index",
    (_label, make) => {
      const played = discard(
        { cards: [], cutCard: 0, discardPile: [TEN] },
        make([ACE, KING]),
      );
      expect(played.discardPile).toStrictEqual([ACE, KING, TEN]);
      expect(isPlainFrozen(played.discardPile)).toBe(true);
    },
  );

  it("names which cards are wrong: the shoe's or the ones discarded", () => {
    expect(
      thrownBy(() =>
        discard(asShoe({ cards: "AS", cutCard: 0, discardPile: [] }), [ACE]),
      ),
    ).toMatchObject({
      message: expect.stringMatching(/^Invalid shoe cards /) as unknown,
    });
    expect(
      thrownBy(() =>
        discard({ cards: [ACE], cutCard: 0, discardPile: [] }, asStack("AS")),
      ),
    ).toMatchObject({
      message: expect.stringMatching(/^Invalid cards /) as unknown,
    });
  });

  it.each(nonArrays())("rejects %s as the cards", (_label, cards) => {
    expect(
      thrownBy(() =>
        discard({ cards: [ACE], cutCard: 0, discardPile: [] }, asStack(cards)),
      ),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it("rejects cards that would make a discard pile longer than an array can be, with a deckshoes error", () => {
    const thrown = thrownBy(() =>
      discard(
        { cards: [], cutCard: 0, discardPile: [ACE] },
        holes(2 ** 32 - 1),
      ),
    );
    expect(isDeckshoesError(thrown, "INVALID_ARGUMENT")).toBe(true);
  });

  it("counts the shoe's cards as well as its discard pile against the limit", () => {
    expect(
      thrownBy(() =>
        discard(
          { cards: [ACE], cutCard: 0, discardPile: [] },
          holes(2 ** 32 - 1),
        ),
      ),
    ).toMatchObject({
      message:
        "Invalid cards (array): a shoe of 1 card and a discard pile of 0 cards, with 4294967295 discarded, would hold more cards than an array can",
    });
  });
});

describe("reshuffle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shuffles the shoe's cards stacked on top of its discard pile, as shuffle does", () => {
    fc.assert(
      fc.property(shoes(), seeds, (original, seed) => {
        const next = reshuffle(original, { random: seededRandom(seed) });
        const shuffled = shuffle([...original.cards, ...original.discardPile], {
          random: seededRandom(seed),
        });
        expect(sameValues(next.cards, shuffled)).toBe(true);
        expect(next.discardPile).toStrictEqual([]);
      }),
    );
  });

  it("puts the cut card back in at the penetration of every card it takes in", () => {
    fc.assert(
      fc.property(
        shoes(),
        fc.double({ max: 1, min: 0, noNaN: true }),
        (original, penetration) => {
          const { cutCard } = reshuffle(original, {
            penetration,
            random: seededRandom(1),
          });
          const size = original.cards.length + original.discardPile.length;
          expect(cutCard).toBe(Math.round(penetration * size) || 0);
          expect(Object.is(cutCard, -0)).toBe(false);
        },
      ),
    );
  });

  it("takes in every card in the shoe and on its pile, once the round's hands are discarded", () => {
    const start = shoe(standard52(), 2, { random: seededRandom(5) });
    const { hands, shoe: dealt } = dealFromShoe(start, 4, 5);
    const next = reshuffle(burn(discard(dealt, hands.flat())), {
      random: seededRandom(6),
    });
    expect(tally(next.cards)).toStrictEqual(tally(start.cards));
    expect(next.cutCard).toBe(78);
  });

  it("reshuffles an empty shoe into an empty shoe, with its cut card reached", () => {
    expect(reshuffle({ cards: [], cutCard: 0, discardPile: [] })).toStrictEqual(
      {
        cards: [],
        cutCard: 0,
        discardPile: [],
      },
    );
  });

  it("returns a frozen shoe holding plain frozen stacks", () => {
    const next = reshuffle(sixDecksPartBurned(), { random: seededRandom(1) });
    expect(Object.isFrozen(next)).toBe(true);
    expect(Object.getPrototypeOf(next)).toBe(Object.prototype);
    expect(isPlainFrozen(next.cards)).toBe(true);
    expect(isPlainFrozen(next.discardPile)).toBe(true);
  });

  it("gives the same reshuffle for the same seed, and a different one as a seeded source moves on", () => {
    const partBurned = sixDecksPartBurned();
    const once = reshuffle(partBurned, { random: seededRandom(42) });
    expect(reshuffle(partBurned, { random: seededRandom(42) })).toStrictEqual(
      once,
    );
    const random = seededRandom(42);
    const first = reshuffle(partBurned, { random });
    const second = reshuffle(partBurned, { random });
    expect(first).toStrictEqual(once);
    expect(sameValues(second.cards, first.cards)).toBe(false);
  });

  it("takes a shoe whose discard pile is left out, reshuffling only its cards", () => {
    const next = reshuffle(asShoe({ cards: [ACE, KING, TEN], cutCard: 0 }), {
      random: seededRandom(1),
    });
    expect(tally(next.cards)).toStrictEqual(tally([ACE, KING, TEN]));
    expect(next.cutCard).toBe(2);
  });
});

describe.each<readonly [name: string, use: (from: Shoe) => Shoe]>([
  ["drawFromShoe", (from) => drawFromShoe(from, 1).shoe],
  ["dealFromShoe", (from) => dealFromShoe(from, 1, 1).shoe],
  ["burn", (from) => burn(from, 1)],
  ["discard", (from) => discard(from, [ACE])],
  ["reshuffle", (from) => reshuffle(from, { random: seededRandom(1) })],
  ["shoeFromJSON", (from) => shoeFromJSON(from)],
  ["formatShoe, read back by parseShoe", (from) => parseShoe(formatShoe(from))],
])("%s", (_name, use) => {
  it("takes a shoe written by hand, whose stacks are array subclasses", () => {
    const expected = use({
      cards: [ACE, KING],
      cutCard: 1,
      discardPile: [TEN],
    });
    for (const [, make] of arraySubclasses()) {
      const result = use({
        cards: make([ACE, KING]),
        cutCard: 1,
        discardPile: make([TEN]),
      });
      expect(result).toStrictEqual(expected);
      expect(isPlainFrozen(result.cards)).toBe(true);
      expect(isPlainFrozen(result.discardPile)).toBe(true);
    }
  });

  it("rejects a shoe holding more cards than an array can, before copying either stack", () => {
    expect(
      thrownBy(() =>
        use({ cards: holes(2 ** 31), cutCard: 0, discardPile: holes(2 ** 31) }),
      ),
    ).toMatchObject({
      code: "INVALID_ARGUMENT",
      message:
        "Invalid shoe (object): a shoe of 2147483648 cards and a discard pile of 2147483648 cards would hold more cards than an array can",
    });
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
    use(fromGetters);
    expect(reads).toStrictEqual({ cards: 1, cutCard: 1, discardPile: 1 });
  });

  it("reads the length and each card of the shoe's cards once", () => {
    const { reads, stack } = countingReads([ACE, KING, TEN]);
    use({ cards: stack, cutCard: 1, discardPile: [] });
    expect(reads).toStrictEqual({ length: 1, positions: [1, 1, 1] });
  });

  it("reads the length and each card of the discard pile once", () => {
    const { reads, stack } = countingReads([ACE, KING, TEN]);
    use({ cards: [ACE, KING], cutCard: 1, discardPile: stack });
    expect(reads).toStrictEqual({ length: 1, positions: [1, 1, 1] });
  });

  it("never gives a cut card of -0, even for a shoe whose cut card is -0", () => {
    const { cutCard } = use({
      cards: [ACE, KING],
      cutCard: -0,
      discardPile: [],
    });
    expect(Object.is(cutCard, -0)).toBe(false);
  });

  it("reads a discard pile that's left out or undefined as an empty one", () => {
    const expected = use({ cards: [ACE, KING], cutCard: 1, discardPile: [] });
    const leftOut = use(asShoe({ cards: [ACE, KING], cutCard: 1 }));
    expect(leftOut).toStrictEqual(expected);
    expect(isPlainFrozen(leftOut.discardPile)).toBe(true);
    expect(
      use(asShoe({ cards: [ACE, KING], cutCard: 1, discardPile: undefined })),
    ).toStrictEqual(expected);
  });

  it("leaves the shoe's stacks unchanged", () => {
    const cards = [ACE, KING];
    const discardPile = [TEN];
    use({ cards, cutCard: 1, discardPile });
    expect(cards).toStrictEqual([ACE, KING]);
    expect(discardPile).toStrictEqual([TEN]);
    expect(Object.isFrozen(cards) || Object.isFrozen(discardPile)).toBe(false);
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
    expect(thrownBy(() => use(asShoe(value)))).toMatchObject({
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

describe("a shoe in play", () => {
  /** One step of play: taking cards out, discarding cards taken, or reshuffling. */
  type Step =
    | { readonly count: number; readonly kind: "burn" | "discard" | "draw" }
    | {
        readonly handCount: number;
        readonly handSize: number;
        readonly kind: "deal";
      }
    | { readonly kind: "reshuffle" };

  const steps: Arbitrary<Step[]> = fc.array(
    fc.oneof(
      fc.record({
        count: fc.nat({ max: 6 }),
        kind: fc.constantFrom(
          "burn" as const,
          "discard" as const,
          "draw" as const,
        ),
      }),
      fc.record({
        handCount: fc.integer({ max: 4, min: 1 }),
        handSize: fc.integer({ max: 3, min: 1 }),
        kind: fc.constant("deal" as const),
      }),
      fc.constant({ kind: "reshuffle" as const }),
    ),
    { maxLength: 40 },
  );

  it("loses and gains no card across draws, deals, burns, discards and reshuffles", () => {
    fc.assert(
      fc.property(
        stacks(),
        fc.integer({ max: 4, min: 1 }),
        seeds,
        steps,
        (deck, deckCount, seed, play) => {
          const random = seededRandom(seed);
          const start = shoe(deck, deckCount, { random });
          let current = start;
          // The cards taken out and not yet discarded, as players hold them.
          const held: Card[] = [];
          for (const step of play) {
            const before = current;
            let taken = 0;
            switch (step.kind) {
              case "draw": {
                const result = drawFromShoe(
                  current,
                  Math.min(step.count, current.cards.length),
                );
                held.push(...result.cards);
                taken = result.cards.length;
                current = result.shoe;
                break;
              }
              case "deal": {
                const result = dealFromShoe(
                  current,
                  step.handCount,
                  step.handSize,
                  { runOut: RunOut.STOP },
                );
                for (const hand of result.hands) held.push(...hand);
                taken = before.cards.length - result.shoe.cards.length;
                current = result.shoe;
                break;
              }
              case "burn": {
                taken = Math.min(step.count, current.cards.length);
                current = burn(current, taken);
                break;
              }
              case "discard": {
                current = discard(current, held.splice(0, step.count));
                break;
              }
              case "reshuffle": {
                current = reshuffle(current, { random });
                break;
              }
            }

            expect(
              tally([...current.cards, ...current.discardPile, ...held]),
            ).toStrictEqual(tally(start.cards));
            expect(current.cutCard).toBe(
              step.kind === "reshuffle"
                ? Math.round(0.75 * current.cards.length) || 0
                : Math.max(0, before.cutCard - taken),
            );
          }
        },
      ),
    );
  });
});
