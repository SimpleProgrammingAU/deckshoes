import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { standardPairs, thrownBy } from "../test/helpers.ts";
import { type Card, card, type Suit } from "./card.ts";
import { isDeckshoesError } from "./errors.ts";
import { rankName, suitName } from "./names.ts";
import {
  formatCard,
  type FormatCardOptions,
  Notation,
  parseCard,
  tryParseCard,
} from "./notation.ts";
import { standard52 } from "./presets/standard52.ts";

// Written out here rather than imported, so the tests don't share the
// implementation's tables.
const SYMBOLS: Readonly<Record<Suit, string>> = {
  C: "♣",
  D: "♦",
  H: "♥",
  S: "♠",
};

/** U+FE0E, which asks for a character to be shown as text. */
const TEXT_SELECTOR = String.fromCodePoint(0xfe_0e);

/** U+FE0F, which asks for a character to be shown as an emoji. */
const EMOJI_SELECTOR = String.fromCodePoint(0xfe_0f);

/** U+212A, the Kelvin sign, which looks like K and lower-cases to k. */
const KELVIN_SIGN = String.fromCodePoint(0x21_2a);

/** Every notation, as the test lists them. */
const NOTATIONS = [Notation.SHORT, Notation.SYMBOL, Notation.NAME] as const;

/** Lets a test pass a value that isn't text, as untyped callers can. */
function asText(value: unknown): string {
  return value as string;
}

/** Lets a test pass a value that isn't a card, as untyped callers can. */
function asCard(value: unknown): Card {
  return value as Card;
}

/** Lets a test pass options that the types rule out. */
function asFormatCardOptions(value: unknown): FormatCardOptions {
  return value as FormatCardOptions;
}

describe("formatCard", () => {
  it("writes every card in short notation, which is the default", () => {
    for (const [rank, suit] of standardPairs) {
      expect(formatCard(card(rank, suit))).toBe(`${rank}${suit}`);
      expect(formatCard(card(rank, suit), { notation: Notation.SHORT })).toBe(
        `${rank}${suit}`,
      );
    }
  });

  it("writes every card in symbol notation", () => {
    for (const [rank, suit] of standardPairs) {
      expect(formatCard(card(rank, suit), { notation: Notation.SYMBOL })).toBe(
        `${rank}${SYMBOLS[suit]}`,
      );
    }
  });

  it("writes every card's name from rankName and suitName", () => {
    for (const [rank, suit] of standardPairs) {
      expect(formatCard(card(rank, suit), { notation: Notation.NAME })).toBe(
        `${rankName(rank)} of ${suitName(suit)}`,
      );
    }
  });

  it.each([
    ["A", "S", "AS", "A♠", "Ace of Spades"],
    ["10", "H", "10H", "10♥", "Ten of Hearts"],
    ["Q", "D", "QD", "Q♦", "Queen of Diamonds"],
    ["2", "C", "2C", "2♣", "Two of Clubs"],
  ] as const)(
    "writes %s%s as %s, %s and %s",
    (rank, suit, short, symbol, name) => {
      const written = NOTATIONS.map((notation) =>
        formatCard(card(rank, suit), { notation }),
      );
      expect(written).toStrictEqual([short, symbol, name]);
    },
  );

  it.each([
    ["no options", undefined],
    ["empty options", {}],
    ["notation set to undefined", { notation: undefined }],
  ] as const)("uses short notation with %s", (_label, options) => {
    expect(formatCard(card("10", "H"), options)).toBe("10H");
  });
});

