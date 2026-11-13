import type { CardStack } from "../stack.ts";

/** A card's key, which orders cards as the rank and suit orders do, or which of its traits has no place in its order, and that trait's value. */
export type Keyed =
  | { readonly key: number }
  | { readonly missing: "rank" | "suit"; readonly value: unknown };

/** Maps each entry of an order that has passed `orderProblem` to its place, from 0 for the lowest, reading the order by index. */
export function placesIn(
  order: readonly unknown[],
): ReadonlyMap<unknown, number> {
  const places = new Map<unknown, number>();
  const size = order.length;
  for (let i = 0; i < size; i++) places.set(order[i], i);
  return places;
}

/** Finds a card's key: its rank's place times the suit order's size, plus its suit's place, leaving out an order that's `undefined`; reads the rank, then the suit, once each, and a hole, `null` or a primitive finds no place rather than throwing. */
export function keyOf(
  card: unknown,
  ranks: ReadonlyMap<unknown, number> | undefined,
  suits: ReadonlyMap<unknown, number> | undefined,
): Keyed {
  const traits = card as
    { readonly rank?: unknown; readonly suit?: unknown } | null | undefined;
  let key = 0;
  if (ranks !== undefined) {
    const rank = traits?.rank;
    const place = ranks.get(rank);
    if (place === undefined) return { missing: "rank", value: rank };
    key = place;
  }
  if (suits !== undefined) {
    const suit = traits?.suit;
    const place = suits.get(suit);
    if (place === undefined) return { missing: "suit", value: suit };
    key = key * suits.size + place;
  }
  return { key };
}

/** Sorts a stack's cards, read by index, into buckets by key, each in stack order, creating a bucket only when a card needs it; or gives the index of the first card with no key, and why. */
export function intoBuckets<C>(
  stack: CardStack<C>,
  ranks: ReadonlyMap<unknown, number> | undefined,
  suits: ReadonlyMap<unknown, number> | undefined,
):
  | { readonly buckets: readonly (C[] | undefined)[] }
  | (Extract<Keyed, { missing: unknown }> & { readonly index: number }) {
  const buckets: (C[] | undefined)[] = [];
  const size = stack.length;
  for (let i = 0; i < size; i++) {
    const card = stack[i] as C;
    const keyed = keyOf(card, ranks, suits);
    if ("missing" in keyed) return { ...keyed, index: i };
    (buckets[keyed.key] ??= []).push(card);
  }
  return { buckets };
}

/** Turns buckets into one new frozen stack for each of an order's `size` places, empty where no card needed a bucket, in a new frozen array. */
export function groupsOf<C>(
  buckets: readonly (C[] | undefined)[],
  size: number,
): readonly CardStack<C>[] {
  const groups: CardStack<C>[] = [];
  for (let i = 0; i < size; i++) groups.push(Object.freeze(buckets[i] ?? []));
  return Object.freeze(groups);
}
