import type { Card, Rank, Suit } from "../card.ts";
import type { CardStack } from "../stack.ts";

import { InvalidArgumentError, InvalidCardError } from "../errors.ts";
import { Category } from "../poker/category.ts";
import { cardCountText } from "./checks.ts";
import { display } from "./display.ts";
import { rankEntry } from "./rank-entry.ts";

/** Each standard rank's value in poker, from 2 for a 2 up to 14 for an ace, which also counts as 1 in the wheel. Built here rather than with `lookup()`, as `VALUES` in src/internal/blackjack.ts is, to keep `lookup()` out of the chunk shared between entry points. */
const VALUES: ReadonlyMap<unknown, number> = /* @__PURE__ */ new Map(
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

/** Each standard suit's index, for finding flushes and copies, built as {@link VALUES} is. */
const SUITS: ReadonlyMap<unknown, number> = /* @__PURE__ */ new Map(
  /* @__PURE__ */ Object.entries({ S: 0, H: 1, D: 2, C: 3 } satisfies Record<
    Suit,
    number
  >),
);

/** Each category's strength, from 0 for high card up to 8 for a straight flush, so that a higher category beats a lower one. */
const CATEGORY_STRENGTHS: Readonly<Record<Category, number>> = {
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

/** What judging a poker hand finds: its category, a strength that orders poker hands of the same size, and its cards, most significant first. */
interface PokerReading {
  readonly cards: CardStack;
  readonly category: Category;
  readonly strength: number;
}

/** A card in a poker hand, with its rank's value and its position in the stack. */
interface HeldCard {
  readonly card: Card;
  readonly position: number;
  readonly value: number;
}

/** A straight found among some cards: the value of its top card, 5 for the wheel, and its cards from the top card down. */
interface Straight {
  readonly held: readonly HeldCard[];
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

/** Finds the highest straight among some cards, given the card of each value they hold, or `undefined` for a value they don't; or `undefined` when they hold no straight. */
function highestStraight(
  cardOf: (value: number) => HeldCard | undefined,
): Straight | undefined {
  for (let top = 14; top >= 5; top--) {
    const held: HeldCard[] = [];
    for (let value = top; value > top - 5; value--) {
      // The wheel's ace counts 1.
      const found = cardOf(value === 1 ? 14 : value);
      if (found === undefined) break;
      held.push(found);
    }
    if (held.length === 5) return { held, top };
  }
  return undefined;
}

/** A number that orders poker hands of the same size: the category's strength, then up to five values in the order they're compared, each a digit in base 15, with 0 for a value a smaller poker hand doesn't have. */
function strengthOf(category: Category, values: readonly number[]): number {
  let strength = CATEGORY_STRENGTHS[category];
  for (let i = 0; i < 5; i++) strength = strength * 15 + (values[i] ?? 0);
  return strength;
}

/** The position of the most significant card of a straight or flush, which decides between two that are as strong: the one nearer the top is used. */
function firstPosition(held: readonly HeldCard[]): number {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- a straight or flush holds five cards
  return held[0]!.position;
}

/** Adds `item` to the list that `key` has in `lists`, starting one if it has none. */
function addTo<K, V>(lists: Map<K, V[]>, key: K, item: V): void {
  const list = lists.get(key);
  if (list === undefined) lists.set(key, [item]);
  else list.push(item);
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
  // The cards of each value, and of each suit, top first.
  const byValue = new Map<number, HeldCard[]>();
  const bySuit = new Map<number, HeldCard[]>();
  // The position of the card of each value and suit, at `value * 4 + suit`.
  const positions = new Map<number, number>();
  for (let i = 0; i < size; i++) {
    const card: unknown = cards[i];
    const value = rankEntry(card, VALUES, i, stackName);
    if (value instanceof InvalidCardError) return value;
    const suit = suitEntry(card, i, stackName);
    if (suit instanceof InvalidCardError) return suit;
    const slot = value * 4 + suit;
    const earlier = positions.get(slot);
    if (earlier !== undefined) {
      return new InvalidArgumentError(
        `Can't judge ${stackName}: the cards at positions ${String(earlier)} and ${String(i)} are the same card, and a poker hand is dealt from one deck`,
      );
    }
    positions.set(slot, i);
    const held = { card: card as Card, position: i, value };
    addTo(byValue, value, held);
    addTo(bySuit, suit, held);
  }

  const heldOf = (value: number): readonly HeldCard[] =>
    byValue.get(value) ?? [];
  /** The highest value held at least `count` times, other than `except`, or `undefined` when there's none. */
  const highest = (count: number, except?: number): number | undefined => {
    for (let value = 14; value >= 2; value--) {
      if (value !== except && heldOf(value).length >= count) return value;
    }
    return undefined;
  };
  /** The reading for a category, given the cards that make it and the values they're compared by, filled up with kickers to five cards, or to all of them. */
  const reading = (
    category: Category,
    made: readonly HeldCard[],
    madeValues: readonly number[],
  ): PokerReading => {
    const chosen = made.map(({ card }) => card);
    const values = [...madeValues];
    const wanted = Math.min(size, 5);
    // Kickers, highest first: the topmost card of each value the cards that
    // make the category don't hold. Only four of a kind and two pair can take
    // one from a pair or more, and they take one kicker.
    for (let value = 14; chosen.length < wanted; value--) {
      const [kicker] = heldOf(value);
      if (kicker === undefined || madeValues.includes(value)) continue;
      chosen.push(kicker.card);
      values.push(value);
    }
    return {
      cards: Object.freeze(chosen),
      category,
      strength: strengthOf(category, values),
    };
  };

  // A flush or straight flush needs five cards of one suit. Between two
  // suits that make one as strong, the one whose top card is nearer the top
  // is used.
  const flushSuits = [...bySuit.values()].filter(
    (suited) => suited.length >= 5,
  );
  let straightFlush: Straight | undefined;
  for (const suited of flushSuits) {
    const inSuit = new Map(suited.map((held) => [held.value, held]));
    const found = highestStraight((value) => inSuit.get(value));
    if (
      found !== undefined &&
      (straightFlush === undefined ||
        found.top > straightFlush.top ||
        (found.top === straightFlush.top &&
          firstPosition(found.held) < firstPosition(straightFlush.held)))
    ) {
      straightFlush = found;
    }
  }
  if (straightFlush !== undefined) {
    return reading(Category.STRAIGHT_FLUSH, straightFlush.held, [
      straightFlush.top,
    ]);
  }

  const fourOfAKind = highest(4);
  if (fourOfAKind !== undefined) {
    return reading(Category.FOUR_OF_A_KIND, heldOf(fourOfAKind), [fourOfAKind]);
  }

  const threeOfAKind = highest(3);
  const pair = highest(2, threeOfAKind);
  if (threeOfAKind !== undefined && pair !== undefined) {
    const made = [...heldOf(threeOfAKind), ...heldOf(pair).slice(0, 2)];
    return reading(Category.FULL_HOUSE, made, [threeOfAKind, pair]);
  }

  let flush: { held: readonly HeldCard[]; strength: number } | undefined;
  for (const suited of flushSuits) {
    const held = suited.toSorted((a, b) => b.value - a.value).slice(0, 5);
    const strength = strengthOf(
      Category.FLUSH,
      held.map(({ value }) => value),
    );
    if (
      flush === undefined ||
      strength > flush.strength ||
      (strength === flush.strength &&
        firstPosition(held) < firstPosition(flush.held))
    ) {
      flush = { held, strength };
    }
  }
  if (flush !== undefined) {
    return reading(
      Category.FLUSH,
      flush.held,
      flush.held.map(({ value }) => value),
    );
  }

  const straight = highestStraight((value) => heldOf(value)[0]);
  if (straight !== undefined) {
    return reading(Category.STRAIGHT, straight.held, [straight.top]);
  }

  if (threeOfAKind !== undefined) {
    return reading(Category.THREE_OF_A_KIND, heldOf(threeOfAKind), [
      threeOfAKind,
    ]);
  }
  if (pair === undefined) return reading(Category.HIGH_CARD, [], []);
  const lowerPair = highest(2, pair);
  return lowerPair === undefined
    ? reading(Category.ONE_PAIR, heldOf(pair), [pair])
    : reading(
        Category.TWO_PAIR,
        [...heldOf(pair), ...heldOf(lowerPair)],
        [pair, lowerPair],
      );
}
