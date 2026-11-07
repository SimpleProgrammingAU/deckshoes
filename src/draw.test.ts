import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { CardStack } from "./stack.ts";

import {
  asStack,
  nonArrays,
  stacksWithCounts,
  thrownBy,
} from "../test/helpers.ts";
import { card } from "./card.ts";
import { draw, drawBottom, peek, peekBottom } from "./draw.ts";

const ACE = card("A", "S");
const KING = card("K", "H");
const TEN = card("10", "D");
const hand = [ACE, KING, TEN];

/** A stack of anything, and a count from 0 up to its size. */
const stacksOfAnything = fc.array(fc.anything()).chain((stack) =>
  fc.record({
    count: fc.nat({ max: stack.length }),
    stack: fc.constant(stack),
  }),
);

/** Whether two arrays hold the very same values in the same order. */
function sameValues(
  actual: readonly unknown[],
  expected: readonly unknown[],
): boolean {
  return (
    actual.length === expected.length &&
    actual.every((value, i) => Object.is(value, expected[i]))
  );
}

describe.each<
  readonly [
    name: string,
    operation: (stack: CardStack, count?: number) => unknown,
  ]
>([
  ["draw", draw],
  ["drawBottom", drawBottom],
  ["peek", peek],
  ["peekBottom", peekBottom],
])("%s", (_name, operation) => {
  it("uses a count of 1 when the count is left out or undefined", () => {
    expect(operation(hand)).toStrictEqual(operation(hand, 1));
    expect(operation(hand, undefined)).toStrictEqual(operation(hand, 1));
  });

  it("counts -0 as 0", () => {
    expect(operation(hand, -0)).toStrictEqual(operation(hand, 0));
  });

  it("leaves the input unchanged, frozen or not", () => {
    fc.assert(
      fc.property(
        stacksWithCounts(),
        fc.boolean(),
        ({ count, stack: original }, frozen) => {
          const stack = frozen ? Object.freeze([...original]) : [...original];
          operation(stack, count);
          expect(sameValues(stack, original)).toBe(true);
          expect(Object.isFrozen(stack)).toBe(frozen);
        },
      ),
    );
  });

  it("throws with both counts when asked for more cards than the stack holds", () => {
    fc.assert(
      fc.property(
        stacksWithCounts(),
        fc.integer({ max: 1000, min: 1 }),
        ({ stack }, extra) => {
          const count = stack.length + extra;
          expect(thrownBy(() => operation(stack, count))).toMatchObject({
            available: stack.length,
            code: "INSUFFICIENT_CARDS",
            requested: count,
          });
        },
      ),
    );
  });

  it("throws for the default count on an empty stack", () => {
    expect(thrownBy(() => operation([]))).toMatchObject({
      available: 0,
      code: "INSUFFICIENT_CARDS",
      requested: 1,
    });
  });

  it("treats an integer too big to hold as too many cards, not a bad count", () => {
    expect(thrownBy(() => operation(hand, 2 ** 53))).toMatchObject({
      code: "INSUFFICIENT_CARDS",
      requested: 2 ** 53,
    });
  });

  it.each([
    ["a negative number", -1],
    ["a fraction", 1.5],
    ["NaN", NaN],
    ["Infinity", Infinity],
    ["-Infinity", -Infinity],
    ["a numeric string", "2"],
    ["null", null],
    ["a bigint", 2n],
    ["an array", [2]],
    ["an object", {}],
  ])("rejects %s as the count, even on an empty stack", (_label, count) => {
    for (const stack of [hand, []]) {
      expect(thrownBy(() => operation(stack, count as number))).toMatchObject({
        code: "INVALID_ARGUMENT",
      });
    }
  });

  it.each(nonArrays())("rejects %s as the stack", (_label, stack) => {
    expect(thrownBy(() => operation(asStack(stack), 1))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });
});

describe("draw", () => {
  it("gives the count asked for from the top, and what's left as the remainder", () => {
    fc.assert(
      fc.property(stacksWithCounts(), ({ count, stack }) => {
        const { cards, remainder } = draw(stack, count);
        expect(cards).toHaveLength(count);
        expect(sameValues([...cards, ...remainder], stack)).toBe(true);
      }),
    );
  });

  it("keeps every value of a stack of anything, in order", () => {
    fc.assert(
      fc.property(stacksOfAnything, ({ count, stack }) => {
        const { cards, remainder } = draw(stack, count);
        expect(cards).toHaveLength(count);
        expect(sameValues([...cards, ...remainder], stack)).toBe(true);
      }),
    );
  });

  it("draws only the topmost of several copies", () => {
    const { cards, remainder } = draw([ACE, ACE, KING], 1);
    expect(cards).toStrictEqual([ACE]);
    expect(remainder).toStrictEqual([ACE, KING]);
  });

  it.each([
    ["no cards", 0],
    ["one card", 1],
    ["every card", 3],
  ])("returns new frozen stacks in a frozen object for %s", (_label, count) => {
    const stack = Object.freeze([ACE, KING, TEN]);
    const result = draw(stack, count);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.cards)).toBe(true);
    expect(Object.isFrozen(result.remainder)).toBe(true);
    expect(result.cards).not.toBe(stack);
    expect(result.remainder).not.toBe(stack);
  });

  it("gives no cards and an empty remainder for no cards from an empty stack", () => {
    expect(draw([], 0)).toStrictEqual({ cards: [], remainder: [] });
  });
});

