import type { CardStack } from "../stack.ts";

import {
  InsufficientCardsError,
  InvalidArgumentError,
  InvalidCardError,
} from "../errors.ts";
import { display } from "./display.ts";

// Each check returns the error for a public function to throw itself, so that
// `jsdoc/require-throws` sees the `throw`, or `undefined` when the value is
// fine. Chain them with `??` to run them in order and throw the first problem.
// The `unknown…` functions and `notInOrder` only build the error, for a value
// a lookup has already failed to find.

/** Whether a value is an integer from `min` to `max`, the one test behind every count and size check. */
function isInteger(value: unknown, min: number, max = Infinity): boolean {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

/** Returns the error for cards that aren't an array, or `undefined` for cards that are. */
export function cardsProblem(value: unknown): InvalidArgumentError | undefined {
  return Array.isArray(value)
    ? undefined
    : new InvalidArgumentError(
        `Invalid cards ${display(value)}: expected an array of cards`,
      );
}

/** Returns the error for a count that isn't an integer from `min` to `max` (no limit if left out), or `undefined` for one that is. */
export function countProblem(
  value: unknown,
  name = "count",
  min = 0,
  max?: number,
): InvalidArgumentError | undefined {
  if (isInteger(value, min, max)) return undefined;
  const range =
    max === undefined
      ? `of ${String(min)} or more`
      : `from ${String(min)} to ${String(max)}`;
  return new InvalidArgumentError(
    `Invalid ${name} ${display(value)}: expected an integer ${range}`,
  );
}

/** Returns the error for an on/off option that isn't `true` or `false`, or `undefined` for one that is; `name` names the option in the message. */
export function flagProblem(
  value: unknown,
  name: string,
): InvalidArgumentError | undefined {
  return value === true || value === false
    ? undefined
    : new InvalidArgumentError(
        `Invalid ${name} option ${display(value)}: expected true or false`,
      );
}

/** Returns the error for options that aren't an object, or `undefined` for options that are; `example` shows valid options in the message. */
export function optionsProblem(
  value: unknown,
  example: string,
): InvalidArgumentError | undefined {
  return typeof value === "object" && value !== null
    ? undefined
    : new InvalidArgumentError(
        `Invalid options ${display(value)}: expected an object, such as ${example}`,
      );
}

/** Returns the error for a position that isn't an integer from 0 to `size` or one of the `named` values, or `undefined` for one that is; `constant` names their constant in the message. */
export function positionProblem(
  value: unknown,
  size: number,
  named: Readonly<Record<string, string>>,
  constant: string,
): InvalidArgumentError | undefined {
  const names = Object.keys(named);
  return isInteger(value, 0, size) ||
    names.some((name) => named[name] === value)
    ? undefined
    : new InvalidArgumentError(
        `Invalid position ${display(value)}: expected an integer from 0 to ${String(size)}, ${names.map((name) => `${constant}.${name}`).join(" or ")}`,
      );
}

/** Options with a `random` option, shown in the error for options that aren't an object by every operation that takes one. */
export const RANDOM_OPTIONS_EXAMPLE = "{ random: seededRandom(42) }";

/** Returns the error for a `random` option that's neither a function nor `undefined`, or `undefined` for one that is. */
export function randomProblem(
  value: unknown,
): InvalidArgumentError | undefined {
  return value === undefined || typeof value === "function"
    ? undefined
    : new InvalidArgumentError(
        `Invalid random option ${display(value)}: expected a random source, a function returning a number from 0 up to 1`,
      );
}

/** Returns the error for a stack holding fewer than `needed` cards, or `undefined` for one holding enough. */
export function shortfall(
  needed: number,
  stack: CardStack<unknown>,
): InsufficientCardsError | undefined {
  return needed > stack.length
    ? new InsufficientCardsError(needed, stack.length)
    : undefined;
}

/** Returns the error for a size that isn't an integer of 1 or more or the `named` value, or `undefined` for one that is; `constant` names the value in the message. */
export function sizeProblem(
  value: unknown,
  name: string,
  named: string,
  constant: string,
): InvalidArgumentError | undefined {
  return value === named || isInteger(value, 1)
    ? undefined
    : new InvalidArgumentError(
        `Invalid ${name} ${display(value)}: expected an integer of 1 or more, or ${constant}`,
      );
}

/** Returns the error for a stack that isn't an array, or `undefined` for one that is. */
export function stackProblem(value: unknown): InvalidArgumentError | undefined {
  return Array.isArray(value)
    ? undefined
    : new InvalidArgumentError(
        `Invalid stack ${display(value)}: expected an array of cards`,
      );
}

/** Returns the error for a card, named as `name`, whose rank or suit has no place in its order; `verb` says what couldn't be done to it. */
export function notInOrder(
  verb: string,
  name: string,
  kind: "rank" | "suit",
  value: unknown,
): InvalidArgumentError {
  return new InvalidArgumentError(
    `Can't ${verb} ${name}: its ${kind} ${display(value)} isn't in the ${kind} order`,
  );
}

/** Returns the error for a rank that isn't a standard rank. */
export function unknownRank(value: unknown): InvalidCardError {
  return new InvalidCardError(
    `Unknown rank ${display(value)}: expected "A", "2" to "10", "J", "Q" or "K"`,
  );
}

/** Returns the error for a suit that isn't a standard suit. */
export function unknownSuit(value: unknown): InvalidCardError {
  return new InvalidCardError(
    `Unknown suit ${display(value)}: expected "S", "H", "D" or "C"`,
  );
}