describe("formatCard with input that isn't valid", () => {
  it.each([
    ["an object literal", { color: "black", rank: "A", suit: "S" }],
    ["an object spread from a card", { ...card("A", "S") }],
    ["a structured clone", structuredClone(card("A", "S"))],
    ["a card's text", "AS"],
    ["null", null],
    ["undefined", undefined],
  ])("rejects %s as the card", (_label, value) => {
    expect(thrownBy(() => formatCard(asCard(value)))).toMatchObject({
      code: "INVALID_CARD",
    });
  });

  it.each([
    ["null", null],
    ["a number", 1],
    ["a notation", "symbol"],
    ["true", true],
  ])("rejects %s in place of the options object", (_label, options) => {
    expect(
      thrownBy(() => formatCard(card("A", "S"), asFormatCardOptions(options))),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it.each([
    ["a constant's key", "SHORT"],
    ["an unknown notation", "long"],
    ["an empty string", ""],
    ["a number", 1],
    ["null", null],
    ["an object", {}],
  ])("rejects %s as the notation", (_label, notation) => {
    expect(
      thrownBy(() =>
        formatCard(card("A", "S"), asFormatCardOptions({ notation })),
      ),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it("checks the card before the options", () => {
    expect(
      thrownBy(() => formatCard(asCard({}), asFormatCardOptions(null))),
    ).toMatchObject({ code: "INVALID_CARD" });
  });

  it("reads the notation once", () => {
    let reads = 0;
    const options = {
      get notation() {
        reads++;
        return Notation.SYMBOL;
      },
    };
    expect(formatCard(card("K", "C"), options)).toBe("K♣");
    expect(reads).toBe(1);
  });
});

describe("parseCard", () => {
  it.each([
    ["AS", "A", "S"],
    ["as", "A", "S"],
    ["aS", "A", "S"],
    ["As", "A", "S"],
    ["10h", "10", "H"],
    ["10H", "10", "H"],
    ["Th", "10", "H"],
    ["TH", "10", "H"],
    ["th", "10", "H"],
    ["kd", "K", "D"],
    ["2c", "2", "C"],
    ["A♠", "A", "S"],
    ["a♠", "A", "S"],
    ["10♥", "10", "H"],
    ["T♥", "10", "H"],
    ["t♥", "10", "H"],
    ["Q♦", "Q", "D"],
    ["j♣", "J", "C"],
    ["A♤", "A", "S"],
    ["10♡", "10", "H"],
    ["T♢", "10", "D"],
    ["k♧", "K", "C"],
    [`Q♥${EMOJI_SELECTOR}`, "Q", "H"],
    [`Q♥${TEXT_SELECTOR}`, "Q", "H"],
    [`q♡${EMOJI_SELECTOR}`, "Q", "H"],
    [`T♠${TEXT_SELECTOR}`, "10", "S"],
    ["Ace of Spades", "A", "S"],
    ["ace of spades", "A", "S"],
    ["ACE OF SPADES", "A", "S"],
    ["aCe Of sPaDeS", "A", "S"],
    ["Ten of Hearts", "10", "H"],
    ["Queen of Diamonds", "Q", "D"],
    ["Two of Clubs", "2", "C"],
  ] as const)("reads %j", (text, rank, suit) => {
    expect(parseCard(text)).toBe(card(rank, suit));
    expect(tryParseCard(text)).toBe(card(rank, suit));
  });

  it("reads every card back from every notation", () => {
    for (const [rank, suit] of standardPairs) {
      for (const notation of NOTATIONS) {
        const written = formatCard(card(rank, suit), { notation });
        expect(parseCard(written)).toBe(card(rank, suit));
      }
    }
  });

  it("reads back any card written in any notation, in any case", () => {
    const written = fc
      .tuple(fc.constantFrom(...standard52()), fc.constantFrom(...NOTATIONS))
      .chain(([original, notation]) =>
        fc.tuple(
          fc.constant(original),
          fc.mixedCase(fc.constant(formatCard(original, { notation }))),
        ),
      );
    fc.assert(
      fc.property(written, ([original, text]) => {
        expect(parseCard(text)).toBe(original);
      }),
    );
  });

  it("names the input in the message, cutting long input short", () => {
    expect(thrownBy(() => parseCard("ZZ"))).toMatchObject({
      message:
        'Unknown card "ZZ": expected text such as "AS", "10H", "A♠" or "Ace of Spades"',
    });
    expect(thrownBy(() => parseCard("x".repeat(1_000_000)))).toMatchObject({
      message: expect.stringMatching(
        new RegExp(`^Unknown card "${"x".repeat(30)}"…:`, "u"),
      ) as unknown,
    });
  });
});

describe("parseCard and tryParseCard with text that isn't a card", () => {
  it.each([
    ["an empty string", ""],
    ["a space before", " AS"],
    ["a space after", "AS "],
    ["a newline after", "AS\n"],
    ["a space inside", "A S"],
    ["a space before a symbol", "A ♠"],
    ["1 for ace", "1S"],
    ["11", "11S"],
    ["a suit that isn't standard", "AX"],
    ["the suit first", "SA"],
    ["a rank alone", "10"],
    ["a suit alone", "S"],
    ["a symbol alone", "♠"],
    ["two cards", "AS KD"],
    ["two variation selectors", `A♠${EMOJI_SELECTOR}${EMOJI_SELECTOR}`],
    ["a variation selector before the symbol", `A${EMOJI_SELECTOR}♠`],
    ["a variation selector after a letter", `AS${EMOJI_SELECTOR}`],
    ["a singular suit name", "Ace of Spade"],
    ["two spaces in a name", "Ace  of Spades"],
    ["a name without of", "Ace Spades"],
    ["10 in a name", "10 of Spades"],
    ["T in a name", "T of Spades"],
    ["a rank's letter in a name", "A of Spades"],
    ["a symbol in a name", "Ace of ♠"],
    ["the Kelvin sign for K", `${KELVIN_SIGN}S`],
    ["the Kelvin sign in a name", `${KELVIN_SIGN}ing of Spades`],
    ["full-width letters", "ＡＳ"],
    ["a playing-card character", "🂡"],
    ["a joker", "Joker"],
    ["a prototype key", "constructor"],
    ["__proto__", "__proto__"],
    ["a long string", "AS".repeat(1000)],
  ])("rejects %s", (_label, text) => {
    expect(thrownBy(() => parseCard(text))).toMatchObject({
      code: "INVALID_CARD",
    });
    expect(tryParseCard(text)).toBeUndefined();
  });

  it.each([
    ["a number", 10],
    ["null", null],
    ["undefined", undefined],
    ["an object", {}],
    ["an array", ["A", "S"]],
    ["a String object", new Object("AS")],
    ["a card", card("A", "S")],
  ])("rejects %s, which isn't text", (_label, value) => {
    expect(thrownBy(() => parseCard(asText(value)))).toMatchObject({
      code: "INVALID_CARD",
    });
    expect(tryParseCard(asText(value))).toBeUndefined();
  });

  it("gives undefined from tryParseCard exactly when parseCard throws", () => {
    // Text near a card's, so both outcomes come up often.
    const nearCards = fc
      .tuple(
        fc.constantFrom("A", "a", "10", "T", "1", "K", "Ace", ""),
        fc.constantFrom("S", "h", "♠", "♡", "X", " of Spades", ""),
        fc.constantFrom("", EMOJI_SELECTOR, " "),
      )
      .map((parts) => parts.join(""));
    fc.assert(
      fc.property(fc.oneof(fc.anything(), fc.string(), nearCards), (value) => {
        const found = tryParseCard(asText(value));
        let parsed: Card | undefined;
        let thrown: unknown;
        try {
          parsed = parseCard(asText(value));
        } catch (error) {
          thrown = error;
        }
        expect(parsed).toBe(found);
        expect(
          found === undefined
            ? isDeckshoesError(thrown, "INVALID_CARD")
            : thrown === undefined,
        ).toBe(true);
      }),
    );
  });
});
