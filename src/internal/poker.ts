import type { Card, Rank, Suit } from "../card.ts";
import type { CardStack } from "../stack.ts";

import { InvalidArgumentError, InvalidCardError } from "../errors.ts";
import { Category } from "../poker/category.ts";
import { cardCountText } from "./checks.ts";
import { display } from "./display.ts";
import { rankEntry } from "./rank-entry.ts";

/** Each standard rank's place in poker, from 2 for a 2 up to 14 for an ace, which also counts as 1 in the wheel. Built here rather than with `lookup()`, as `VALUES` in src/internal/blackjack.ts is, to keep `lookup()` out of the chunk shared between entry points. */
const PLACES: ReadonlyMap<unknown, number> = /* @__PURE__ */ new Map(
  /* @__PURE__ */ Object.entries({
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
  } satisfies Record<Rank, number>),
);

/** Each standard suit's index, for finding flushes and copies, built as {@link PLACES} is. */
const SUITS: ReadonlyMap<unknown, number> = /* @__PURE__ */ new Map(
  /* @__PURE__ */ Object.entries({ S: 0, H: 1, D: 2, C: 3 } satisfies Record<
    Suit,
    number
  >),
);

/** Each category's place, from 0 for high card up to 8 for a straight flush, so that a higher category beats a lower one. */
const CATEGORY_PLACES: Readonly<Record<Category, number>> = {
  [Category.HIGH_CARD]: 0,
  [Category.ONE_PAIR]: 1,
  [Category.TWO_PAIR]: 2,
  [Category.THREE_OF_A_KIND]: 3,
  [Category.STRAIGHT]: 4,
  [Category.FLUSH]: 5,
  [Category.FULL_HOUSE]: 6,
  [Category.FOUR_OF_A_KIND]: 7,
  [Category.STRAIGHT_FLUSH]: 8,
};

/** What judging a poker hand finds: its category, a score that orders poker hands of the same size, and its cards, most significant first. */
export interface PokerReading {
  readonly cards: CardStack;
  readonly category: Category;
  readonly score: number;
}

/** A card in a poker hand, with its rank's place. */
interface Placed {
  readonly card: Card;
  readonly place: number;
}

/** A straight found among some cards: the place of its top card, 5 for the wheel, and its cards from the top card down. */
interface Straight {
  readonly cards: readonly Card[];
  readonly top: number;
}

/** Looks up a card's suit, read once, as `rankEntry` looks up its rank; returns the suit's index, or the error for a card without a standard suit at `position` of the stack `stackName` names. Only called once the card has a standard rank, so it's an object. */
function suitEntry(
  card: unknown,
  position: number,
  stackName: string,
): InvalidCardError | number {
  const suit = (card as Partial<Record<"suit", unknown>>).suit;
  return (
    SUITS.get(suit) ??
    new InvalidCardError(
      `Invalid card with suit ${display(suit)} at position ${String(position)} of ${stackName}: expected a card with suit "S", "H", "D" or "C"`,
    )
  );
}

/** Finds the highest straight among some cards, given the card of each place they hold, or `undefined` for a place they don't; or `undefined` when they hold no straight. */
function highestStraight(
  cardOf: (place: number) => Card | undefined,
): Straight | undefined {
  for (let top = 14; top >= 5; top--) {
    const cards: Card[] = [];
    for (let place = top; place > top - 5; place--) {
      // The wheel's ace counts 1.
      const card = cardOf(place === 1 ? 14 : place);
      if (card === undefined) break;
      cards.push(card);
    }
    if (cards.length === 5) return { cards, top };
  }
  return undefined;
}

/** A number that orders poker hands of the same size: the category's place, then up to five places in the order they're compared, each a digit in base 15, with 0 for a place a smaller poker hand doesn't have. */
function scoreOf(category: number, places: readonly number[]): number {
  let score = category;
  for (let i = 0; i < 5; i++) score = score * 15 + (places[i] ?? 0);
  return score;
}

/** Adds `value` to the list that `key` has in `lists`, starting one if it has none. */
function addTo<K, V>(lists: Map<K, V[]>, key: K, value: V): void {
  const list = lists.get(key);
  if (list === undefined) lists.set(key, [value]);
  else list.push(value);
}

/** Returns the error for poker hands of `size` and `otherSize` cards that can't be compared, because they're different sizes and either has fewer than five cards; or `undefined` for two that can be. */
export function sizesProblem(
  size: number,
  otherSize: number,
): InvalidArgumentError | undefined {
  return size === otherSize || (size >= 5 && otherSize >= 5)
    ? undefined
    : new InvalidArgumentError(
        `Can't compare poker hands of ${cardCountText(size)} and ${cardCountText(otherSize)}: below five cards, a poker hand is only compared with one of the same size`,
      );
}

