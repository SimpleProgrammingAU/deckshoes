import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { counted, nonArrays, stacks, thrownBy } from "./helpers.ts";

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
// `stacks()` still passes, so these are what notice either one.
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
