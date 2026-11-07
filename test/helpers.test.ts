import { describe, expect, it } from "vitest";

import { thrownBy } from "./helpers.ts";

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
