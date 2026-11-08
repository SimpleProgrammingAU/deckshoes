import { describe, expect, it } from "vitest";

import {
  countProblem,
  optionsProblem,
  shortfall,
  stackProblem,
} from "./checks.ts";

describe("countProblem", () => {
  it("accepts an integer in range, counting -0 as 0", () => {
    expect(countProblem(0)).toBeUndefined();
    expect(countProblem(-0)).toBeUndefined();
    expect(countProblem(2 ** 53)).toBeUndefined();
    expect(countProblem(1, "hand count", 1, 1)).toBeUndefined();
  });

  it("gives a minimum alone when there's no maximum", () => {
    expect(countProblem(-1)?.message).toBe(
      "Invalid count -1: expected an integer of 0 or more",
    );
  });

  it("names the count and gives the range when there's a maximum", () => {
    expect(countProblem(2 ** 32, "hand count", 1, 2 ** 32 - 1)?.message).toBe(
      "Invalid hand count 4294967296: expected an integer from 1 to 4294967295",
    );
  });
});

describe("optionsProblem", () => {
  it("shows the example it's given", () => {
    expect(optionsProblem(null, "{ packetSize: 3 }")?.message).toBe(
      "Invalid options null: expected an object, such as { packetSize: 3 }",
    );
    expect(optionsProblem({}, "{ packetSize: 3 }")).toBeUndefined();
  });
});

describe("shortfall", () => {
  it("gives both counts only when the stack holds too few", () => {
    expect(shortfall(3, [1, 2])).toMatchObject({
      available: 2,
      code: "INSUFFICIENT_CARDS",
      requested: 3,
    });
    expect(shortfall(2, [1, 2])).toBeUndefined();
  });
});

describe("stackProblem", () => {
  it("accepts any array and rejects anything else", () => {
    expect(stackProblem([])).toBeUndefined();
    expect(stackProblem("AS")).toMatchObject({ code: "INVALID_ARGUMENT" });
  });
});
