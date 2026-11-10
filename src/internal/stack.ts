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

/** Takes the topmost copy of each of `cards` out of a stack by index, matching as `includes` does, and returns the cards left and the index in `cards` of the first one with no copy left, or -1 when every one had a copy. */
export function removeTopmost<C>(
  stack: CardStack<C>,
  cards: CardStack<C>,
): { left: C[]; missing: number } {
  // How many copies of each card are still to be removed. A Map compares keys
  // with SameValueZero, as `includes` does.
  const wanted = new Map<C, number>();
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i] as C;
    wanted.set(card, (wanted.get(card) ?? 0) + 1);
  }

  const left: C[] = [];
  for (let i = 0; i < stack.length; i++) {
    const card = stack[i] as C;
    const still = wanted.get(card) ?? 0;
    if (still > 0) wanted.set(card, still - 1);
    else left.push(card);
  }

  // Copies are interchangeable, so the entries with no copy are the last of
  // each card's entries, as many as `wanted` still holds for it. Walking back
  // from the end marks them, and the last one marked comes first in `cards`.
  let missing = -1;
  for (let i = cards.length - 1; i >= 0; i--) {
    const card = cards[i] as C;
    const short = wanted.get(card) ?? 0;
    if (short > 0) {
      wanted.set(card, short - 1);
      missing = i;
    }
  }
  return { left, missing };
}
