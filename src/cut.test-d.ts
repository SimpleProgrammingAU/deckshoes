import { describe, expectTypeOf, it } from "vitest";

import type { RandomSource } from "./random.ts";
import type { CardStack } from "./stack.ts";

import { card } from "./card.ts";
import {
  cut,
  type CutOptions,
  insert,
  type InsertOptions,
  Position,
} from "./cut.ts";
import { standard52 } from "./presets/standard52.ts";
import { seededRandom } from "./random.ts";

describe("Position", () => {
  it("is a number or one of the named values, which can't be changed", () => {
    expectTypeOf<Position>().toEqualTypeOf<number | "bottom" | "random">();
    expectTypeOf(Position.BOTTOM).toEqualTypeOf<"bottom">();
    expectTypeOf(Position.RANDOM).toEqualTypeOf<"random">();
    // @ts-expect-error The constant is read-only.
    Position.RANDOM = "random";
  });
});

describe("CutOptions and InsertOptions", () => {
  it("take an optional random source, or undefined", () => {
    expectTypeOf<CutOptions>().toEqualTypeOf<{
      readonly random?: RandomSource | undefined;
    }>();
    expectTypeOf<InsertOptions>().toEqualTypeOf<CutOptions>();
  });
});

describe("cut", () => {
  it("returns a stack of the same kind of card, which can't be changed", () => {
    expectTypeOf(cut(standard52(), 1)).toEqualTypeOf<CardStack>();
    expectTypeOf(cut([1, 2, 3], 1)).toEqualTypeOf<CardStack<number>>();
    expectTypeOf(cut(["a", "b"] as const)).toEqualTypeOf<
      CardStack<"a" | "b">
    >();
    expectTypeOf(cut(standard52())).not.toHaveProperty("push");
  });

  it("takes a position, a named value, undefined or none, then options", () => {
    expectTypeOf(cut).toBeCallableWith(standard52());
    expectTypeOf(cut).toBeCallableWith(standard52(), 26);
    expectTypeOf(cut).toBeCallableWith(standard52(), Position.BOTTOM);
    expectTypeOf(cut).toBeCallableWith(standard52(), undefined);
    expectTypeOf(cut).toBeCallableWith(standard52(), Position.RANDOM, {
      random: seededRandom(42),
    });
    expectTypeOf(cut).toBeCallableWith([...standard52()], "random", {});
  });

  it("rejects another string as the position, a position in the options, and a random option that isn't a source", () => {
    // @ts-expect-error A position is a number or a named value.
    expectTypeOf(cut).toBeCallableWith(standard52(), "top");
    // @ts-expect-error Positions stay positional (ADR 0009).
    expectTypeOf(cut).toBeCallableWith(standard52(), { position: 26 });
    // @ts-expect-error A random source is a function.
    expectTypeOf(cut).toBeCallableWith(standard52(), 26, { random: 42 });
    // @ts-expect-error A stack is an array of cards, not a string of them.
    expectTypeOf(cut).toBeCallableWith("AS KH", 1);
  });
});

describe("insert", () => {
  it("returns a stack of the same kind of card, which can't be changed", () => {
    expectTypeOf(
      insert(standard52(), [card("A", "S")], 1),
    ).toEqualTypeOf<CardStack>();
    expectTypeOf(insert([1, 2, 3], [4])).toEqualTypeOf<CardStack<number>>();
    expectTypeOf(insert(standard52(), [])).not.toHaveProperty("push");
  });

  it("takes cards, then a position, a named value, undefined or none, then options", () => {
    const cards = [card("A", "S")];
    expectTypeOf(insert).toBeCallableWith(standard52(), cards);
    expectTypeOf(insert).toBeCallableWith(standard52(), cards, 26);
    expectTypeOf(insert).toBeCallableWith(standard52(), cards, Position.BOTTOM);
    expectTypeOf(insert).toBeCallableWith(standard52(), cards, undefined);
    expectTypeOf(insert).toBeCallableWith(
      standard52(),
      Object.freeze(cards),
      Position.RANDOM,
      { random: seededRandom(42) },
    );
  });

  it("rejects cards of another kind, a lone card, and another string as the position", () => {
    // @ts-expect-error The cards are the same kind as the stack's.
    const mixed = insert(standard52(), [1]);
    expectTypeOf(mixed).toEqualTypeOf<CardStack>();
    // @ts-expect-error The cards are always an array, even for one card.
    expectTypeOf(insert).toBeCallableWith(standard52(), card("A", "S"));
    // @ts-expect-error A position is a number or a named value.
    expectTypeOf(insert).toBeCallableWith(standard52(), [], "top");
    // @ts-expect-error A random source is a function.
    expectTypeOf(insert).toBeCallableWith(standard52(), [], 0, { random: 42 });
  });
});
