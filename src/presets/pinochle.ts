import type { Rank } from "../card.ts";
import type { CardStack } from "../stack.ts";

import { InvalidArgumentError } from "../errors.ts";
import { optionsProblem } from "../internal/checks.ts";
import { display } from "../internal/display.ts";
import { newDeckOrder } from "../internal/new-deck-order.ts";

/**
 * Settings for {@link pinochle}.
 *
 * @example
 * ```ts
 * import { card, count } from "deckshoes";
 * import { pinochle, type PinochleOptions } from "deckshoes/presets";
 *
 * // Double-deck Pinochle: four copies of each card from 10 to ace.
 * const options: PinochleOptions = { size: 80 };
 * const deck = pinochle(options);
 * deck.length; // => 80
 * count(deck, (c) => c === card("A", "S")); // => 4
 * ```
 *
 * @since NEXT
 */
export interface PinochleOptions {
  /**
   * How many cards the deck holds: 48, 64, 80 or 120. Leave it out, or pass
   * `undefined`, for the 48-card deck.
   */
  readonly size?: 48 | 64 | 80 | 120 | undefined;
}

/** A Pinochle deck's size. */
type Size = NonNullable<PinochleOptions["size"]>;

/** The ranks a Pinochle deck strips from the standard 52, and how many copies of the cards left it holds. */
type Recipe = readonly [stripped: readonly Rank[], copies: number];

/** Each size's recipe. {@link pinochle} checks a size by looking it up here, so a size is valid exactly when it has a recipe. */
const RECIPES: ReadonlyMap<unknown, Recipe> = new Map<Size, Recipe>([
  [48, [["2", "3", "4", "5", "6", "7", "8"], 2]],
  [64, [["2", "3", "4", "5", "6"], 2]],
  [80, [["2", "3", "4", "5", "6", "7", "8", "9"], 4]],
  [120, [["2", "3", "4", "5", "6", "7", "8", "9"], 6]],
]);

/** The stacks {@link pinochle} returns, each built on the first call for its size. */
const decks = new Map<unknown, CardStack>();

/**
 * Returns a Pinochle deck: by default the 48 standard cards from 9 to ace, two
 * copies of each.
 *
 * Pass a `size` for one of the game's other decks. Each deck is copies of a
 * stripped deck, one on top of the other:
 *
 * - 48, the default: the 24 cards from 9 to ace, twice. That's two Euchre
 *   decks, from {@link euchre}.
 * - 64: the 32 cards from 7 to ace, twice. That's two Piquet decks, from
 *   {@link piquet}.
 * - 80: the 20 cards from 10 to ace, four times, for double-deck Pinochle.
 * - 120: the 20 cards from 10 to ace, six times, for triple-deck Pinochle.
 *
 * Each copy is in new deck order. Face down from the top, that's hearts and
 * clubs from ace to king, then diamonds and spades from king to ace, without
 * the stripped ranks. So the top card, `[0]`, is the ace of hearts, and the
 * bottom card is the ace of spades. In the 48-card deck, the 9 of hearts is
 * under the top card, and the second copy starts at `[24]`:
 *
 * A♥ 9♥ … K♥, A♣ 9♣ … K♣, K♦ … 9♦ A♦, K♠ … 9♠ A♠, A♥ 9♥ … K♥, …, K♠ … 9♠ A♠
 *
 * A card's copies are the same object, the one `card()` returns, so they
 * compare with `===` and are interchangeable. Every call for the same size
 * returns the same frozen stack. The order won't change in any 1.x release,
 * because every seeded shuffle of the deck starts from it.
 *
 * @param options - Settings for the deck: its size. Leave it out for the
 * 48-card deck.
 * @returns The deck's cards, top first.
 * @throws {@link deckshoes!InvalidArgumentError} When `options` isn't an object
 * or is an array, or its `size` isn't 48, 64, 80 or 120.
 *
 * @example
 * ```ts
 * import { card, count, seededRandom, shuffle } from "deckshoes";
 * import { pinochle } from "deckshoes/presets";
 *
 * const deck = pinochle();
 * deck.length; // => 48
 * deck[0] === card("A", "H"); // => true
 * deck[1] === card("9", "H"); // => true
 * deck[47] === card("A", "S"); // => true
 *
 * // Two copies of each card, which are the same object.
 * deck[24] === deck[0]; // => true
 * count(deck, (c) => c === card("A", "S")); // => 2
 *
 * // Double-deck Pinochle's 80 cards, from 10 to ace.
 * const doubleDeck = pinochle({ size: 80 });
 * doubleDeck.length; // => 80
 * doubleDeck[1] === card("10", "H"); // => true
 *
 * // The same frozen stack every time.
 * pinochle() === deck; // => true
 * pinochle({ size: 48 }) === deck; // => true
 * Object.isFrozen(deck); // => true
 *
 * // Shuffling gives a new stack and leaves the deck alone.
 * const shuffled = shuffle(deck, { random: seededRandom(42) });
 * shuffled[0] === card("9", "H"); // => true
 * deck[0] === card("A", "H"); // => true
 * ```
 *
 * @since NEXT
 */
export function pinochle(options: PinochleOptions = {}): CardStack {
  const problem = optionsProblem(options, "{ size: 80 }");
  if (problem !== undefined) throw problem;

  // Read the option once, as `unknown`: JavaScript callers can pass anything,
  // and a getter could give the check one value and the lookup another.
  const { size = 48 }: Readonly<{ size?: unknown }> = options;
  // A Map lookup compares with SameValueZero, so "48" and "constructor" miss.
  const recipe = RECIPES.get(size);
  if (recipe === undefined) {
    throw new InvalidArgumentError(
      `Invalid size option ${display(size)}: expected 48, 64, 80 or 120`,
    );
  }

  let deck = decks.get(size);
  if (deck === undefined) {
    // Copies of the stripped deck, one on top of the other.
    const [stripped, copies] = recipe;
    const once = newDeckOrder(stripped);
    deck = Object.freeze(Array.from({ length: copies }, () => once).flat());
    decks.set(size, deck);
  }
  return deck;
}
