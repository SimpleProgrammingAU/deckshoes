import type { RandomSource } from "../random.ts";
import type { Shoe } from "../shoe.ts";
import type { CardStack } from "../stack.ts";

import { InvalidArgumentError } from "../errors.ts";
import { shuffle } from "../shuffle.ts";
import {
  cardCount,
  countProblem,
  randomProblem,
  tooManyCards,
} from "./checks.ts";
import { display } from "./display.ts";
import { copyStack } from "./stack.ts";

/** The penetration a shoe gets when its options leave it out. */
const DEFAULT_PENETRATION = 0.75;

/** The options `shoe()` and `reshuffle()` show as an example when theirs aren't an object. */
export const SHOE_OPTIONS_EXAMPLE = "{ penetration: 0.75 }";

/** What a shoe is shuffled with: the penetration to put its cut card at, and the random source. */
export interface ShuffleSettings {
  readonly penetration: number;
  readonly random: RandomSource | undefined;
}

/** Reads a shoe's cards, cut card and discard pile once each, the stacks through `copyStack`, so a getter or a Proxy can't give the check one value and the operation another, and returns them, or the error for something that isn't a shoe. A missing discard pile is read as an empty one (ADR 0013). A shoe holds at most 2³² − 1 cards with its discard pile, checked before either stack is copied, so a shoe too big for any operation is turned away before it can run the process out of memory. */
export function readShoe<C>(shoe: Shoe<C>): InvalidArgumentError | Shoe<C> {
  const value: unknown = shoe;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return new InvalidArgumentError(
      `Invalid shoe ${display(value)}: expected an object holding cards and a cutCard, as shoe() gives`,
    );
  }
  const {
    cards,
    cutCard,
    discardPile = [],
  }: Readonly<{
    cards?: unknown;
    cutCard?: unknown;
    discardPile?: unknown;
  }> = value;
  const problem =
    stackFieldProblem(cards, "shoe cards") ??
    stackFieldProblem(discardPile, "discard pile");
  if (problem !== undefined) return problem;
  const size = (cards as CardStack<C>).length;
  const piled = (discardPile as CardStack<C>).length;
  return (
    tooManyCards(
      size + piled,
      "shoe",
      value,
      () =>
        `a shoe of ${cardCount(size)} and a discard pile of ${cardCount(piled)}`,
    ) ??
    countProblem(cutCard, "cut card", 0, size) ?? {
      cards: copyStack(cards as CardStack<C>, 0, size),
      // `|| 0` turns a cut card of -0 into 0, as every shoe function gives.
      cutCard: (cutCard as number) || 0,
      discardPile: copyStack(discardPile as CardStack<C>, 0, piled),
    }
  );
}

/** Returns the error for a shoe's stack, named `name` in the message, that isn't an array, or `undefined` for one that is. */
function stackFieldProblem(
  value: unknown,
  name: string,
): InvalidArgumentError | undefined {
  return Array.isArray(value)
    ? undefined
    : new InvalidArgumentError(
        `Invalid ${name} ${display(value)}: expected an array of cards`,
      );
}

/** The shoe left once `taken` cards come off the top: the remainder, already frozen, with the cut card moved up by as many, stopping at 0, and the discard pile `pile`, an array of the library's own that's frozen in place. */
export function shoeAfter<C>(
  remainder: CardStack<C>,
  cutCard: number,
  taken: number,
  pile: CardStack<C>,
): Shoe<C> {
  return Object.freeze({
    cards: remainder,
    cutCard: Math.max(0, cutCard - taken),
    discardPile: Object.freeze(pile),
  });
}

/** `cards` on top of `pile`, each in its order, as one new plain array filled by index, as `copyStack` fills one, so each of `cards` and its length are read once. Pass `above` when the caller has already read the length of `cards`, so it isn't read twice. */
export function onTopOf<C>(
  cards: CardStack<C>,
  pile: CardStack<C>,
  above: number = cards.length,
): C[] {
  const below = pile.length;
  // eslint-disable-next-line unicorn/no-new-array -- sized up front, as copyStack does
  const stacked = new Array<C>(above + below);
  for (let i = 0; i < above; i++) stacked[i] = cards[i] as C;
  for (let i = 0; i < below; i++) stacked[above + i] = pile[i] as C;
  return stacked;
}

/** Reads the penetration and random source from the options of `shoe()` or `reshuffle()`, which must already be an object, once each and as `unknown`, so a JavaScript caller's value is checked and a getter can't give the check one value and the shuffle another. Returns them, or the error for one that's wrong. */
export function readShuffleSettings(
  options: Readonly<{ penetration?: unknown; random?: unknown }>,
): InvalidArgumentError | ShuffleSettings {
  const { penetration = DEFAULT_PENETRATION, random } = options;
  if (
    typeof penetration !== "number" ||
    !(penetration >= 0 && penetration <= 1)
  ) {
    return new InvalidArgumentError(
      `Invalid penetration option ${display(penetration)}: expected a number from 0 to 1`,
    );
  }
  return (
    randomProblem(random) ?? {
      penetration,
      random: random as RandomSource | undefined,
    }
  );
}

/** Shuffles `cards`, an array of the library's own, into a new frozen shoe with its cut card at the penetration and an empty discard pile. The rounding is fixed for 1.x (ADR 0013): changing it changes every seeded shoe. */
export function shuffledShoe<C>(
  cards: CardStack<C>,
  { penetration, random }: ShuffleSettings,
): Shoe<C> {
  return Object.freeze({
    cards: shuffle(cards, { random }),
    // `|| 0` turns the -0 that a penetration of -0 gives into 0.
    cutCard: Math.round(penetration * cards.length) || 0,
    discardPile: Object.freeze([]),
  });
}
