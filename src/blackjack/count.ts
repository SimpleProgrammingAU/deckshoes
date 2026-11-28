import type { Card } from "../card.ts";
import type { CardStack } from "../stack.ts";

import { InvalidArgumentError, InvalidCardError } from "../errors.ts";
import {
  HI_LO,
  TAG_OPTIONS_EXAMPLE,
  tagProblem,
  tagResultProblem,
} from "../internal/blackjack.ts";
import {
  cardsProblem,
  namedStackProblem,
  optionsProblem,
} from "../internal/checks.ts";
import { display } from "../internal/display.ts";
import { rankEntry } from "../internal/rank-entry.ts";

/**
 * Settings for {@link runningCount}.
 *
 * @example
 * ```ts
 * import { type Card, card } from "deckshoes";
 * import { runningCount, type RunningCountOptions } from "deckshoes/blackjack";
 *
 * // Counting aces only.
 * const options: RunningCountOptions = { tag: (c: Card) => (c.rank === "A" ? 1 : 0) };
 * runningCount([card("A", "S"), card("K", "H"), card("A", "D")], options); // => 2
 * ```
 *
 * @since 1.1.0
 */
export interface RunningCountOptions {
  /**
   * The counting system's tag for a card: a function that's given each card,
   * top first, and returns its tag, a finite number. Leave it out, or pass
   * `undefined`, for Hi-Lo.
   */
  readonly tag?: ((card: Card) => number) | undefined;
}

/**
 * Returns the running count of some cards: the sum of each card's tag in a
 * counting system, Hi-Lo unless you give your own.
 *
 * Hi-Lo tags a 2 to 6 as +1, a 7 to 9 as 0, and a 10, J, Q, K or ace as −1,
 * so a standard 52 counts 0, and a count above 0 means more high cards than
 * low ones are left to deal. Counts add up, so keep a running count by
 * counting the cards as they're seen and adding each count to the last.
 * Start again from 0 after a reshuffle.
 *
 * For another counting system, pass a `tag` function. It's called once for
 * each card, top first, and has to return a finite number. A tag can look at
 * more than the rank, as the Red Seven count does, which tags a red 7 as +1
 * and a black 7 as 0.
 *
 * Every card has to have a standard rank, even with a `tag` of your own. Hi-Lo
 * reads only the cards' ranks, so a cloned card counts the same as the real
 * one. The cards are left untouched.
 *
 * @param cards - The cards to count, such as those dealt since the last count.
 * @param options - Settings for the count: the counting system's tag for a
 * card.
 * @returns The sum of the cards' tags, or 0 for no cards.
 * @throws {@link deckshoes!InvalidArgumentError | InvalidArgumentError} When
 * `cards` isn't an array, `options` isn't an object or is an array, or its
 * `tag` option isn't a function. Also when `tag` returns anything but a
 * finite number.
 * @throws {@link deckshoes!InvalidCardError | InvalidCardError} When a card in
 * `cards` doesn't have a standard rank, such as a hole in the array.
 *
 * @example
 * ```ts
 * import { type Card, card, dealFromShoe, seededRandom, shoe } from "deckshoes";
 * import { runningCount } from "deckshoes/blackjack";
 * import { standard52 } from "deckshoes/presets";
 *
 * runningCount([card("2", "S"), card("K", "H"), card("5", "D")]); // => 1
 * runningCount(standard52()); // => 0
 *
 * // Keeping count as a shoe deals: add each round's cards to the count.
 * const sixDecks = shoe(standard52(), 6, { random: seededRandom(42) });
 * const first = dealFromShoe(sixDecks, 3, 2);
 * let count = runningCount(first.hands.flat());
 * const second = dealFromShoe(first.shoe, 3, 2);
 * count += runningCount(second.hands.flat());
 * count; // => 2
 *
 * // Red Seven: Hi-Lo, except that a red 7 counts +1.
 * const redSeven = (c: Card) =>
 *   c.rank === "7" && c.color === "red" ? 1 : runningCount([c]);
 * const sevens = [card("7", "H"), card("7", "S"), card("K", "D")];
 * runningCount(sevens); // => -1
 * runningCount(sevens, { tag: redSeven }); // => 0
 *
 * // A tag has to be a finite number.
 * runningCount(sevens, { tag: () => NaN }); // throws INVALID_ARGUMENT
 * ```
 *
 * @since 1.1.0
 */
