import { describe, expectTypeOf, it } from "vitest";

import type { CardStack } from "./stack.ts";

import { type Card, card } from "./card.ts";
import { standard52 } from "./presets/standard52.ts";
import { contains, count, remove } from "./remove.ts";

describe("remove", () => {
  it("returns a stack of the same kind of card, which can't be changed", () => {
    expectTypeOf(
      remove(standard52(), [card("A", "S")]),
    ).toEqualTypeOf<CardStack>();
    expectTypeOf(remove([1, 2, 3], [2])).toEqualTypeOf<CardStack<number>>();
    expectTypeOf(remove(standard52(), [])).not.toHaveProperty("push");
  });
});

describe("contains", () => {
  it("returns a boolean", () => {
    expectTypeOf(
      contains(standard52(), [card("A", "S")]),
    ).toEqualTypeOf<boolean>();
  });
});

describe("remove and contains", () => {
  it("take the cards as an array, frozen or not", () => {
    const cards = [card("A", "S")];
    expectTypeOf(remove).toBeCallableWith(standard52(), cards);
    expectTypeOf(remove).toBeCallableWith(standard52(), Object.freeze(cards));
    expectTypeOf(contains).toBeCallableWith([...standard52()], cards);
  });

  it("reject cards of another kind and a lone card", () => {
    // @ts-expect-error The cards are the same kind as the stack's.
    const removed = remove(standard52(), [1]);
    expectTypeOf(removed).toEqualTypeOf<CardStack>();
    // @ts-expect-error The cards are the same kind as the stack's.
    const found = contains(standard52(), [1]);
    expectTypeOf(found).toEqualTypeOf<boolean>();
    // @ts-expect-error The cards are always an array, even for one card.
    expectTypeOf(remove).toBeCallableWith(standard52(), card("A", "S"));
    // @ts-expect-error The cards are always an array, even for one card.
    expectTypeOf(contains).toBeCallableWith(standard52(), card("A", "S"));
  });
});

describe("count", () => {
  it("returns a number, and passes match the stack's kind of card", () => {
    expectTypeOf(count(standard52(), () => true)).toEqualTypeOf<number>();
    count(standard52(), (each) => {
      expectTypeOf(each).toEqualTypeOf<Card>();
      return true;
    });
    count([1, 2, 3], (each) => {
      expectTypeOf(each).toEqualTypeOf<number>();
      return each > 1;
    });
  });

  it("accepts a match that returns anything, as filter does", () => {
    expectTypeOf(count).toBeCallableWith(standard52(), () => 1);
    const aces = count(standard52(), (each) => each.rank === "A" && each);
    expectTypeOf(aces).toEqualTypeOf<number>();
  });

  it("rejects a match for another kind of card, and a match that isn't a function", () => {
    // @ts-expect-error match takes the stack's kind of card.
    const other = count(standard52(), (each: number) => each > 1);
    expectTypeOf(other).toEqualTypeOf<number>();
    // @ts-expect-error match is a function.
    expectTypeOf(count).toBeCallableWith(standard52(), "H");
  });
});
