import type { CardStack } from "../stack.ts";

import { InvalidArgumentError } from "../errors.ts";
import { assert } from "./assert.ts";
import { notInOrder, optionsProblem, type Trait } from "./checks.ts";
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

/** Which of a card's traits has no place in its order, and the rank or suit the card actually has. */
interface Missing {
  readonly actual: unknown;
  readonly trait: Trait;
}

/** The places of each frozen order read so far. A frozen order's entries can't be reassigned, so its places are kept from the first read, and a comparator, called for each pair of cards, reads a built-in order only once. */
const frozenPlaces = /* @__PURE__ */ new WeakMap<readonly unknown[], Places>();

/** Options with a suit order, shown in the error for options that aren't an object. */
const SUIT_ORDER_EXAMPLE = "{ suitOrder: SuitOrder.BRIDGE }";

/** Reads a rank or suit order once, by index, and returns each entry's place, keeping them for a frozen order; or returns the error for an order that isn't an array, has a hole or `undefined` in it, or lists an entry twice. `trait` says which order it is. */
export function placesIn(
  value: unknown,
  trait: Trait,
): InvalidArgumentError | Places {
  if (!Array.isArray(value)) {
    const example =
      trait === "rank" ? "RankOrder.ACE_HIGH" : "SuitOrder.BRIDGE";
    return new InvalidArgumentError(
      `Invalid ${trait} order ${display(value)}: expected an array of ${trait}s from lowest to highest, such as ${example}`,
    );
  }

  // Checking each entry as it's placed means a getter or Proxy can't give the
  // check one entry and the places another. A Map compares entries with
  // SameValueZero, as `includes` does.
  const order: readonly unknown[] = value;
  const kept = frozenPlaces.get(order);
  if (kept !== undefined) return kept;
  const places = new Map<unknown, number>();
  const size = order.length;
  for (let i = 0; i < size; i++) {
    const entry = order[i];
    // A hole, `null` or a primitive in the stack has no rank or suit, so it
    // reads as `undefined`, and has to find no place.
    if (entry === undefined) {
      return new InvalidArgumentError(
        `Invalid ${trait} order: it has a hole or undefined at index ${String(i)}, but each place needs a ${trait}`,
      );
    }
    if (places.has(entry)) {
      return new InvalidArgumentError(
        `Invalid ${trait} order: it lists ${display(entry)} twice, but each ${trait} has one place`,
      );
    }
    places.set(entry, i);
  }
  if (Object.isFrozen(order)) frozenPlaces.set(order, places);
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

/** Finds the place of a card's rank or suit, as `trait` says, in its order, or 0 for an order that's `undefined`; reads the trait once, and a hole, `null` or a primitive finds no place rather than throwing. */
function placeIn(
  card: unknown,
  places: Places | undefined,
  trait: Trait,
): Missing | number {
  if (places === undefined) return 0;
  const traits = card as Partial<Record<Trait, unknown>> | null | undefined;
  const actual = traits?.[trait];
  return places.get(actual) ?? { actual, trait };
}

/** Finds a card's places in the rank and suit orders, leaving out an order that's `undefined` as 0; reads the rank, then the suit. */
function placeOf(
  card: unknown,
  ranks: Places | undefined,
  suits: Places | undefined,
): Missing | Placed {
  const rank = placeIn(card, ranks, "rank");
  if (typeof rank !== "number") return rank;
  const suit = placeIn(card, suits, "suit");
  return typeof suit === "number" ? { rank, suit } : suit;
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
  if ("trait" in placeA) {
    return notInOrder("compare", "a", placeA.trait, placeA.actual);
  }
  const placeB = placeOf(b, ranks, suits);
  if ("trait" in placeB) {
    return notInOrder("compare", "b", placeB.trait, placeB.actual);
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
    if ("trait" in place) {
      const name = `stack[${String(i)}]`;
      return notInOrder(verb, name, place.trait, place.actual);
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
  trait: Trait,
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
