import { describe, expectTypeOf, it } from "vitest";

import {
  type DeckshoesError,
  type DeckshoesErrorCode,
  type InsufficientCardsError,
  type InvalidArgumentError,
  type InvalidCardError,
  isDeckshoesError,
} from "./errors.ts";

describe("isDeckshoesError", () => {
  it("narrows to the union of deckshoes errors without a code", () => {
    const error: unknown = undefined;
    if (!isDeckshoesError(error)) return;
    expectTypeOf(error).toEqualTypeOf<
      InsufficientCardsError | InvalidArgumentError | InvalidCardError
    >();
    expectTypeOf(error).toExtend<DeckshoesError>();
    expectTypeOf(error.code).toEqualTypeOf<DeckshoesErrorCode>();
  });

  it("narrows to the matching class when given a code", () => {
    const error: unknown = undefined;
    if (!isDeckshoesError(error, "INSUFFICIENT_CARDS")) return;
    expectTypeOf(error).toEqualTypeOf<InsufficientCardsError>();
    expectTypeOf(error.requested).toBeNumber();
  });

  it("only accepts known codes", () => {
    expectTypeOf(isDeckshoesError)
      .parameter(1)
      .toEqualTypeOf<DeckshoesErrorCode | undefined>();
    // @ts-expect-error "NOT_A_CODE" is not a DeckshoesErrorCode
    isDeckshoesError(new Error("x"), "NOT_A_CODE");
  });
});

describe("DeckshoesErrorCode", () => {
  it("is the union of every code", () => {
    expectTypeOf<DeckshoesErrorCode>().toEqualTypeOf<
      "INSUFFICIENT_CARDS" | "INVALID_ARGUMENT" | "INVALID_CARD"
    >();
  });
});