/** Reads each of the `size` cards of a poker hand once, by index, and judges it by its best five cards, or all of them when there are fewer; or returns the error for the first card without a standard rank or suit, or for a copy. `size` is the length, read once by the caller, and `stackName` names the stack in an error, such as "the cards". */
export function readPokerHand(
  cards: CardStack,
  size: number,
  stackName: string,
): InvalidArgumentError | InvalidCardError | PokerReading {
  // The cards of each place, and of each suit, top first. A map keeps its
  // keys in the order they're added, so the suits come in the order of their
  // first cards, and a tie between two suits goes to the one nearer the top.
  const byPlace = new Map<number, Card[]>();
  const bySuit = new Map<number, Placed[]>();
  // The position of the card of each place and suit, at `place * 4 + suit`.
  const positions = new Map<number, number>();
  for (let i = 0; i < size; i++) {
    const card: unknown = cards[i];
    const place = rankEntry(card, PLACES, i, stackName);
    if (place instanceof InvalidCardError) return place;
    const suit = suitEntry(card, i, stackName);
    if (suit instanceof InvalidCardError) return suit;
    const earlier = positions.get(place * 4 + suit);
    if (earlier !== undefined) {
      return new InvalidArgumentError(
        `Can't judge ${stackName}: the cards at positions ${String(earlier)} and ${String(i)} are the same card, and a poker hand is dealt from one deck`,
      );
    }
    positions.set(place * 4 + suit, i);
    addTo(byPlace, place, card as Card);
    addTo(bySuit, suit, { card: card as Card, place });
  }

  const held = (place: number): readonly Card[] => byPlace.get(place) ?? [];
  /** The highest place held at least `count` times, other than `except`, or `undefined` when there's none. */
  const highest = (count: number, except?: number): number | undefined => {
    for (let place = 14; place >= 2; place--) {
      if (place !== except && held(place).length >= count) return place;
    }
    return undefined;
  };
  /** The reading for a category, given the cards that make it and the places they're compared by, filled up with kickers to five cards, or to all of them. */
  const reading = (
    category: Category,
    made: readonly Card[],
    madePlaces: readonly number[],
  ): PokerReading => {
    const chosen = [...made];
    const places = [...madePlaces];
    const wanted = Math.min(size, 5);
    // Kickers, highest first: the topmost card of each place the cards that
    // make the category don't hold. Only four of a kind and two pair can take
    // one from a pair or more, and they take one kicker.
    for (let place = 14; chosen.length < wanted; place--) {
      const [card] = held(place);
      if (card === undefined || madePlaces.includes(place)) continue;
      chosen.push(card);
      places.push(place);
    }
    return {
      cards: Object.freeze(chosen),
      category,
      score: scoreOf(CATEGORY_PLACES[category], places),
    };
  };

  // A flush or straight flush needs five cards of one suit.
  const flushSuits = [...bySuit.values()].filter(
    (suited) => suited.length >= 5,
  );
  let straightFlush: Straight | undefined;
  for (const suited of flushSuits) {
    const cardOf = new Map(suited.map(({ card, place }) => [place, card]));
    const found = highestStraight((place) => cardOf.get(place));
    if (
      found !== undefined &&
      (straightFlush === undefined || found.top > straightFlush.top)
    ) {
      straightFlush = found;
    }
  }
  if (straightFlush !== undefined) {
    return reading(Category.STRAIGHT_FLUSH, straightFlush.cards, [
      straightFlush.top,
    ]);
  }

  const quads = highest(4);
  if (quads !== undefined)
    return reading(Category.FOUR_OF_A_KIND, held(quads), [quads]);

  const trips = highest(3);
  const pair = highest(2, trips);
  if (trips !== undefined && pair !== undefined) {
    const made = [...held(trips), ...held(pair).slice(0, 2)];
    return reading(Category.FULL_HOUSE, made, [trips, pair]);
  }

  let flush: PokerReading | undefined;
  for (const suited of flushSuits) {
    const top = suited.toSorted((a, b) => b.place - a.place).slice(0, 5);
    const found = reading(
      Category.FLUSH,
      top.map(({ card }) => card),
      top.map(({ place }) => place),
    );
    if (flush === undefined || found.score > flush.score) flush = found;
  }
  if (flush !== undefined) return flush;

  const run = highestStraight((place) => held(place)[0]);
  if (run !== undefined)
    return reading(Category.STRAIGHT, run.cards, [run.top]);

  if (trips !== undefined)
    return reading(Category.THREE_OF_A_KIND, held(trips), [trips]);
  if (pair === undefined) return reading(Category.HIGH_CARD, [], []);
  const lowerPair = highest(2, pair);
  return lowerPair === undefined
    ? reading(Category.ONE_PAIR, held(pair), [pair])
    : reading(
        Category.TWO_PAIR,
        [...held(pair), ...held(lowerPair)],
        [pair, lowerPair],
      );
}
