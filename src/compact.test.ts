import fc, { type Arbitrary } from "fast-check";
import { describe, expect, it } from "vitest";

import {
  arraySubclasses,
  asStack,
  countingReads,
  isPlainFrozen,
  nonArrays,
  sameValues,
  stacks,
  thrownBy,
} from "../test/helpers.ts";
import { type Card, card } from "./card.ts";
import {
  formatStack,
  type FormatStackOptions,
  parseStack,
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
