import type { CardStack } from "../stack.ts";

import { InvalidArgumentError } from "../errors.ts";
import { display } from "./display.ts";

/** Copies part of a stack into a new plain array: spreading first means a subclass's `slice`, species and constructor never run. */
export function copyStack<C>(
  stack: CardStack<C>,
  start?: number,
  end?: number,
): C[] {
  return [...stack].slice(start, end);
}

/** Returns the error for a count that isn't an integer of 0 or more, for a public function to throw itself. */
export function invalidCount(value: unknown): InvalidArgumentError {
  return new InvalidArgumentError(
    `Invalid count ${display(value)}: expected an integer of 0 or more`,
  );
}

/** Returns the error for a stack that isn't an array, for a public function to throw itself. */
export function invalidStack(value: unknown): InvalidArgumentError {
  return new InvalidArgumentError(
    `Invalid stack ${display(value)}: expected an array of cards`,
  );
}
