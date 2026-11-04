/**
 * Maps every {@link DeckshoesErrorCode} to the error class that carries it.
 *
 * Use it to look up the error type for a code, for example when narrowing with
 * {@link isDeckshoesError}.
 *
 * @example
 * ```ts
 * import { type DeckshoesErrorMap, InsufficientCardsError } from "deckshoes";
 *
 * const error: DeckshoesErrorMap["INSUFFICIENT_CARDS"] =
 *   new InsufficientCardsError(3, 1);
 * error.available; // => 1
 * ```
 *
 * @since 1.0.0
 */
export interface DeckshoesErrorMap {
  /**
   * A count, index, seed or option was outside what the operation accepts, or
   * a random source misbehaved.
   */
  INVALID_ARGUMENT: InvalidArgumentError;
  /** A rank, suit or card string could not be recognised. */
  INVALID_CARD: InvalidCardError;
  /** An operation needed more cards than were available. */
  INSUFFICIENT_CARDS: InsufficientCardsError;
}

/**
 * The machine-readable code on every error deckshoes throws.
 *
 * Branch on the code rather than the message. Messages may be reworded in any
 * release; codes only change in a major release.
 *
 * @example
 * ```ts
 * import {
 *   type DeckshoesErrorCode,
 *   InvalidCardError,
 *   isDeckshoesError,
 * } from "deckshoes";
 *
 * function codeOf(error: unknown): DeckshoesErrorCode | undefined {
 *   return isDeckshoesError(error) ? error.code : undefined;
 * }
 *
 * codeOf(new InvalidCardError('Unknown card "ZZ"')); // => "INVALID_CARD"
 * codeOf(new Error("boom")); // => undefined
 * ```
 *
 * @since 1.0.0
 */
export type DeckshoesErrorCode = keyof DeckshoesErrorMap;

/**
 * Marks deckshoes errors so {@link isDeckshoesError} can recognise them even
 * when two installs of the package are loaded, where `instanceof` would fail.
 *
 * The key names the major version: each major can change codes and error
 * fields, so errors from another major must not be narrowed to this one's
 * types. Bump the suffix in every major release.
 */
const BRAND: unique symbol = Symbol.for("deckshoes.error.v1");

/**
 * Base class for every error deckshoes throws.
 *
 * Catch it to handle any deckshoes error, then check
 * {@link DeckshoesError.code | code} to tell them apart. To test an unknown
 * value, prefer {@link isDeckshoesError}, which also works across two installs
 * of the same major version.
 *
 * @example
 * ```ts
 * import { DeckshoesError, InsufficientCardsError } from "deckshoes";
 *
 * const error = new InsufficientCardsError(5, 2);
 * error instanceof DeckshoesError; // => true
 * error.code; // => "INSUFFICIENT_CARDS"
 * ```
 *
 * @since 1.0.0
 */
export abstract class DeckshoesError extends Error {
  static {
    Object.defineProperty(this.prototype, BRAND, { value: true });
  }

  /** The machine-readable code identifying this kind of error. */
  abstract readonly code: DeckshoesErrorCode;

  /** The error class name, shown in stack traces and logs. */
  override readonly name: string = "DeckshoesError";
}

/**
 * Thrown when a count, index, seed or option is outside what an operation
 * accepts, such as a negative number of cards or a cut position past the end of
 * a deck, or when a stack isn't an array. Also thrown when a random source
 * returns something other than a number from 0 up to 1, or keeps returning
 * values that have to be rejected.
 *
 * @example
 * ```ts
 * import { InvalidArgumentError } from "deckshoes";
 *
 * const error = new InvalidArgumentError("count must not be negative");
 * error.code; // => "INVALID_ARGUMENT"
 * error.message; // => "count must not be negative"
 * ```
 *
 * @since 1.0.0
 */
export class InvalidArgumentError extends DeckshoesError {
  /** Always `"INVALID_ARGUMENT"`. */
  override readonly code = "INVALID_ARGUMENT" as const;

  /** Always `"InvalidArgumentError"`. */
  override readonly name: string = "InvalidArgumentError";
}

/**
 * Thrown when a rank, suit or card string cannot be recognised.
 *
 * @example
 * ```ts
 * import { InvalidCardError } from "deckshoes";
 *
 * const error = new InvalidCardError('Unknown card "ZZ"');
 * error.code; // => "INVALID_CARD"
 * error.name; // => "InvalidCardError"
 * ```
 *
 * @since 1.0.0
 */
export class InvalidCardError extends DeckshoesError {
  /** Always `"INVALID_CARD"`. */
  override readonly code = "INVALID_CARD" as const;

  /** Always `"InvalidCardError"`. */
  override readonly name: string = "InvalidCardError";
}

/**
 * Thrown when an operation needs more cards than are available, such as
 * drawing five cards from a deck that holds two.
 *
 * @example
 * ```ts
 * import { InsufficientCardsError } from "deckshoes";
 *
 * const error = new InsufficientCardsError(5, 2);
 * error.requested; // => 5
 * error.available; // => 2
 * error.message; // => "Needed 5 cards but only 2 are available"
 * ```
 *
 * @since 1.0.0
 */
export class InsufficientCardsError extends DeckshoesError {
  /** How many cards are available. */
  readonly available: number;

  /** Always `"INSUFFICIENT_CARDS"`. */
  override readonly code = "INSUFFICIENT_CARDS" as const;

  /** Always `"InsufficientCardsError"`. */
  override readonly name: string = "InsufficientCardsError";

  /** How many cards the operation needed. */
  readonly requested: number;

  /**
   * Creates an error describing the shortfall.
   *
   * @param requested - How many cards the operation needed.
   * @param available - How many cards are available.
   * @param options - Standard error options, such as `cause`.
   */
  constructor(requested: number, available: number, options?: ErrorOptions) {
    super(
      `Needed ${String(requested)} ${requested === 1 ? "card" : "cards"} but only ${String(available)} ${available === 1 ? "is" : "are"} available`,
      options,
    );
    this.requested = requested;
    this.available = available;
  }
}

/**
 * Checks whether a value is an error thrown by deckshoes, optionally with a
 * specific {@link DeckshoesErrorCode}, and narrows its type to match.
 *
 * Unlike `instanceof`, this still works when an app ends up with two installs
 * of deckshoes, as long as they share a major version.
 *
 * @param error - The value to check, typically from a `catch` block.
 * @param code - If given, also require the error to have this code.
 * @returns `true` if `error` is a deckshoes error (with `code`, if given).
 *
 * @example
 * ```ts
 * import { InvalidArgumentError, isDeckshoesError } from "deckshoes";
 *
 * const error: unknown = new InvalidArgumentError("count must not be negative");
 * isDeckshoesError(error); // => true
 * isDeckshoesError(error, "INVALID_ARGUMENT"); // => true
 * isDeckshoesError(error, "INVALID_CARD"); // => false
 * isDeckshoesError(new Error("boom")); // => false
 * ```
 *
 * @since 1.0.0
 */
export function isDeckshoesError<
  C extends DeckshoesErrorCode = DeckshoesErrorCode,
>(error: unknown, code?: C): error is DeckshoesErrorMap[C] {
  return (
    typeof error === "object" &&
    error !== null &&
    BRAND in error &&
    error[BRAND] === true &&
    (code === undefined || ("code" in error && error.code === code))
  );
}
