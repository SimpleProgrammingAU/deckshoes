import { describe, expectTypeOf, it } from "vitest";

import type { Shoe } from "./shoe.ts";
import type { CardStack } from "./stack.ts";

import { card } from "./card.ts";
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
import { Notation } from "./notation.ts";

describe("formatStack", () => {
  const hand = [card("A", "S"), card("10", "H")];

  it("takes a stack of standard cards and optional settings, and returns a string", () => {
    expectTypeOf(formatStack).parameter(0).toEqualTypeOf<CardStack>();
    expectTypeOf(formatStack).returns.toEqualTypeOf<string>();
    expectTypeOf(formatStack).toBeCallableWith(hand);
    expectTypeOf(formatStack).toBeCallableWith(hand, undefined);
    expectTypeOf(formatStack).toBeCallableWith(hand, {});
    expectTypeOf(formatStack).toBeCallableWith(hand, { notation: undefined });
    expectTypeOf(formatStack).toBeCallableWith(hand, {
      notation: Notation.SHORT,
    });
    expectTypeOf(formatStack).toBeCallableWith(hand, {
      notation: Notation.SYMBOL,
    });
    expectTypeOf(formatStack).toBeCallableWith(hand, {
      notation: Notation.UNICODE_CHARACTER,
    });
  });

  it("rejects names, which have spaces, and anything that isn't a notation", () => {
    const names = { notation: Notation.NAME } as const;
    // @ts-expect-error a compact string can't use names
    expectTypeOf(formatStack).toBeCallableWith(hand, names);
    // @ts-expect-error not a notation
    expectTypeOf(formatStack).toBeCallableWith(hand, { notation: "long" });
    // @ts-expect-error a stack of strings isn't a stack of cards
    expectTypeOf(formatStack).toBeCallableWith(["AS"]);
  });

  it("names its settings FormatStackOptions", () => {
    expectTypeOf<FormatStackOptions["notation"]>().toEqualTypeOf<
      | typeof Notation.SHORT
      | typeof Notation.SYMBOL
      | typeof Notation.UNICODE_CHARACTER
      | undefined
    >();
  });
});

describe("parseStack and tryParseStack", () => {
  it("take text and return a stack, or undefined from tryParseStack", () => {
    expectTypeOf(parseStack).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(parseStack).returns.toEqualTypeOf<CardStack>();
    expectTypeOf(tryParseStack).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(tryParseStack).returns.toEqualTypeOf<CardStack | undefined>();
  });

  it("take no options, since they read every notation a compact string can use", () => {
    // @ts-expect-error parsing takes no options
    expectTypeOf(parseStack).toBeCallableWith("AS", { notation: "short" });
  });
});

describe("formatShoe", () => {
  const twoCards: Shoe = {
    cards: [card("A", "S"), card("10", "H")],
    cutCard: 1,
    discardPile: [],
  };

  it("takes a shoe of standard cards and optional settings, and returns a string", () => {
    expectTypeOf(formatShoe).parameter(0).toEqualTypeOf<Shoe>();
    expectTypeOf(formatShoe).returns.toEqualTypeOf<string>();
    expectTypeOf(formatShoe).toBeCallableWith(twoCards);
    expectTypeOf(formatShoe).toBeCallableWith(twoCards, {});
    expectTypeOf(formatShoe).toBeCallableWith(twoCards, {
      notation: Notation.UNICODE_CHARACTER,
    });
  });

  it("rejects names, which have spaces", () => {
    const names = { notation: Notation.NAME } as const;
    // @ts-expect-error a compact string can't use names
    expectTypeOf(formatShoe).toBeCallableWith(twoCards, names);
  });

  it("takes the same notations as formatStack", () => {
    expectTypeOf<FormatShoeOptions["notation"]>().toEqualTypeOf<
      FormatStackOptions["notation"]
    >();
  });
});

describe("parseShoe and tryParseShoe", () => {
  it("take text and return a shoe, or undefined from tryParseShoe", () => {
    expectTypeOf(parseShoe).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(parseShoe).returns.toEqualTypeOf<Shoe>();
    expectTypeOf(tryParseShoe).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(tryParseShoe).returns.toEqualTypeOf<Shoe | undefined>();
  });
});
