import fc, { type Arbitrary } from "fast-check";
import { describe, expect, it } from "vitest";

import type { Shoe } from "./shoe.ts";

import {
  arraySubclasses,
  asStack,
  countingReads,
  isPlainFrozen,
  nonArrays,
  sameValues,
  shoes,
  stacks,
  thrownBy,
} from "../test/helpers.ts";
import { type Card, card } from "./card.ts";
import {
  formatShoe,
  type FormatShoeOptions,
  formatStack,
  type FormatStackOptions,
  parseShoe,
  parseStack,
  tryParseShoe,
  tryParseStack,
} from "./compact.ts";
import { formatCard, Notation } from "./notation.ts";

const ACE = card("A", "S");
const KING = card("K", "H");
const TEN = card("10", "D");

/** The notations a compact string can be written in. */
const COMPACT_NOTATIONS = [
  Notation.SHORT,
  Notation.SYMBOL,
  Notation.UNICODE_CHARACTER,
] as const;

/** U+FE0F, which asks for a suit symbol's emoji form. */
const EMOJI_SELECTOR = "\u{FE0F}";

/** Lets a test pass options that aren't `FormatStackOptions`, as untyped callers can. */
function asFormatStackOptions(value: unknown): FormatStackOptions {
  return value as FormatStackOptions;
}

/** Lets a test pass text that isn't a string, as untyped callers can. */
function asText(value: unknown): string {
  return value as string;
}

/** Lets a test pass options that aren't `FormatShoeOptions`, as untyped callers can. */
function asFormatShoeOptions(value: unknown): FormatShoeOptions {
  return value as FormatShoeOptions;
}

/** Lets a test pass a value that isn't a shoe, as untyped callers can. */
function asShoe(value: unknown): Shoe {
  return value as Shoe;
}

/** A stack and its compact string, each card in any notation a compact string can use, in any case. */
function writtenStacks(): Arbitrary<{ stack: Card[]; text: string }> {
  return stacks().chain((stack) =>
    fc
      .tuple(
        ...stack.map((each) =>
          fc.mixedCase(
            fc
              .constantFrom(...COMPACT_NOTATIONS)
              .map((notation) => formatCard(each, { notation })),
          ),
        ),
      )
      .map((pieces) => ({ stack, text: pieces.join(" ") })),
  );
}

/** Labelled text that isn't a compact string of a stack. */
const NOT_STACK_TEXT: readonly (readonly [label: string, text: string])[] = [
  ["a space before", " AS KH"],
  ["a space after", "AS KH "],
  ["two spaces between cards", "AS  KH"],
  ["a space alone", " "],
  ["a tab between cards", "AS\tKH"],
  ["a newline between cards", "AS\nKH"],
  ["a newline after", "AS KH\n"],
  ["a no-break space between cards", "AS\u{A0}KH"],
  ["commas", "AS,KH"],
  ["commas and spaces", "AS, KH"],
  ["no space between cards", "ASKH"],
  ["a name", "Ace of Spades"],
  ["names separated by commas", "Ace of Spades, King of Hearts"],
  ["a card that isn't standard", "AS 11H"],
  ["a joker", "AS 🃏"],
  ["a shoe's compact string", "AS KH | 1"],
];

