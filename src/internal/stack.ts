import type { CardStack } from "../stack.ts";

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
