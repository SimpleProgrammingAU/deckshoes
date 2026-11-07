import type { CardStack } from "../stack.ts";

import { InvalidArgumentError } from "../errors.ts";
import { display } from "./display.ts";

/** Copies part of a stack into a new plain array by index, so nothing on the array (`slice`, species, constructor, iterator) can change what's copied. */
export function copyStack<C>(
  stack: CardStack<C>,
  start = 0,
  end: number = stack.length,
): C[] {
  // eslint-disable-next-line unicorn/no-new-array -- sized up front, because growing a literal with push is slower
  const copy = new Array<C>(end - start);
  for (let i = start; i < end; i++) copy[i - start] = stack[i] as C;
  return copy;
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
