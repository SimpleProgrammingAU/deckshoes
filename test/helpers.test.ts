import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  arraySubclasses,
  counted,
  isPlainFrozen,
  nonArrays,
  stacks,
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

// A subclass that stopped misbehaving would still pass every operation's test,
// so this is what notices the tests no longer test anything.
describe("arraySubclasses", () => {
  it("has each kind of subclass", () => {
    expect(arraySubclasses().map(([label]) => label)).toStrictEqual([
      "a subclass whose constructor takes cards",
      "a bare subclass",
      "a subclass with Object as its species",
      "a subclass whose slice loses the cards",
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
      const sliced = (): unknown => {
        try {
          return stack.slice();
        } catch (error) {
          return error;
        }
      };
      expect(sliced()).not.toStrictEqual(["a", "b"]);
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
