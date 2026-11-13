import { describe, expect, it } from "vitest";

import {
  cardsProblem,
  countProblem,
  flagProblem,
  notInOrder,
  optionsProblem,
  positionProblem,
  randomProblem,
  shortfall,
  sizeProblem,
  stackProblem,
  unknownRank,
  unknownSuit,
} from "./checks.ts";

describe("cardsProblem", () => {
  it("accepts any array and names anything else as the cards", () => {
    expect(cardsProblem([])).toBeUndefined();
    expect(cardsProblem("AS")).toMatchObject({
      code: "INVALID_ARGUMENT",
      message: 'Invalid cards "AS": expected an array of cards',
    });
  });
});

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

describe("flagProblem", () => {
  it("accepts true and false, and names any other value's option", () => {
    expect(flagProblem(true, "lowercase")).toBeUndefined();
    expect(flagProblem(false, "lowercase")).toBeUndefined();
    expect(flagProblem("yes", "lowercase")).toMatchObject({
      code: "INVALID_ARGUMENT",
      message: 'Invalid lowercase option "yes": expected true or false',
    });
  });
});

describe("notInOrder", () => {
  it("names the card, what couldn't be done to it, and the trait the order lacks", () => {
    expect(notInOrder("sort", "stack[3]", "rank", "11")).toMatchObject({
      code: "INVALID_ARGUMENT",
      message: `Can't sort stack[3]: its rank "11" isn't in the rank order`,
    });
    expect(notInOrder("compare", "b", "suit", undefined).message).toBe(
      "Can't compare b: its suit undefined isn't in the suit order",
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

describe("positionProblem", () => {
  // Written out rather than imported, so the test doesn't share cut.ts's values.
  const named = { BOTTOM: "bottom", RANDOM: "random" };

  it("accepts an integer from 0 to the size, counting -0 as 0, and every named value", () => {
    expect(positionProblem(0, 0, named, "Position")).toBeUndefined();
    expect(positionProblem(-0, 3, named, "Position")).toBeUndefined();
    expect(positionProblem(3, 3, named, "Position")).toBeUndefined();
    expect(positionProblem("bottom", 0, named, "Position")).toBeUndefined();
    expect(positionProblem("random", 0, named, "Position")).toBeUndefined();
  });

  it("rejects a key in place of its value, and a value it isn't given", () => {
    expect(positionProblem("BOTTOM", 3, named, "Position")).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
    expect(
      positionProblem("random", 3, { BOTTOM: "bottom" }, "Position"),
    ).toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it("gives the range and names each named value by its constant", () => {
    expect(positionProblem(4, 3, named, "Position")).toMatchObject({
      code: "INVALID_ARGUMENT",
      message:
        "Invalid position 4: expected an integer from 0 to 3, Position.BOTTOM or Position.RANDOM",
    });
    expect(positionProblem("top", 3, named, "Position")?.message).toBe(
      'Invalid position "top": expected an integer from 0 to 3, Position.BOTTOM or Position.RANDOM',
    );
  });
});

describe("randomProblem", () => {
  it("accepts a function or undefined, and describes a random source for anything else", () => {
    expect(randomProblem(undefined)).toBeUndefined();
    expect(randomProblem(() => 0)).toBeUndefined();
    expect(randomProblem(42)).toMatchObject({
      code: "INVALID_ARGUMENT",
      message:
        "Invalid random option 42: expected a random source, a function returning a number from 0 up to 1",
    });
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

describe("sizeProblem", () => {
  it("accepts an integer of 1 or more, or the named value", () => {
    expect(
      sizeProblem(1, "hand size", "maximize", "HandSize.MAXIMIZE"),
    ).toBeUndefined();
    expect(
      sizeProblem(2 ** 53, "hand size", "maximize", "HandSize.MAXIMIZE"),
    ).toBeUndefined();
    expect(
      sizeProblem("maximize", "hand size", "maximize", "HandSize.MAXIMIZE"),
    ).toBeUndefined();
  });

  it("names the size and offers the constant", () => {
    expect(
      sizeProblem(0, "hand size", "maximize", "HandSize.MAXIMIZE")?.message,
    ).toBe(
      "Invalid hand size 0: expected an integer of 1 or more, or HandSize.MAXIMIZE",
    );
    expect(
      sizeProblem("hand", "hand size", "maximize", "HandSize.MAXIMIZE")
        ?.message,
    ).toBe(
      'Invalid hand size "hand": expected an integer of 1 or more, or HandSize.MAXIMIZE',
    );
  });
});

describe("stackProblem", () => {
  it("accepts any array and rejects anything else", () => {
    expect(stackProblem([])).toBeUndefined();
    expect(stackProblem("AS")).toMatchObject({ code: "INVALID_ARGUMENT" });
  });
});

describe("unknownRank and unknownSuit", () => {
  // card.test.ts checks the messages, through card().
  it("give an INVALID_CARD error", () => {
    expect(unknownRank("11")).toMatchObject({ code: "INVALID_CARD" });
    expect(unknownSuit("X")).toMatchObject({ code: "INVALID_CARD" });
  });
});
