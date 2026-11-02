import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  DeckshoesError,
  type DeckshoesErrorCode,
  InsufficientCardsError,
  InvalidArgumentError,
  InvalidCardError,
  isDeckshoesError,
} from "./errors.ts";

const cases = [
  {
    code: "INVALID_ARGUMENT",
    create: () => new InvalidArgumentError("bad count"),
    name: "InvalidArgumentError",
    type: InvalidArgumentError,
  },
  {
    code: "INVALID_CARD",
    create: () => new InvalidCardError("bad card"),
    name: "InvalidCardError",
    type: InvalidCardError,
  },
  {
    code: "INSUFFICIENT_CARDS",
    create: () => new InsufficientCardsError(3, 1),
    name: "InsufficientCardsError",
    type: InsufficientCardsError,
  },
] as const;

describe.each(cases)("$name", ({ code, create, name, type }) => {
  it("is an Error, a DeckshoesError and its own class", () => {
    const error = create();
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DeckshoesError);
    expect(error).toBeInstanceOf(type);
  });

  it(`has code ${code} and name ${name}`, () => {
    const error = create();
    expect(error.code).toBe(code);
    expect(error.name).toBe(name);
    expect(String(error)).toMatch(new RegExp(`^${name}: `, "u"));
  });

  it("is recognised by isDeckshoesError with and without its code", () => {
    const error = create();
    expect(isDeckshoesError(error)).toBe(true);
    expect(isDeckshoesError(error, code)).toBe(true);
  });

  it("is not matched by isDeckshoesError for any other code", () => {
    const others = cases.map((c) => c.code).filter((c) => c !== code);
    for (const other of others) {
      expect(isDeckshoesError(create(), other)).toBe(false);
    }
  });
});

describe("error options", () => {
  it("passes cause through to Error", () => {
    const cause = new Error("root cause");
    expect(new InvalidArgumentError("wrapped", { cause }).cause).toBe(cause);
    expect(new InsufficientCardsError(2, 0, { cause }).cause).toBe(cause);
  });
});

describe("InsufficientCardsError", () => {
  it("records what was requested and what was available", () => {
    const error = new InsufficientCardsError(5, 2);
    expect(error.requested).toBe(5);
    expect(error.available).toBe(2);
  });

  it.each([
    [1, 0, "Needed 1 card but only 0 are available"],
    [2, 1, "Needed 2 cards but only 1 is available"],
    [52, 13, "Needed 52 cards but only 13 are available"],
  ])("formats requested=%i available=%i", (requested, available, message) => {
    expect(new InsufficientCardsError(requested, available).message).toBe(
      message,
    );
  });
});

describe("isDeckshoesError", () => {
  it("rejects anything that is not a deckshoes error", () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        expect(isDeckshoesError(value)).toBe(false);
      }),
    );
  });

  it("rejects look-alikes that only copy the code", () => {
    const fake = Object.assign(new Error("fake"), {
      code: "INVALID_CARD" satisfies DeckshoesErrorCode,
    });
    expect(isDeckshoesError(fake)).toBe(false);
    expect(isDeckshoesError(fake, "INVALID_CARD")).toBe(false);
  });

  /** Builds an error-like object branded the way another copy would brand it. */
  function foreignError(brand: string, value: unknown): object {
    const prototype = Object.assign(Object.create(Error.prototype) as object, {
      [Symbol.for(brand)]: value,
    });
    return Object.assign(Object.create(prototype) as object, {
      code: "INVALID_CARD",
    });
  }

  it("recognises errors from another copy of the same major version", () => {
    const foreign = foreignError("deckshoes.error.v1", true);
    expect(isDeckshoesError(foreign)).toBe(true);
    expect(isDeckshoesError(foreign, "INVALID_CARD")).toBe(true);
    expect(isDeckshoesError(foreign, "INVALID_ARGUMENT")).toBe(false);
  });

  it.each([
    ["another major version", "deckshoes.error.v2", true],
    ["an unversioned brand", "deckshoes.error", true],
    ["a brand set to false", "deckshoes.error.v1", false],
    ["a brand set to a truthy non-boolean", "deckshoes.error.v1", 1],
  ])("rejects errors with %s", (_label, brand, value) => {
    expect(isDeckshoesError(foreignError(brand, value))).toBe(false);
  });
});
