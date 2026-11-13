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
