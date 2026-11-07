import { describe, expect, it } from "vitest";

import { counted, thrownBy } from "./helpers.ts";

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
