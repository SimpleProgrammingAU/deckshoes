import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  arraySubclasses,
  countingReads,
  isPlainFrozen,
  nonArrays,
  nonRanks,
  nonSuits,
  sameValues,
  shoes,
  stacks,
  standardPairs,
  thrownBy,
} from "../test/helpers.ts";
import { card } from "./card.ts";
import { cardFromJSON, shoeFromJSON, stackFromJSON } from "./json.ts";
import { standard52 } from "./presets/standard52.ts";
import { seededRandom } from "./random.ts";
import { burn, shoe } from "./shoe.ts";

const ACE = card("A", "S");
const KING = card("K", "H");
const TEN = card("10", "D");

/** Saves a value as JSON text and parses it back, as an app that saves a game does. */
function throughJSON(value: unknown): unknown {
  // eslint-disable-next-line unicorn/prefer-structured-clone -- the point is to go through JSON text
  return JSON.parse(JSON.stringify(value));
}

/** Labelled values that aren't a card's JSON, because they aren't objects, or are arrays. */
const NON_OBJECTS: readonly (readonly [label: string, value: unknown])[] = [
  ["undefined", undefined],
  ["null", null],
  ["a card's text", "AS"],
  ["a number", 1],
  ["true", true],
  ["an array of a card's fields", ["A", "S", "black"]],
  ["a function", () => ACE],
];

describe("cardFromJSON", () => {
  it("loads every card back from its JSON, a clone of it, and itself", () => {
    for (const [rank, suit] of standardPairs) {
      const original = card(rank, suit);
      expect(cardFromJSON(throughJSON(original))).toBe(original);
      expect(cardFromJSON(structuredClone(original))).toBe(original);
      expect(cardFromJSON(original)).toBe(original);
    }
  });

  it("loads the JSON that JSON.stringify writes for a card", () => {
    // The saved form is fixed for 1.x (ADR 0014), so it's pinned here.
    expect(JSON.stringify(TEN)).toBe('{"rank":"10","suit":"D","color":"red"}');
    expect(
      cardFromJSON(JSON.parse('{"rank":"10","suit":"D","color":"red"}')),
    ).toBe(TEN);
  });

  it("ignores fields it doesn't know", () => {
    expect(
      cardFromJSON({ color: "black", id: 7, rank: "A", suit: "S", value: 11 }),
    ).toBe(ACE);
  });

  it("reads the rank, suit and colour once each", () => {
    const reads = { color: 0, rank: 0, suit: 0 };
    const fromGetters = {
      get color() {
        reads.color++;
        return "black";
      },
      get rank() {
        reads.rank++;
        return "A";
      },
      get suit() {
        reads.suit++;
        return "S";
      },
    };
    expect(cardFromJSON(fromGetters)).toBe(ACE);
    expect(reads).toStrictEqual({ color: 1, rank: 1, suit: 1 });
  });

  it.each(NON_OBJECTS)("rejects %s", (_label, value) => {
    expect(thrownBy(() => cardFromJSON(value))).toMatchObject({
      code: "INVALID_CARD",
    });
  });

  it.each(nonRanks())("rejects %s as the rank", (_label, rank) => {
    expect(
      thrownBy(() => cardFromJSON({ color: "black", rank, suit: "S" })),
    ).toMatchObject({ code: "INVALID_CARD" });
  });

  it.each(nonSuits())("rejects %s as the suit", (_label, suit) => {
    expect(
      thrownBy(() => cardFromJSON({ color: "black", rank: "A", suit })),
    ).toMatchObject({ code: "INVALID_CARD" });
  });

  it.each([
    ["left out", { rank: "A", suit: "S" }],
    ["undefined", { color: undefined, rank: "A", suit: "S" }],
    ["the other colour", { color: "red", rank: "A", suit: "S" }],
    ["capitalised", { color: "Black", rank: "A", suit: "S" }],
    [
      "a colour that isn't red or black",
      { color: "blue", rank: "A", suit: "S" },
    ],
    [
      "the other colour, for a red suit",
      { color: "black", rank: "Q", suit: "H" },
    ],
  ])("rejects a colour that's %s", (_label, value) => {
    expect(thrownBy(() => cardFromJSON(value))).toMatchObject({
      code: "INVALID_CARD",
    });
  });

  it.each([
    ["an empty object", {}],
    [
      "a wrapper around a card",
      { card: { color: "black", rank: "A", suit: "S" } },
    ],
    ["a shoe", { cards: [], cutCard: 0, discardPile: [] }],
    ["a date", new Date(0)],
  ])("says that %s isn't a card's JSON at all", (_label, value) => {
    expect(thrownBy(() => cardFromJSON(value))).toMatchObject({
      code: "INVALID_CARD",
      message: expect.stringMatching(
        /^Invalid card \(object\): expected an object with rank, suit and color fields/u,
      ) as unknown,
    });
  });

  it("names the colour it expected", () => {
    expect(
      thrownBy(() => cardFromJSON({ color: "red", rank: "A", suit: "S" })),
    ).toMatchObject({
      message: expect.stringMatching(
        /^Invalid colour "red": .*"black".*suit "S"/u,
      ) as unknown,
    });
  });
});

