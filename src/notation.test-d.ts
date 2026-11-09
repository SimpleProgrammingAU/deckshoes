import { describe, expectTypeOf, it } from "vitest";

import { type Card, card } from "./card.ts";
import {
  formatCard,
  type FormatCardOptions,
  Notation,
  parseCard,
  tryParseCard,
} from "./notation.ts";

describe("parseCard and tryParseCard", () => {
  it("take text and return a card, or undefined from tryParseCard", () => {
    expectTypeOf(parseCard).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(parseCard).returns.toEqualTypeOf<Card>();
    expectTypeOf(tryParseCard).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(tryParseCard).returns.toEqualTypeOf<Card | undefined>();
  });

  it("reject anything but text", () => {
    // @ts-expect-error a card isn't text
    expectTypeOf(parseCard).toBeCallableWith(card("A", "S"));
    // @ts-expect-error parsing reads every notation, so it takes no options
    expectTypeOf(parseCard).toBeCallableWith("AS", { notation: "short" });
    // @ts-expect-error a number isn't text
    expectTypeOf(tryParseCard).toBeCallableWith(10);
  });
});

describe("formatCard", () => {
  const ace = card("A", "S");

  it("takes a card and optional settings, and returns a string", () => {
    expectTypeOf(formatCard).parameter(0).toEqualTypeOf<Card>();
    expectTypeOf(formatCard).returns.toEqualTypeOf<string>();
    expectTypeOf(formatCard).toBeCallableWith(ace);
    expectTypeOf(formatCard).toBeCallableWith(ace, undefined);
    expectTypeOf(formatCard).toBeCallableWith(ace, {});
    expectTypeOf(formatCard).toBeCallableWith(ace, { notation: undefined });
    expectTypeOf(formatCard).toBeCallableWith(ace, {
      notation: Notation.SYMBOL,
    });
    // The plain string still type-checks (ADR 0010).
    expectTypeOf(formatCard).toBeCallableWith(ace, { notation: "name" });
    expectTypeOf(formatCard).toBeCallableWith(ace, {
      notation: "unicode character",
    });
  });

  it("rejects anything but a card, and settings it doesn't have", () => {
    const fields = { color: "black", rank: "A", suit: "S" } as const;
    // @ts-expect-error text isn't a card
    expectTypeOf(formatCard).toBeCallableWith("AS");
    // @ts-expect-error an object with a card's fields isn't a card
    expectTypeOf(formatCard).toBeCallableWith(fields);
    // @ts-expect-error the notation goes in the options object
    expectTypeOf(formatCard).toBeCallableWith(ace, Notation.SYMBOL);
    // @ts-expect-error "long" isn't a notation
    expectTypeOf(formatCard).toBeCallableWith(ace, { notation: "long" });
    // @ts-expect-error a notation's value is lower case
    expectTypeOf(formatCard).toBeCallableWith(ace, { notation: "SYMBOL" });
    expectTypeOf(formatCard).toBeCallableWith(ace, {
      // @ts-expect-error a notation's value has spaces, not underscores
      notation: "unicode_character",
    });
    expectTypeOf(formatCard).toBeCallableWith(ace, {
      // @ts-expect-error a notation's value isn't its key
      notation: "UNICODE_CHARACTER",
    });
    // @ts-expect-error formatCard has no lowercase setting
    expectTypeOf(formatCard).toBeCallableWith(ace, { lowercase: true });
  });
});

describe("Notation and FormatCardOptions", () => {
  it("give each notation as a lower-case string, with spaces between words", () => {
    expectTypeOf<Notation>().toEqualTypeOf<
      "short" | "symbol" | "name" | "unicode character"
    >();
    expectTypeOf(Notation).toEqualTypeOf<{
      readonly NAME: "name";
      readonly SHORT: "short";
      readonly SYMBOL: "symbol";
      readonly UNICODE_CHARACTER: "unicode character";
    }>();
  });

  it("hold only an optional, readonly notation", () => {
    expectTypeOf<FormatCardOptions>().toEqualTypeOf<{
      readonly notation?: Notation | undefined;
    }>();
  });
});
