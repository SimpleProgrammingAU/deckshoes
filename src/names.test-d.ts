import { describe, expectTypeOf, it } from "vitest";

import type { Rank, Suit } from "./card.ts";

import {
  rankName,
  type RankNameOptions,
  suitName,
  type SuitNameOptions,
} from "./names.ts";

describe("rankName", () => {
  it("takes a rank and optional settings, and returns a string", () => {
    expectTypeOf(rankName).parameter(0).toEqualTypeOf<Rank>();
    expectTypeOf(rankName).returns.toEqualTypeOf<string>();
    expectTypeOf(rankName).toBeCallableWith("10");
    expectTypeOf(rankName).toBeCallableWith("10", undefined);
    expectTypeOf(rankName).toBeCallableWith("10", {});
    expectTypeOf(rankName).toBeCallableWith("10", { lowercase: true });
  });

  it("rejects ranks that aren't standard, and settings it doesn't have", () => {
    // @ts-expect-error "11" is not a Rank
    expectTypeOf(rankName).toBeCallableWith("11");
    // @ts-expect-error "T" is only accepted when parsing text
    expectTypeOf(rankName).toBeCallableWith("T");
    // @ts-expect-error a rank is a string, not a number
    expectTypeOf(rankName).toBeCallableWith(10);
    // @ts-expect-error only a suit's name has a singular
    expectTypeOf(rankName).toBeCallableWith("A", { singular: true });
    // @ts-expect-error lowercase is true or false
    expectTypeOf(rankName).toBeCallableWith("A", { lowercase: "yes" });
  });
});

describe("suitName", () => {
  it("takes a suit and optional settings, and returns a string", () => {
    expectTypeOf(suitName).parameter(0).toEqualTypeOf<Suit>();
    expectTypeOf(suitName).returns.toEqualTypeOf<string>();
    expectTypeOf(suitName).toBeCallableWith("D");
    expectTypeOf(suitName).toBeCallableWith("D", undefined);
    expectTypeOf(suitName).toBeCallableWith("D", {});
    expectTypeOf(suitName).toBeCallableWith("D", {
      lowercase: true,
      singular: true,
    });
  });

  it("rejects suits that aren't standard, and settings that aren't true or false", () => {
    // @ts-expect-error "X" is not a Suit
    expectTypeOf(suitName).toBeCallableWith("X");
    // @ts-expect-error suits are upper case
    expectTypeOf(suitName).toBeCallableWith("d");
    // @ts-expect-error singular is true or false
    expectTypeOf(suitName).toBeCallableWith("D", { singular: 1 });
  });
});

describe("RankNameOptions and SuitNameOptions", () => {
  it("hold only optional, readonly settings", () => {
    expectTypeOf<RankNameOptions>().toEqualTypeOf<{
      readonly lowercase?: boolean | undefined;
    }>();
    expectTypeOf<SuitNameOptions>().toEqualTypeOf<{
      readonly lowercase?: boolean | undefined;
      readonly singular?: boolean | undefined;
    }>();
  });
});