export function runningCount(
  cards: CardStack,
  options: RunningCountOptions = {},
): number {
  const problem =
    cardsProblem(cards) ?? optionsProblem(options, TAG_OPTIONS_EXAMPLE);
  if (problem !== undefined) throw problem;
  const tag: unknown = options.tag;
  const badTag = tagProblem(tag);
  if (badTag !== undefined) throw badTag;
  const tagOf = tag as ((card: Card) => unknown) | undefined;

  let count = 0;
  const size = cards.length;
  for (let i = 0; i < size; i++) {
    // Checked for a standard rank before it goes to `tag`.
    const card: unknown = cards[i];
    const hiLo = rankEntry(card, HI_LO, i, "the cards");
    if (hiLo instanceof InvalidCardError) throw hiLo;
    if (tagOf === undefined) {
      count += hiLo;
      continue;
    }
    const tagged = tagOf(card as Card);
    const badResult = tagResultProblem(tagged, i);
    if (badResult !== undefined) throw badResult;
    count += tagged as number;
  }
  return count;
}

/**
 * Returns the true count: a running count divided by the number of decks
 * left to deal.
 *
 * The decks left are the cards left, `remainder.length`, divided by the
 * number of cards in one of the decks the shoe was built from,
 * `deck.length`: 52 for the standard 52, or 48 for Spanish 21 (Pontoon in
 * Australian casinos), which deals the standard 52 without its 10s. A running
 * count of +6 with three decks left is a true count of +2, and with one deck
 * left, +6: the same surplus of high cards counts for more in fewer cards.
 *
 * The result isn't rounded. Players round it in different ways, truncating,
 * flooring or rounding it, or counting the decks left to the nearest half
 * deck first, so round it as your betting rules say. Only the lengths of
 * `remainder` and `deck` are read, once each, so their cards aren't checked.
 *
 * @param runningCount - The running count of the cards seen since the last
 * shuffle, such as one from
 * {@link deckshoes/blackjack!runningCount | runningCount}: any finite number,
 * from any counting system.
 * @param remainder - The cards left to deal, such as a shoe's `cards`.
 * @param deck - One of the decks the shoe was built from, such as
 * `standard52()`, to measure the decks left by.
 * @returns The running count divided by the decks left to deal.
 * @throws {@link deckshoes!InvalidArgumentError | InvalidArgumentError} When
 * `runningCount` isn't a finite number, `remainder` or `deck` isn't an array,
 * or either is empty.
 *
 * @example
 * ```ts
 * import { burn, seededRandom, shoe } from "deckshoes";
 * import { trueCount } from "deckshoes/blackjack";
 * import { standard52 } from "deckshoes/presets";
 *
 * const deck = standard52();
 * const sixDecks = shoe(deck, 6, { random: seededRandom(42) });
 *
 * // Three decks dealt, so three are left.
 * const halfway = burn(sixDecks, 156);
 * trueCount(6, halfway.cards, deck); // => 2
 * trueCount(-3, halfway.cards, deck); // => -1
 *
 * // Not rounded: round it as your betting rules say.
 * trueCount(5, halfway.cards, deck); // => 1.6666666666666667
 * Math.trunc(trueCount(5, halfway.cards, deck)); // => 1
 *
 * // Spanish 21's 48-card decks: the standard 52 without its 10s.
 * const spanish21 = deck.filter((c) => c.rank !== "10");
 * const spanishShoe = shoe(spanish21, 6, { random: seededRandom(42) });
 * trueCount(6, burn(spanishShoe, 144).cards, spanish21); // => 2
 *
 * // No cards left, so no true count.
 * trueCount(6, [], deck); // throws INVALID_ARGUMENT
 * ```
 *
 * @since 1.1.0
 */
export function trueCount(
  runningCount: number,
  remainder: CardStack,
  deck: CardStack,
): number {
  if (typeof runningCount !== "number" || !Number.isFinite(runningCount)) {
    throw new InvalidArgumentError(
      `Invalid running count ${display(runningCount)}: expected a finite number`,
    );
  }
  const problem =
    namedStackProblem(remainder, "remainder") ??
    namedStackProblem(deck, "deck");
  if (problem !== undefined) throw problem;
  const left = remainder.length;
  if (left === 0) {
    throw new InvalidArgumentError(
      "Invalid remainder: it's empty, so there are no decks left to divide the running count by",
    );
  }
  const size = deck.length;
  if (size === 0) {
    throw new InvalidArgumentError(
      "Invalid deck: it's empty, so it can't measure the decks left",
    );
  }
  // One division, so the result is rounded once: dividing by `left / size`
  // would round twice, and give 12.999999999999998 for 27 over 108 of 52.
  return (runningCount * size) / left;
}