describe("drawBottom", () => {
  it("gives the count asked for from the bottom, and what's left as the remainder", () => {
    fc.assert(
      fc.property(stacksWithCounts(), ({ count, stack }) => {
        const { cards, remainder } = drawBottom(stack, count);
        expect(cards).toHaveLength(count);
        expect(sameValues([...remainder, ...cards], stack)).toBe(true);
      }),
    );
  });

  it("keeps every value of a stack of anything, in order", () => {
    fc.assert(
      fc.property(stacksOfAnything, ({ count, stack }) => {
        const { cards, remainder } = drawBottom(stack, count);
        expect(cards).toHaveLength(count);
        expect(sameValues([...remainder, ...cards], stack)).toBe(true);
      }),
    );
  });

  it("keeps the cards in stack order, so one at a time gives the opposite order", () => {
    expect(drawBottom(hand, 2).cards).toStrictEqual([KING, TEN]);
    const first = drawBottom(hand);
    const second = drawBottom(first.remainder);
    expect([...first.cards, ...second.cards]).toStrictEqual([TEN, KING]);
  });

  it("gives no cards and the whole stack as the remainder for a count of 0", () => {
    expect(drawBottom(hand, 0)).toStrictEqual({ cards: [], remainder: hand });
  });

  it.each([
    ["no cards", 0],
    ["one card", 1],
    ["every card", 3],
  ])("returns new frozen stacks in a frozen object for %s", (_label, count) => {
    const stack = Object.freeze([ACE, KING, TEN]);
    const result = drawBottom(stack, count);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.cards)).toBe(true);
    expect(Object.isFrozen(result.remainder)).toBe(true);
    expect(result.cards).not.toBe(stack);
    expect(result.remainder).not.toBe(stack);
  });
});

describe.each([
  ["peek", peek, draw],
  ["peekBottom", peekBottom, drawBottom],
])("%s", (_name, look, drawFrom) => {
  it("gives the cards that drawing the same count would", () => {
    fc.assert(
      fc.property(stacksWithCounts(), ({ count, stack }) => {
        expect(
          sameValues(look(stack, count), drawFrom(stack, count).cards),
        ).toBe(true);
      }),
    );
  });

  it.each([
    ["no cards", 0],
    ["one card", 1],
    ["every card", 3],
  ])("returns a new frozen stack for %s", (_label, count) => {
    const stack = Object.freeze([ACE, KING, TEN]);
    const looked = look(stack, count);
    expect(Object.isFrozen(looked)).toBe(true);
    expect(looked).not.toBe(stack);
  });
});

describe("peek", () => {
  it("looks from the top", () => {
    expect(peek(hand, 2)).toStrictEqual([ACE, KING]);
    expect(peek(hand)).toStrictEqual([ACE]);
  });
});

describe("peekBottom", () => {
  it("looks from the bottom, keeping stack order", () => {
    expect(peekBottom(hand, 2)).toStrictEqual([KING, TEN]);
    expect(peekBottom(hand)).toStrictEqual([TEN]);
  });

  it("gives no cards for a count of 0", () => {
    expect(peekBottom(hand, 0)).toStrictEqual([]);
  });
});
