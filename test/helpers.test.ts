import { describe, expect, it } from "vitest";

import { counted, integerSource, thrownBy } from "./helpers.ts";

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

describe("integerSource", () => {
  it("returns each integer in turn as a value from 0 up to 1", () => {
    const random = integerSource(0, 2 ** 31, 2 ** 32 - 1);
    expect([random(), random(), random()]).toStrictEqual([
      0,
      0.5,
      1 - 2 ** -32,
    ]);
  });

  it("fails the test when it's called too often", () => {
    const random = integerSource(0);
    random();
    expect(() => random()).toThrow("The source was called too often");
    expect(() => integerSource()()).toThrow("The source was called too often");
  });

  it("works inside counted, which counts the call that fails too", () => {
    const random = counted(integerSource(0));
    random();
    expect(random.calls).toBe(1);
    expect(() => random()).toThrow("The source was called too often");
    expect(random.calls).toBe(2);
  });
});
