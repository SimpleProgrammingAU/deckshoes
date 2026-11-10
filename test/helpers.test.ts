import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  arraySubclasses,
  counted,
  deals,
  isPlainFrozen,
  nonArrays,
  sameValues,
  sparseStacks,
  stacks,
  stacksWithCards,
  stacksWithCounts,
  thrownBy,
} from "./helpers.ts";

describe("thrownBy", () => {
  it("returns what the function throws", () => {
    const error = new Error("thrown");
    expect(
      thrownBy(() => {
        throw error;
      }),
    ).toBe(error);
  });

  it("fails the test when nothing is thrown", () => {
    expect(() => thrownBy(() => "returned")).toThrow(
      "Expected a throw, but nothing was thrown",
    );
  });
});

describe("sameValues", () => {
  it("accepts the very same values in the same order, NaN included", () => {
    const ace = { rank: "A" };
    expect(sameValues([ace, NaN], [ace, NaN])).toBe(true);
    expect(sameValues([], [])).toBe(true);
  });

  it.each([
    ["a different length", ["a"], ["a", "b"]],
    ["a different order", ["a", "b"], ["b", "a"]],
    ["an equal copy of an object", [{ rank: "A" }], [{ rank: "A" }]],
    ["0 against -0", [0], [-0]],
  ])("rejects %s", (_label, actual, expected) => {
    expect(sameValues(actual, expected)).toBe(false);
  });

  it("reads a hole as undefined, rather than skipping it", () => {
    const holey: unknown[] = [];
    holey[1] = "a";
    expect(sameValues(holey, [undefined, "a"])).toBe(true);
    expect(sameValues(holey, ["b", "a"])).toBe(false);
  });
});

describe("counted", () => {
  it.each([
    ["a number", 0.5],
    ["NaN", NaN],
    ["a string", "0.5"],
    ["undefined", undefined],
  ])("returns %s when next does", (_label, value) => {
    expect(counted(() => value)()).toBe(value);
  });

  it("counts every call, starting from 0", () => {
    const random = counted(() => 0);
    expect(random.calls).toBe(0);
    random();
    random();
    expect(random.calls).toBe(2);
  });

  it("counts a call where next throws", () => {
    const random = counted(() => {
      throw new Error("thrown");
    });
    expect(() => random()).toThrow("thrown");
    expect(random.calls).toBe(1);
  });
});

// `it.each(nonArrays())` runs nothing for a missing entry, and a narrower
// `stacks()` or `stacksWithCounts()` still passes, so these are what notice
// any of them.
describe("nonArrays", () => {
  it("has each kind of value, and none is an array", () => {
    const entries = nonArrays();
    expect(entries.map(([label]) => label)).toStrictEqual([
      "undefined",
      "null",
      "a string",
      "a one-character string",
      "a Set",
      "an array-like object",
    ]);
    expect(entries.filter(([, value]) => Array.isArray(value))).toStrictEqual(
      [],
    );
  });
});

/** What `copy` returns, or what it throws. */
function attempted(copy: () => unknown): unknown {
  try {
    return copy();
  } catch (error) {
    return error;
  }
}

// A subclass that stopped misbehaving would still pass every operation's test,
// so this is what notices the tests no longer test anything.
describe("arraySubclasses", () => {
  it("has each kind of subclass", () => {
    expect(arraySubclasses().map(([label]) => label)).toStrictEqual([
      "a subclass whose constructor takes a stack",
      "a bare subclass",
      "a subclass with Object as its species",
      "a subclass whose slice loses the cards",
      "a subclass whose iterator loses the cards",
      "a subclass with no iterator",
    ]);
  });

  it.each(arraySubclasses())(
    "%s is an array holding the cards",
    (_label, make) => {
      const stack = make(["a", "b"]);
      expect(Array.isArray(stack)).toBe(true);
      expect(stack).toHaveLength(2);
      expect(stack[0]).toBe("a");
      expect(stack[1]).toBe("b");
    },
  );

  it.each(arraySubclasses())(
    "%s doesn't give a plain copy from slice",
    (_label, make) => {
      const stack = make(["a", "b"]);
      expect(attempted(() => stack.slice())).not.toStrictEqual(["a", "b"]);
    },
  );

  it.each(arraySubclasses().filter(([label]) => label.includes("iterator")))(
    "%s doesn't give the cards from a spread",
    (_label, make) => {
      const stack = make(["a", "b"]);
      expect(attempted(() => [...stack])).not.toStrictEqual(["a", "b"]);
    },
  );
});

describe("isPlainFrozen", () => {
  it("accepts a frozen array", () => {
    expect(isPlainFrozen(Object.freeze(["a"]))).toBe(true);
    expect(isPlainFrozen(Object.freeze([]))).toBe(true);
  });

  it.each([
    ["an unfrozen array", ["a"]],
    ["a frozen subclass", Object.freeze(new (class extends Array {})())],
    [
      "a frozen non-array on the array prototype",
      Object.freeze(Object.create(Array.prototype)),
    ],
    ["a frozen object", Object.freeze({})],
    ["undefined", undefined],
  ])("rejects %s", (_label, value) => {
    expect(isPlainFrozen(value)).toBe(false);
  });
});

describe("stacks", () => {
  it("gives empty stacks, stacks longer than a deck, and every standard card", () => {
    // Seeded, because this checks what the arbitrary gives, not a property.
    const samples = fc.sample(stacks(), { numRuns: 1000, seed: 42 });
    const lengths = samples.map((stack) => stack.length);
    expect(Math.min(...lengths)).toBe(0);
    expect(Math.max(...lengths)).toBeGreaterThan(52);
    expect(Math.max(...lengths)).toBeLessThanOrEqual(104);
    expect(new Set(samples.flat()).size).toBe(52);
  });
});