describe("stackFromJSON", () => {
  it("loads any stack back from its JSON, as the very same cards in a new plain frozen array", () => {
    fc.assert(
      fc.property(stacks(), (stack) => {
        const loaded = stackFromJSON(throughJSON(stack));
        expect(sameValues(loaded, stack)).toBe(true);
        expect(isPlainFrozen(loaded)).toBe(true);
      }),
    );
  });

  it("loads any stack back from a clone", () => {
    fc.assert(
      fc.property(stacks(), (stack) => {
        expect(sameValues(stackFromJSON(structuredClone(stack)), stack)).toBe(
          true,
        );
      }),
    );
  });

  it("gives a new stack for a stack of real cards", () => {
    const deck = standard52();
    const loaded = stackFromJSON(deck);
    expect(loaded).not.toBe(deck);
    expect(sameValues(loaded, deck)).toBe(true);
  });

  it("gives a plain frozen array for an array subclass", () => {
    for (const [, make] of arraySubclasses()) {
      const loaded = stackFromJSON(make([ACE, KING, TEN]));
      expect(sameValues(loaded, [ACE, KING, TEN])).toBe(true);
      expect(isPlainFrozen(loaded)).toBe(true);
    }
  });

  it("reads the length and each card once", () => {
    const { reads, stack } = countingReads([ACE, KING, TEN]);
    stackFromJSON(stack);
    expect(reads).toStrictEqual({ length: 1, positions: [1, 1, 1] });
  });

  it.each(nonArrays())("rejects %s as the stack", (_label, value) => {
    expect(thrownBy(() => stackFromJSON(value))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });

  it.each<readonly [label: string, value: unknown]>([
    ...NON_OBJECTS,
    ["a card without its colour", { rank: "A", suit: "S" }],
    ["a card with the wrong colour", { color: "red", rank: "A", suit: "S" }],
    ["T for ten", { color: "red", rank: "T", suit: "D" }],
  ])("rejects a stack holding %s", (_label, value) => {
    expect(thrownBy(() => stackFromJSON([ACE, value, KING]))).toMatchObject({
      code: "INVALID_CARD",
    });
  });

  it("rejects a stack with a hole in it", () => {
    const holed: unknown[] = [ACE];
    holed[2] = KING;
    expect(thrownBy(() => stackFromJSON(holed))).toMatchObject({
      code: "INVALID_CARD",
    });
  });

  it("names the position of the first card it can't load", () => {
    const value = [ACE, { color: "red", rank: "A", suit: "S" }, "KH"];
    expect(thrownBy(() => stackFromJSON(value))).toMatchObject({
      message: expect.stringMatching(
        /^Invalid colour "red" at position 1 of the stack:/u,
      ) as unknown,
    });
    expect(thrownBy(() => stackFromJSON([ACE, "KH"]))).toMatchObject({
      message: expect.stringMatching(
        /^Invalid card "KH" at position 1 of the stack:/u,
      ) as unknown,
    });
    expect(
      thrownBy(() => stackFromJSON([{ color: "red", rank: "T", suit: "D" }])),
    ).toMatchObject({
      message: expect.stringMatching(
        /^Unknown rank "T" at position 0 of the stack:/u,
      ) as unknown,
    });
  });
});

describe("shoeFromJSON", () => {
  it("loads any shoe back from its JSON, as the very same cards in new plain frozen stacks", () => {
    fc.assert(
      fc.property(shoes(), (original) => {
        const loaded = shoeFromJSON(throughJSON(original));
        expect(sameValues(loaded.cards, original.cards)).toBe(true);
        expect(loaded.cutCard).toBe(original.cutCard);
        expect(sameValues(loaded.discardPile, original.discardPile)).toBe(true);
        expect(Object.isFrozen(loaded)).toBe(true);
        expect(isPlainFrozen(loaded.cards)).toBe(true);
        expect(isPlainFrozen(loaded.discardPile)).toBe(true);
      }),
    );
  });

  it("loads any shoe back from a clone", () => {
    fc.assert(
      fc.property(shoes(), (original) => {
        expect(shoeFromJSON(structuredClone(original))).toStrictEqual(original);
      }),
    );
  });

  it("loads a shoe from shoe() and burn() back to an equal shoe", () => {
    const original = burn(
      shoe(standard52(), 6, { random: seededRandom(7) }),
      3,
    );
    expect(shoeFromJSON(throughJSON(original))).toStrictEqual(original);
  });

  it("loads only a shoe's cards, cut card and discard pile", () => {
    const loaded = shoeFromJSON({
      cards: [throughJSON(ACE)],
      cutCard: 1,
      discardPile: [],
      id: "table 4",
    });
    expect(Object.keys(loaded)).toStrictEqual([
      "cards",
      "cutCard",
      "discardPile",
    ]);
  });

  it("names the stack and position of the first card it can't load", () => {
    expect(
      thrownBy(() =>
        shoeFromJSON({ cards: [ACE, "KH"], cutCard: 0, discardPile: [] }),
      ),
    ).toMatchObject({
      message: expect.stringMatching(
        /^Invalid card "KH" at position 1 of the shoe's cards:/u,
      ) as unknown,
    });
    expect(
      thrownBy(() =>
        shoeFromJSON({
          cards: [ACE],
          cutCard: 0,
          discardPile: [KING, { color: "black", rank: "Q", suit: "H" }],
        }),
      ),
    ).toMatchObject({
      message: expect.stringMatching(
        /^Invalid colour "black" at position 1 of the discard pile:/u,
      ) as unknown,
    });
  });

  it.each([
    ["a card that isn't an object", { cards: ["AS"], cutCard: 0 }],
    [
      "a discard pile card with the wrong colour",
      {
        cards: [],
        cutCard: 0,
        discardPile: [{ color: "black", rank: "A", suit: "H" }],
      },
    ],
  ])("rejects a shoe holding %s", (_label, value) => {
    expect(thrownBy(() => shoeFromJSON(value))).toMatchObject({
      code: "INVALID_CARD",
    });
  });
});
