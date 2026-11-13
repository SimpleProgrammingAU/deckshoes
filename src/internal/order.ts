import type { CardStack } from "../stack.ts";

import { InvalidArgumentError } from "../errors.ts";
import { notInOrder, optionsProblem } from "./checks.ts";
import { display } from "./display.ts";

/** Each entry of a rank or suit order, mapped to its place, from 0 for the lowest. */
export type Places = ReadonlyMap<unknown, number>;

/** A card's key, which puts cards in the order the rank and suit orders give, or which of its traits has no place in its order, and that trait's value. */
type Keyed =
  | { readonly key: number }
  | { readonly missing: "rank" | "suit"; readonly value: unknown };

/** Options with a suit order, shown in the error for options that aren't an object. */
const SUIT_ORDER_EXAMPLE = "{ suitOrder: SuitOrder.BRIDGE }";

/** Reads a rank or suit order once, by index, and returns each entry's place; or returns the error for an order that isn't an array, has a hole or `undefined` in it, or lists an entry twice. `kind` says which order it is. */
export function placesIn(
  value: unknown,
  kind: "rank" | "suit",
): InvalidArgumentError | Places {
  if (!Array.isArray(value)) {
    const example = kind === "rank" ? "RankOrder.ACE_HIGH" : "SuitOrder.BRIDGE";
    return new InvalidArgumentError(
      `Invalid ${kind} order ${display(value)}: expected an array of ${kind}s from lowest to highest, such as ${example}`,
    );
  }

  // Checking each entry as it's placed means a getter or Proxy can't give the
  // check one entry and the places another. A Map compares entries with
  // SameValueZero, as `includes` does.
  const order: readonly unknown[] = value;
  const places = new Map<unknown, number>();
  const size = order.length;
  for (let i = 0; i < size; i++) {
    const entry = order[i];
    // A hole, `null` or a primitive in the stack has no rank or suit, so it
    // reads as `undefined`, and has to find no place.
    if (entry === undefined) {
      return new InvalidArgumentError(
        `Invalid ${kind} order: it has a hole or undefined at index ${String(i)}, but each place needs a ${kind}`,
      );
    }
    if (places.has(entry)) {
      return new InvalidArgumentError(
        `Invalid ${kind} order: it lists ${display(entry)} twice, but each ${kind} has one place`,
      );
    }
    places.set(entry, i);
  }
  return places;
}

/** Reads the `suitOrder` option once and returns its places, or `undefined` when it's left out; or returns the error for options that aren't an object or a suit order that `placesIn` rejects. */
export function suitPlacesIn(
  options: Readonly<{ suitOrder?: unknown }>,
): InvalidArgumentError | Places | undefined {
  const problem = optionsProblem(options, SUIT_ORDER_EXAMPLE);
  if (problem !== undefined) return problem;
  // Read the option once: a getter could give each read a different order.
  const { suitOrder } = options;
  return suitOrder === undefined ? undefined : placesIn(suitOrder, "suit");
}

/** Finds a card's key: its rank's place times the suit order's size, plus its suit's place, leaving out an order that's `undefined`; reads the rank, then the suit, once each, and a hole, `null` or a primitive finds no place rather than throwing. */
function keyOf(
  card: unknown,
  ranks: Places | undefined,
  suits: Places | undefined,
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

/** Returns which of two cards comes first by the rank and suit orders: -1 for `a`, 1 for `b`, or 0 if they tie; or the error for a card whose rank or suit has no place, naming it as `a` or `b`. */
export function compareBy(
  a: unknown,
  b: unknown,
  ranks: Places,
  suits: Places | undefined,
): -1 | 0 | 1 | InvalidArgumentError {
  const keyA = keyOf(a, ranks, suits);
  if ("missing" in keyA) {
    return notInOrder("compare", "a", keyA.missing, keyA.value);
  }
  const keyB = keyOf(b, ranks, suits);
  if ("missing" in keyB) {
    return notInOrder("compare", "b", keyB.missing, keyB.value);
  }
  return keyA.key < keyB.key ? -1 : keyA.key > keyB.key ? 1 : 0;
}

/** Sorts a stack's cards, read by index, into buckets by key, each in stack order, creating a bucket only when a card needs it; or returns the error for the first card with no key, saying what `verb` couldn't be done to it. */
function intoBuckets<C>(
  stack: CardStack<C>,
  ranks: Places | undefined,
  suits: Places | undefined,
  verb: string,
): InvalidArgumentError | readonly (C[] | undefined)[] {
  const buckets: (C[] | undefined)[] = [];
  const size = stack.length;
  for (let i = 0; i < size; i++) {
    const card = stack[i] as C;
    const keyed = keyOf(card, ranks, suits);
    if ("missing" in keyed) {
      return notInOrder(
        verb,
        `stack[${String(i)}]`,
        keyed.missing,
        keyed.value,
      );
    }
    (buckets[keyed.key] ??= []).push(card);
  }
  return buckets;
}

/** Sorts a stack's cards, read by index, by the rank and suit orders, keeping cards that tie in stack order, into a new frozen stack; or returns the error for the first card whose rank or suit has no place. */
export function sortedBy<C>(
  stack: CardStack<C>,
  ranks: Places,
  suits: Places | undefined,
): CardStack<C> | InvalidArgumentError {
  const buckets = intoBuckets(stack, ranks, suits, "sort");
  if (buckets instanceof InvalidArgumentError) return buckets;

  // Buckets that no card needed are holes, and are skipped. Pushing one card
  // at a time, rather than spreading a bucket, works for buckets of any size.
  const result: C[] = [];
  for (const bucket of buckets) {
    if (bucket !== undefined) for (const card of bucket) result.push(card);
  }
  return Object.freeze(result);
}

/** Groups a stack's cards, read by index, by their place in an order of ranks or suits, as `trait` says: a new frozen stack for each of the order's places, holding its cards in stack order, in a new frozen array; or returns the error for the first card whose trait has no place. */
export function groupedBy<C>(
  stack: CardStack<C>,
  places: Places,
  trait: "rank" | "suit",
): InvalidArgumentError | readonly CardStack<C>[] {
  const buckets =
    trait === "rank"
      ? intoBuckets(stack, places, undefined, "group")
      : intoBuckets(stack, undefined, places, "group");
  if (buckets instanceof InvalidArgumentError) return buckets;

  // One group for each place the order was read with, so every card's place
  // has a group, however the order was read.
  const groups: CardStack<C>[] = [];
  const size = places.size;
  for (let i = 0; i < size; i++) groups.push(Object.freeze(buckets[i] ?? []));
  return Object.freeze(groups);
}
