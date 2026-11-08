import type { CardStack } from "../stack.ts";

import { InsufficientCardsError, InvalidArgumentError } from "../errors.ts";
import { display } from "./display.ts";

// Each check returns the error for a public function to throw itself, so that
// `jsdoc/require-throws` sees the `throw`, or `undefined` when the value is
// fine. Chain them with `??` to run them in order and throw the first problem.

/** Returns the error for a count that isn't an integer from `min` to `max` (no limit if left out), or `undefined` for one that is. */
export function countProblem(
  value: unknown,
  name = "count",
  min = 0,
  max?: number,
): InvalidArgumentError | undefined {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    (max === undefined || value <= max)
  ) {
    return undefined;
  }
  const range =
    max === undefined
      ? `of ${String(min)} or more`
      : `from ${String(min)} to ${String(max)}`;
  return new InvalidArgumentError(
    `Invalid ${name} ${display(value)}: expected an integer ${range}`,
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
  return value === named ||
    (typeof value === "number" && Number.isInteger(value) && value >= 1)
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