describe("formatStack", () => {
  it("writes the cards top first, separated by single spaces", () => {
    expect(formatStack([ACE, KING, TEN])).toBe("AS KH 10D");
    expect(formatStack([ACE, KING, TEN], { notation: Notation.SYMBOL })).toBe(
      "A♠ K♥ 10♦",
    );
    expect(
      formatStack([ACE, KING, TEN], { notation: Notation.UNICODE_CHARACTER }),
    ).toBe("🂡 🂾 🃊");
    expect(formatStack([ACE])).toBe("AS");
    expect(formatStack([ACE, ACE])).toBe("AS AS");
  });

  it("writes an empty stack as an empty string", () => {
    expect(formatStack([])).toBe("");
  });

  it("writes each card as formatCard does, in short notation unless told otherwise", () => {
    fc.assert(
      fc.property(
        stacks(),
        fc.constantFrom(...COMPACT_NOTATIONS),
        (stack, notation) => {
          const each = stack.map((one) => formatCard(one, { notation }));
          expect(formatStack(stack, { notation })).toBe(each.join(" "));
        },
      ),
    );
    const short = formatStack([ACE, TEN], { notation: Notation.SHORT });
    expect(formatStack([ACE, TEN])).toBe(short);
    expect(formatStack([ACE, TEN], {})).toBe(short);
    expect(formatStack([ACE, TEN], { notation: undefined })).toBe(short);
  });

  it("is read back to the same cards by parseStack, in every notation", () => {
    fc.assert(
      fc.property(
        stacks(),
        fc.constantFrom(...COMPACT_NOTATIONS),
        (stack, notation) => {
          const read = parseStack(formatStack(stack, { notation }));
          expect(sameValues(read, stack)).toBe(true);
        },
      ),
    );
  });

  it("writes an array subclass the same as a plain array", () => {
    for (const [, make] of arraySubclasses()) {
      expect(formatStack(make([ACE, KING, TEN]))).toBe("AS KH 10D");
    }
  });

  it("reads the length and each card once", () => {
    const { reads, stack } = countingReads([ACE, KING, TEN]);
    formatStack(stack);
    expect(reads).toStrictEqual({ length: 1, positions: [1, 1, 1] });
  });

  it("reads the notation option once", () => {
    let reads = 0;
    const options = {
      get notation() {
        reads++;
        return Notation.SYMBOL;
      },
    };
    expect(formatStack([ACE], options)).toBe("A♠");
    expect(reads).toBe(1);
  });

  it.each(nonArrays())("rejects %s as the stack", (_label, value) => {
    expect(thrownBy(() => formatStack(asStack(value)))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });

  it.each([
    ["names", Notation.NAME],
    ["a notation that isn't one", "long"],
    ["a notation's constant name", "SHORT"],
    ["null", null],
    ["a number", 1],
  ])("rejects %s as the notation", (_label, notation) => {
    expect(
      thrownBy(() => formatStack([ACE], asFormatStackOptions({ notation }))),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it.each([
    ["null", null],
    ["a notation on its own", Notation.SHORT],
    ["an array", [Notation.SHORT]],
  ])("rejects %s as the options", (_label, options) => {
    expect(
      thrownBy(() => formatStack([ACE], asFormatStackOptions(options))),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it.each([
    ["a cloned card", structuredClone(ACE)],
    ["a card's text", "AS"],
    ["undefined", undefined],
  ])("rejects a stack holding %s", (_label, value) => {
    expect(
      thrownBy(() => formatStack(asStack([ACE, value, KING]))),
    ).toMatchObject({ code: "INVALID_CARD" });
  });

  it("names the position of the first card it can't write", () => {
    expect(thrownBy(() => formatStack(asStack([ACE, "KH"])))).toMatchObject({
      message:
        'Invalid card "KH" at position 1 of the stack: expected one of the cards card() returns',
    });
  });
});

describe("parseStack and tryParseStack", () => {
  it("read cards separated by single spaces, top first", () => {
    for (const parse of [parseStack, tryParseStack]) {
      expect(parse("AS KH 10D")).toStrictEqual([ACE, KING, TEN]);
      expect(parse("AS")).toStrictEqual([ACE]);
      expect(parse("AS AS")).toStrictEqual([ACE, ACE]);
    }
  });

  it("read an empty string as an empty stack", () => {
    for (const parse of [parseStack, tryParseStack]) {
      const read = parse("");
      expect(read).toStrictEqual([]);
      expect(isPlainFrozen(read)).toBe(true);
    }
  });

  it("read each card in any notation parseCard reads except a name, mixed", () => {
    const text = `as Th 10♡ K♥${EMOJI_SELECTOR} 🃊`;
    for (const parse of [parseStack, tryParseStack]) {
      expect(parse(text)).toStrictEqual([
        ACE,
        card("10", "H"),
        card("10", "H"),
        KING,
        TEN,
      ]);
    }
  });

  it("read back any stack whose cards are written in any mix of notations and case", () => {
    fc.assert(
      fc.property(writtenStacks(), ({ stack, text }) => {
        const read = parseStack(text);
        expect(sameValues(read, stack)).toBe(true);
        expect(isPlainFrozen(read)).toBe(true);
        expect(sameValues(tryParseStack(text) ?? [], stack)).toBe(true);
      }),
    );
  });

  it("give a new stack each time", () => {
    expect(parseStack("AS KH")).not.toBe(parseStack("AS KH"));
  });

  it.each(NOT_STACK_TEXT)("reject %s", (_label, text) => {
    expect(thrownBy(() => parseStack(text))).toMatchObject({
      code: "INVALID_CARD",
    });
    expect(tryParseStack(text)).toBeUndefined();
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["a number", 1],
    ["a stack", [ACE, KING]],
    ["a card", ACE],
  ])("reject %s as the text", (_label, value) => {
    expect(thrownBy(() => parseStack(asText(value)))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
    expect(tryParseStack(asText(value))).toBeUndefined();
  });

  it("name the piece that isn't a card, and its position", () => {
    expect(thrownBy(() => parseStack("AS XX KH"))).toMatchObject({
      message:
        'Unknown card "XX" at position 1 of the stack: expected a card such as "AS", "10H", "A♠" or "🂡"',
    });
    expect(thrownBy(() => parseStack("AS  KH"))).toMatchObject({
      message:
        "Extra space at position 1 of the stack: separate cards with one space, with none around them",
    });
    expect(thrownBy(() => parseStack(" AS"))).toMatchObject({
      message: expect.stringMatching(
        /^Extra space at position 0 of the stack:/u,
      ) as unknown,
    });
  });
});

describe("formatShoe", () => {
  const threeCards: Shoe = {
    cards: [ACE, KING, TEN],
    cutCard: 2,
    discardPile: [card("2", "C"), card("7", "D")],
  };

  it("writes the cards, the cut card's position and the discard pile, separated by bars", () => {
    expect(formatShoe(threeCards)).toBe("AS KH 10D | 2 | 2C 7D");
    expect(formatShoe(threeCards, { notation: Notation.SYMBOL })).toBe(
      "A♠ K♥ 10♦ | 2 | 2♣ 7♦",
    );
    expect(
      formatShoe(threeCards, { notation: Notation.UNICODE_CHARACTER }),
    ).toBe("🂡 🂾 🃊 | 2 | 🃒 🃇");
  });

  it("leaves out an empty discard pile, and the bar before it", () => {
    expect(formatShoe({ ...threeCards, discardPile: [] })).toBe(
      "AS KH 10D | 2",
    );
    expect(formatShoe(asShoe({ cards: [ACE], cutCard: 0 }))).toBe("AS | 0");
  });

  it("starts with a space when the shoe has no cards left", () => {
    expect(formatShoe({ cards: [], cutCard: 0, discardPile: [] })).toBe(" | 0");
    expect(formatShoe({ cards: [], cutCard: 0, discardPile: [ACE] })).toBe(
      " | 0 | AS",
    );
  });

  it("writes the cards and the pile as formatStack does", () => {
    fc.assert(
      fc.property(
        shoes(),
        fc.constantFrom(...COMPACT_NOTATIONS),
        (shoe, notation) => {
          const parts = [
            formatStack(shoe.cards, { notation }),
            String(shoe.cutCard),
          ];
          if (shoe.discardPile.length > 0) {
            parts.push(formatStack(shoe.discardPile, { notation }));
          }
          expect(formatShoe(shoe, { notation })).toBe(parts.join(" | "));
        },
      ),
    );
  });

  it("is read back to the same shoe by parseShoe, in every notation", () => {
    fc.assert(
      fc.property(
        shoes(),
        fc.constantFrom(...COMPACT_NOTATIONS),
        (shoe, notation) => {
          const read = parseShoe(formatShoe(shoe, { notation }));
          expect(sameValues(read.cards, shoe.cards)).toBe(true);
          expect(read.cutCard).toBe(shoe.cutCard);
          expect(sameValues(read.discardPile, shoe.discardPile)).toBe(true);
        },
      ),
    );
  });

  it("reads the notation option once", () => {
    let reads = 0;
    const options = {
      get notation() {
        reads++;
        return Notation.SYMBOL;
      },
    };
    expect(formatShoe(threeCards, options)).toBe("A♠ K♥ 10♦ | 2 | 2♣ 7♦");
    expect(reads).toBe(1);
  });

  it.each([
    ["names", Notation.NAME],
    ["a notation that isn't one", "long"],
    ["null", null],
  ])("rejects %s as the notation", (_label, notation) => {
    expect(
      thrownBy(() => formatShoe(threeCards, asFormatShoeOptions({ notation }))),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it.each([
    ["null", null],
    ["a notation on its own", Notation.SHORT],
    ["an array", [Notation.SHORT]],
  ])("rejects %s as the options", (_label, options) => {
    expect(
      thrownBy(() => formatShoe(threeCards, asFormatShoeOptions(options))),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it("rejects a shoe holding a card that isn't one of this install's, naming where it is", () => {
    const clone = structuredClone(KING);
    expect(
      thrownBy(() =>
        formatShoe({ cards: [ACE, clone], cutCard: 0, discardPile: [] }),
      ),
    ).toMatchObject({
      code: "INVALID_CARD",
      message: expect.stringMatching(
        /^Invalid card \(object\) at position 1 of the shoe's cards:/u,
      ) as unknown,
    });
    expect(
      thrownBy(() =>
        formatShoe({ cards: [], cutCard: 0, discardPile: [clone] }),
      ),
    ).toMatchObject({
      code: "INVALID_CARD",
      message: expect.stringMatching(
        /^Invalid card \(object\) at position 0 of the discard pile:/u,
      ) as unknown,
    });
  });
});

describe("parseShoe and tryParseShoe", () => {
  it("read the cards, the cut card's position and the discard pile", () => {
    for (const parse of [parseShoe, tryParseShoe]) {
      expect(parse("AS KH 10D | 2 | 2C 7D")).toStrictEqual({
        cards: [ACE, KING, TEN],
        cutCard: 2,
        discardPile: [card("2", "C"), card("7", "D")],
      });
    }
  });

  it("read a shoe with its discard pile left out as having an empty one", () => {
    for (const parse of [parseShoe, tryParseShoe]) {
      expect(parse("AS KH | 0")).toStrictEqual({
        cards: [ACE, KING],
        cutCard: 0,
        discardPile: [],
      });
    }
  });

  it("read a shoe with no cards left", () => {
    for (const parse of [parseShoe, tryParseShoe]) {
      expect(parse(" | 0")).toStrictEqual({
        cards: [],
        cutCard: 0,
        discardPile: [],
      });
      expect(parse(" | 0 | AS")).toStrictEqual({
        cards: [],
        cutCard: 0,
        discardPile: [ACE],
      });
    }
  });

  it("give a frozen shoe of new plain frozen stacks", () => {
    const read = parseShoe("AS KH | 1 | 10D");
    expect(Object.isFrozen(read)).toBe(true);
    expect(isPlainFrozen(read.cards)).toBe(true);
    expect(isPlainFrozen(read.discardPile)).toBe(true);
    expect(Object.keys(read)).toStrictEqual([
      "cards",
      "cutCard",
      "discardPile",
    ]);
  });

  it("read back any shoe whose cards are written in any mix of notations and case", () => {
    const written = fc
      .tuple(writtenStacks(), writtenStacks())
      .chain(([cards, pile]) =>
        fc.record({
          cards: fc.constant(cards),
          cutCard: fc.integer({ max: cards.stack.length, min: 0 }),
          pile: fc.constant(pile),
        }),
      );
    fc.assert(
      fc.property(written, ({ cards, cutCard, pile }) => {
        const parts = [cards.text, String(cutCard)];
        if (pile.stack.length > 0) parts.push(pile.text);
        const read = parseShoe(parts.join(" | "));
        expect(sameValues(read.cards, cards.stack)).toBe(true);
        expect(read.cutCard).toBe(cutCard);
        expect(sameValues(read.discardPile, pile.stack)).toBe(true);
        expect(tryParseShoe(parts.join(" | "))).toStrictEqual(read);
      }),
    );
  });

  it.each([
    ["an empty string", ""],
    ["no bar", "AS KH"],
    ["no cut card", "AS KH | "],
    ["bars without spaces", "AS KH|1"],
    ["a bar with a space only after it", "AS KH| 1"],
    ["a bar with a space only before it", "AS KH |1"],
    ["an empty discard pile written out", "AS KH | 1 | "],
    ["a trailing bar", "AS KH | 1 |"],
    ["four parts", "AS | 1 | KH | 10D"],
    ["a trimmed shoe with no cards", "| 0"],
    ["a cut card with a leading zero", "AS KH | 01"],
    ["a negative cut card", "AS KH | -1"],
    ["a cut card with a plus sign", "AS KH | +1"],
    ["a fractional cut card", "AS KH | 1.0"],
    ["a cut card in exponent form", "AS KH | 1e0"],
    ["a cut card in hex", "AS KH | 0x1"],
    ["a cut card with a space after it", "AS KH | 1 "],
    ["a full-width cut card", "AS KH | １"],
    ["a cut card below the bottom card", "AS KH | 3"],
    ["a cut card in an empty shoe", " | 1"],
    ["a cut card too big for an integer", `AS | ${"9".repeat(400)}`],
  ])("reject %s", (_label, text) => {
    expect(thrownBy(() => parseShoe(text))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
    expect(tryParseShoe(text)).toBeUndefined();
  });

  it.each([
    ["a card that isn't one", "AS XX | 1"],
    ["two spaces between cards", "AS  KH | 1"],
    ["a space before the cards", " AS KH | 1"],
    ["a card in the pile that isn't one", "AS KH | 1 | XX"],
    ["a space after the pile", "AS KH | 1 | 10D "],
    ["a name", "Ace of Spades | 0"],
  ])("reject %s", (_label, text) => {
    expect(thrownBy(() => parseShoe(text))).toMatchObject({
      code: "INVALID_CARD",
    });
    expect(tryParseShoe(text)).toBeUndefined();
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["a shoe", { cards: [ACE], cutCard: 0, discardPile: [] }],
  ])("reject %s as the text", (_label, value) => {
    expect(thrownBy(() => parseShoe(asText(value)))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
    expect(tryParseShoe(asText(value))).toBeUndefined();
  });

  it("name what's wrong, and where", () => {
    expect(thrownBy(() => parseShoe("AS KH|1"))).toMatchObject({
      message:
        'Invalid shoe text "AS KH|1": expected the shoe\'s cards, its cut card\'s position and, if it isn\'t empty, its discard pile, separated by " | ", such as "AS 10H KD | 2 | 2C"',
    });
    expect(thrownBy(() => parseShoe("AS KH | 01"))).toMatchObject({
      message:
        'Invalid cut card "01": expected its position as a whole number, such as "2"',
    });
    expect(thrownBy(() => parseShoe("AS KH | 3"))).toMatchObject({
      message: "Invalid cut card 3: expected an integer from 0 to 2",
    });
    expect(thrownBy(() => parseShoe("AS XX | 1"))).toMatchObject({
      message: expect.stringMatching(
        /^Unknown card "XX" at position 1 of the shoe's cards:/u,
      ) as unknown,
    });
    expect(thrownBy(() => parseShoe("AS | 1 | 2C XX"))).toMatchObject({
      message: expect.stringMatching(
        /^Unknown card "XX" at position 1 of the discard pile:/u,
      ) as unknown,
    });
  });
});
