import type { CardStack } from "../stack.ts";

import { InvalidArgumentError } from "../errors.ts";
import { assert } from "./assert.ts";
import { notInOrder, optionsProblem } from "./checks.ts";
import { display } from "./display.ts";

/** Each entry of a rank or suit order, mapped to its place, from 0 for the lowest. */
export type Places = ReadonlyMap<unknown, number>;

/** A card's places in the rank order and the suit order, 0 for an order that's left out. */
interface Placed {
  readonly rank: number;
  readonly suit: number;
}

/** A card with its places in the rank and suit orders. */
interface PlacedCard<C> extends Placed {
  readonly card: C;
}

/** Which of a card's traits has no place in its order, and that trait's value. */
interface Missing {
  readonly missing: "rank" | "suit";
  readonly value: unknown;
}

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

/** Finds a card's places in the rank and suit orders, leaving out an order that's `undefined` as 0; reads the rank, then the suit, once each, and a hole, `null` or a primitive finds no place rather than throwing. */
function placeOf(
  card: unknown,
  ranks: Places | undefined,
  suits: Places | undefined,
): Missing | Placed {
  const traits = card as
    { readonly rank?: unknown; readonly suit?: unknown } | null | undefined;
  let rank = 0;
  if (ranks !== undefined) {
    const value = traits?.rank;
    const place = ranks.get(value);
    if (place === undefined) return { missing: "rank", value };
    rank = place;
  }
  let suit = 0;
  if (suits !== undefined) {
    const value = traits?.suit;
    const place = suits.get(value);
    if (place === undefined) return { missing: "suit", value };
    suit = place;
  }
  return { rank, suit };
}

/** Compares two placed cards by rank, then suit: negative if `a` is lower, positive if it's higher, or 0 if they tie. Comparing the two places, rather than one number made from both, works for orders of any size. */
function byPlace(a: Placed, b: Placed): number {
  return a.rank - b.rank || a.suit - b.suit;
}

/** Returns which of two cards is lower by the rank and suit orders: -1 for `a`, 1 for `b`, or 0 if they tie; or the error for a card whose rank or suit has no place, naming it as `a` or `b`. */
export function compareBy(
  a: unknown,
  b: unknown,
  ranks: Places,
  suits: Places | undefined,
): -1 | 0 | 1 | InvalidArgumentError {
  const placeA = placeOf(a, ranks, suits);
  if ("missing" in placeA) {
    return notInOrder("compare", "a", placeA.missing, placeA.value);
  }
  const placeB = placeOf(b, ranks, suits);
  if ("missing" in placeB) {
    return notInOrder("compare", "b", placeB.missing, placeB.value);
  }
  const difference = byPlace(placeA, placeB);
  return difference < 0 ? -1 : difference > 0 ? 1 : 0;
}

/** Finds the places of each card of a stack, read by index, keeping each with its card in stack order; or returns the error for the first card with no place, saying what `verb` couldn't be done to it. */
function placeEach<C>(
  stack: CardStack<C>,
  ranks: Places | undefined,
  suits: Places | undefined,
  verb: string,
): InvalidArgumentError | PlacedCard<C>[] {
  const placed: PlacedCard<C>[] = [];
  const size = stack.length;
  for (let i = 0; i < size; i++) {
    const card = stack[i] as C;
    const place = placeOf(card, ranks, suits);
    if ("missing" in place) {
      const name = `stack[${String(i)}]`;
      return notInOrder(verb, name, place.missing, place.value);
    }
    placed.push({ card, rank: place.rank, suit: place.suit });
  }
  return placed;
}

/** Sorts a stack's cards, read by index, by the rank and suit orders, keeping cards that tie in stack order, into a new frozen stack; or returns the error for the first card whose rank or suit has no place. */
export function sortedBy<C>(
  stack: CardStack<C>,
  ranks: Places,
  suits: Places | undefined,
): CardStack<C> | InvalidArgumentError {
  const placed = placeEach(stack, ranks, suits, "sort");
  // `toSorted` is stable, so cards that tie keep their order.
  return placed instanceof InvalidArgumentError
    ? placed
    : Object.freeze(placed.toSorted(byPlace).map(({ card }) => card));
}

/** Groups a stack's cards, read by index, by their place in an order of ranks or suits, as `trait` says: a new frozen stack for each of the order's places, holding its cards in stack order, in a new frozen array; or returns the error for the first card whose trait has no place. */
export function groupedBy<C>(
  stack: CardStack<C>,
  places: Places,
  trait: "rank" | "suit",
): InvalidArgumentError | readonly CardStack<C>[] {
  const placed =
    trait === "rank"
      ? placeEach(stack, places, undefined, "group")
      : placeEach(stack, undefined, places, "group");
  if (placed instanceof InvalidArgumentError) return placed;

  // One group for each place the order was read with, so every card's place
  // has a group, however the order was read.
  const groups: C[][] = [];
  const size = places.size;
  for (let i = 0; i < size; i++) groups.push([]);
  for (const each of placed) {
    const group = groups[each[trait]];
    assert(group !== undefined, "a card's place has no group");
    group.push(each.card);
  }
  return Object.freeze(groups.map((group) => Object.freeze(group)));
}