describe("sparseStacks", () => {
  it("gives stacks with a hole, including at the top, and none too big to copy", () => {
    // Seeded, because this checks what the arbitrary gives, not a property.
    const samples = fc.sample(sparseStacks(), { numRuns: 1000, seed: 42 });
    expect(
      samples.some((stack) => Object.keys(stack).length < stack.length),
    ).toBe(true);
    // A shuffle writes to every slot but the top, so only this hole can survive one.
    expect(samples.some((stack) => stack.length > 1 && !(0 in stack))).toBe(
      true,
    );
    expect(
      Math.max(...samples.map((stack) => stack.length)),
    ).toBeLessThanOrEqual(104);
  });
});

describe("stacksWithCounts", () => {
  it("gives counts of none, of every card and in between, but never past the stack", () => {
    // Seeded, because this checks what the arbitrary gives, not a property.
    const samples = fc.sample(stacksWithCounts(), { numRuns: 1000, seed: 42 });
    expect(
      samples.filter(({ count, stack }) => count < 0 || count > stack.length),
    ).toStrictEqual([]);
    expect(
      samples.some(({ count, stack }) => count === 0 && stack.length > 0),
    ).toBe(true);
    expect(
      samples.some(({ count, stack }) => count > 0 && count === stack.length),
    ).toBe(true);
    expect(
      samples.some(({ count, stack }) => count > 0 && count < stack.length),
    ).toBe(true);
  });

  it("takes its stacks from the arbitrary it's given", () => {
    const samples = fc.sample(stacksWithCounts(fc.constant(["a", "b"])), {
      numRuns: 100,
      seed: 42,
    });
    expect(samples.every(({ stack }) => stack.length === 2)).toBe(true);
    expect(new Set(samples.map(({ count }) => count))).toStrictEqual(
      new Set([0, 1, 2]),
    );
  });
});

describe("stacksWithCards", () => {
  /** Whether each of `cards` has a copy in the stack that the cards before it haven't taken. */
  function pickedFrom(
    cards: readonly unknown[],
    stack: readonly unknown[],
  ): boolean {
    const left = [...stack];
    for (const picked of cards) {
      const i = left.indexOf(picked);
      if (i === -1) return false;
      left.splice(i, 1);
    }
    return true;
  }

  it("gives none of the stack's cards, all of them and some, never more copies than it holds", () => {
    // Seeded, because this checks what the arbitrary gives, not a property.
    const samples = fc.sample(stacksWithCards(), { numRuns: 1000, seed: 42 });
    expect(
      samples.filter(({ cards, stack }) => !pickedFrom(cards, stack)),
    ).toStrictEqual([]);
    expect(
      samples.some(
        ({ cards, stack }) => cards.length === 0 && stack.length > 0,
      ),
    ).toBe(true);
    expect(
      samples.some(
        ({ cards, stack }) => cards.length > 0 && cards.length === stack.length,
      ),
    ).toBe(true);
    expect(
      samples.some(
        ({ cards, stack }) => cards.length > 0 && cards.length < stack.length,
      ),
    ).toBe(true);
  });

  it("takes its stacks from the arbitrary it's given, and picks in any order", () => {
    const samples = fc.sample(stacksWithCards(fc.constant(["a", "b"])), {
      numRuns: 100,
      seed: 42,
    });
    expect(samples.every(({ stack }) => sameValues(stack, ["a", "b"]))).toBe(
      true,
    );
    expect(new Set(samples.map(({ cards }) => cards.join("")))).toStrictEqual(
      new Set(["", "a", "b", "ab", "ba"]),
    );
  });
});

describe("deals", () => {
  it("gives one hand and several, every card dealt and some left, but never more than the deck holds", () => {
    // Seeded, because this checks what the arbitrary gives, not a property.
    const samples = fc.sample(deals(), { numRuns: 1000, seed: 42 });
    expect(
      samples.filter(
        ({ deck, handCount, handSize }) =>
          handCount < 1 || handSize < 1 || handCount * handSize > deck.length,
      ),
    ).toStrictEqual([]);
    expect(samples.some(({ handCount }) => handCount === 1)).toBe(true);
    expect(samples.some(({ handCount }) => handCount > 1)).toBe(true);
    expect(
      samples.some(
        ({ deck, handCount, handSize }) => handCount * handSize === deck.length,
      ),
    ).toBe(true);
    expect(
      samples.some(
        ({ deck, handCount, handSize }) => handCount * handSize < deck.length,
      ),
    ).toBe(true);
  });

  it("leaves the packet size out, and gives ones smaller and bigger than the hand", () => {
    const samples = fc.sample(deals(), { numRuns: 1000, seed: 42 });
    expect(samples.some(({ packetSize }) => packetSize === undefined)).toBe(
      true,
    );
    expect(
      samples.some(
        ({ handSize, packetSize }) =>
          packetSize !== undefined && packetSize > 1 && packetSize < handSize,
      ),
    ).toBe(true);
    expect(
      samples.some(
        ({ handSize, packetSize }) =>
          packetSize !== undefined && packetSize > handSize,
      ),
    ).toBe(true);
  });

  it("takes its decks from the arbitrary it's given", () => {
    const samples = fc.sample(deals(fc.constant(["a", "b"])), {
      numRuns: 100,
      seed: 42,
    });
    expect(samples.every(({ deck }) => deck.length === 2)).toBe(true);
    expect(
      new Set(
        samples.map(({ handCount, handSize }) => String([handCount, handSize])),
      ),
    ).toStrictEqual(new Set(["1,1", "1,2", "2,1"]));
  });
});
