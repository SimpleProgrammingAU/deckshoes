import type { Card } from "./card.ts";
import type { RandomSource } from "./random.ts";
import type { CardStack } from "./stack.ts";

import { deal, type DealOptions, type HandSize } from "./deal.ts";
import { draw } from "./draw.ts";
import { InvalidArgumentError } from "./errors.ts";
import {
  countProblem,
  optionsProblem,
  randomProblem,
  shortfall,
  stackProblem,
} from "./internal/checks.ts";
import { display } from "./internal/display.ts";
import { readShoe, shoeAfter } from "./internal/shoe.ts";
import { copyStack } from "./internal/stack.ts";
import { shuffle } from "./shuffle.ts";

/** The most cards a shoe can hold: the longest an array can be. */
const MAX_CARDS = 2 ** 32 - 1;

/** The penetration a shoe gets when its options leave it out. */
const DEFAULT_PENETRATION = 0.75;

/**
 * A shoe: copies of a deck dealt from as one, with a cut card that marks when
 * to reshuffle, and a discard pile. {@link shoe} builds one.
 *
 * It's a frozen plain object holding the `cards` still in the shoe, top first,
 * the `cutCard`'s position among them, and the `discardPile`.
 * {@link drawFromShoe} and {@link dealFromShoe} take cards out and move the
 * cut card up by as many. Once its position is 0, the cut card has been
 * reached and the shoe is due for a reshuffle.
 *
 * `cards` and `discardPile` are stacks, so any stack operation can read them,
 * such as {@link peek} or {@link count}, and so can a {@link chain}. The shoe
 * itself isn't a stack, so stack operations and `chain` don't take it:
 * anything that takes cards out of a shoe has to move its cut card too.
 *
 * Any object with this shape works as a shoe, so one can be written by hand.
 * A shoe without a `discardPile`, such as one written in JavaScript or saved
 * before shoes had one, is read as having an empty one. Every function that
 * takes a shoe checks it, and gives back a shoe holding only `cards`, `cutCard`
 * and `discardPile`, so no other field on it is carried over.
 *
 * @typeParam C - The type of card the shoe holds: a standard {@link Card}
 * unless you say otherwise.
 *
 * @example
 * ```ts
 * import { card, chain, drawFromShoe, peek, type Shoe } from "deckshoes";
 *
 * // Three cards, top first, with two of them above the cut card, and one card
 * // on the discard pile.
 * const threeCards: Shoe = {
 *   cards: [card("A", "S"), card("K", "H"), card("10", "D")],
 *   cutCard: 2,
 *   discardPile: [card("2", "C")],
 * };
 *
 * // Stack operations read a shoe's cards and its pile, chained or not.
 * peek(threeCards.cards); // => [card("A", "S")]
 * chain(threeCards.cards).count(({ suit }) => suit === "H").value(); // => 1
 * peek(threeCards.discardPile); // => [card("2", "C")]
 *
 * // Drawing moves the cut card up, and 0 means it's been reached.
 * drawFromShoe(threeCards, 2).shoe.cutCard; // => 0
 * ```
 *
 * @since NEXT
 */
export interface Shoe<C = Card> {
  /** The cards still in the shoe, top first. */
  readonly cards: CardStack<C>;

  /**
   * The cut card's position: how many cards are still to be dealt before it's
   * reached. It's 0 once the cut card has been reached, and stays 0 as dealing
   * goes on past it.
   */
  readonly cutCard: number;

  /**
   * The discard pile, top first: the cards burned and discarded since the last
   * reshuffle, which are out of play until the next one. It's empty in a new
   * shoe.
   */
  readonly discardPile: CardStack<C>;
}

/**
 * Settings for {@link shoe}.
 *
 * @example
 * ```ts
 * import { seededRandom, shoe, type ShoeOptions } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * // Two decks, with the cut card 80% of the way in.
 * const options: ShoeOptions = { penetration: 0.8, random: seededRandom(42) };
 * shoe(standard52(), 2, options).cutCard; // => 83
 * ```
 *
 * @since NEXT
 */
export interface ShoeOptions {
  /**
   * How far into the shoe the cut card goes, as the proportion of its cards
   * dealt before it's reached: a number from 0 to 1, rounded to the nearest
   * card, with a tie going to the later card (`Math.round`). Leave it out, or
   * pass `undefined`, for 0.75. At 0 the cut card is reached straight away, so
   * every round is the last before a reshuffle, and at 1 the whole shoe is
   * dealt first. Near 1, too few cards may be left behind the cut card to
   * finish a round, so check `cards.length` before dealing one, or deal with
   * `RunOut.STOP`.
   */
  readonly penetration?: number | undefined;

  /**
   * The random source to shuffle the shoe with. Leave it out, or pass
   * `undefined`, to use a secure source backed by `crypto.getRandomValues`,
   * made fresh for each shoe. Pass a fresh {@link seededRandom} source to get
   * the same shoe every time: a seeded source moves on with each use, so
   * reusing one gives a different shoe.
   */
  readonly random?: RandomSource | undefined;
}

/**
 * What {@link drawFromShoe} gives: the cards drawn and the shoe left, as a
 * frozen object holding a new frozen stack and a new frozen shoe.
 *
 * @typeParam C - The type of card in the shoe: a standard {@link Card} unless
 * you say otherwise.
 *
 * @example
 * ```ts
 * import { card, drawFromShoe, type ShoeDrawResult } from "deckshoes";
 *
 * const threeCards = {
 *   cards: [card("A", "S"), card("K", "H"), card("10", "D")],
 *   cutCard: 2,
 *   discardPile: [],
 * };
 * const result: ShoeDrawResult = drawFromShoe(threeCards);
 * result.cards; // => [card("A", "S")]
 * result.shoe; // => { cards: [card("K", "H"), card("10", "D")], cutCard: 1, discardPile: [] }
 * Object.isFrozen(result); // => true
 * ```
 *
 * @since NEXT
 */
export interface ShoeDrawResult<C = Card> {
  /** The cards drawn, in the order they had in the shoe, top first. */
  readonly cards: CardStack<C>;

  /** The shoe left after the draw, its cut card moved up by the cards drawn. */
  readonly shoe: Shoe<C>;
}

/**
 * What {@link dealFromShoe} gives: the hands and the shoe left, as a frozen
 * object holding a frozen array of hands, each a new frozen stack, and a new
 * frozen shoe.
 *
 * @typeParam C - The type of card in the shoe: a standard {@link Card} unless
 * you say otherwise.
 *
 * @example
 * ```ts
 * import { card, dealFromShoe, type ShoeDealResult } from "deckshoes";
 *
 * const threeCards = {
 *   cards: [card("A", "S"), card("K", "H"), card("10", "D")],
 *   cutCard: 2,
 *   discardPile: [],
 * };
 * const result: ShoeDealResult = dealFromShoe(threeCards, 2, 1);
 * result.hands; // => [[card("A", "S")], [card("K", "H")]]
 * result.shoe; // => { cards: [card("10", "D")], cutCard: 0, discardPile: [] }
 * Object.isFrozen(result.hands); // => true
 * ```
 *
 * @since NEXT
 */
export interface ShoeDealResult<C = Card> {
  /**
   * The hands, in the order they were dealt to. Each is in deal order, top
   * first: the first card dealt to a hand is its top card.
   */
  readonly hands: readonly CardStack<C>[];

  /** The shoe left after the deal, its cut card moved up by the cards dealt. */
  readonly shoe: Shoe<C>;
}

/**
 * Builds a shoe: copies of a deck shuffled together, to deal from as one, with
 * a cut card that marks when to reshuffle.
 *
 * The copies are stacked one on top of another and shuffled, with every order
 * equally likely, as {@link shuffle} does. The cut card goes in at the
 * `penetration`, three quarters of the way in unless you say otherwise. Take
 * cards out with {@link drawFromShoe} and {@link dealFromShoe}, which move the
 * cut card up as they go, and read them with any stack operation on
 * `shoe.cards`. Once the cut card's position is 0, it's been reached, and the
 * shoe is due for a reshuffle: build a new one.
 *
 * The deck is left untouched, frozen or not, and the shoe, its cards and its
 * discard pile, which starts empty, are new and frozen. Any deck works, including one with copies or with cards that
 * aren't standard cards. An empty deck gives an empty shoe, whose cut card has
 * already been reached.
 *
 * The shuffle gets its randomness from the `random` option. Leave the option
 * out to use a secure source, backed by `crypto.getRandomValues`. Pass a fresh
 * {@link seededRandom} source to make the shoe reproducible: the same seed
 * gives the same cards and cut card in every runtime and every 1.x release.
 *
 * Where the runtime has no `crypto.getRandomValues`, such as React Native
 * without a polyfill, building a shoe of two or more cards without a `random`
 * option throws the runtime's own error, not a deckshoes error.
 *
 * @typeParam C - The type of card in the deck.
 * @param deck - The deck to copy, top first.
 * @param deckCount - How many copies of the deck the shoe holds, an integer of
 * 1 or more.
 * @param options - Settings for the shoe: its penetration and random source.
 * @returns A new frozen shoe, holding the shuffled `cards`, the `cutCard`'s
 * position and an empty `discardPile`.
 * @throws {@link InvalidArgumentError} When `deck` isn't an array, `deckCount`
 * isn't an integer of 1 or more or makes a shoe of more than 2³² − 1 cards,
 * `options` isn't an object or is an array, its `penetration` isn't a number
 * from 0 to 1, or its `random` option isn't a function. Also when the random
 * source returns something other than a number from 0 up to 1, or keeps
 * returning values that have to be rejected.
 *
 * @example
 * ```ts
 * import { card, count, seededRandom, shoe } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * const sixDecks = shoe(standard52(), 6, { random: seededRandom(42) });
 * sixDecks.cards.length; // => 312
 * sixDecks.cards[0] === card("Q", "S"); // => true
 *
 * // Six copies of every card, shuffled together.
 * count(sixDecks.cards, ({ rank, suit }) => rank === "A" && suit === "S"); // => 6
 *
 * // The cut card goes three quarters of the way in, unless you say otherwise.
 * sixDecks.cutCard; // => 234
 * const halfway = shoe(standard52(), 6, {
 *   penetration: 0.5,
 *   random: seededRandom(42),
 * });
 * halfway.cutCard; // => 156
 *
 * // The same seed gives the same shoe, and the deck is left alone.
 * shoe(standard52(), 6, { random: seededRandom(42) }); // => sixDecks
 * standard52().length; // => 52
 *
 * shoe(standard52(), 0); // throws INVALID_ARGUMENT
 * shoe(standard52(), 6, { penetration: 1.5 }); // throws INVALID_ARGUMENT
 * ```
 *
 * @since NEXT
 */
export function shoe<C>(
  deck: CardStack<C>,
  deckCount: number,
  options: ShoeOptions = {},
): Shoe<C> {
  const problem =
    stackProblem(deck) ??
    countProblem(deckCount, "deck count", 1) ??
    optionsProblem(options, "{ penetration: 0.75 }");
  if (problem !== undefined) throw problem;
  // One copy of the deck, so each of its cards is read once (ADR 0004), however
  // many copies the shoe holds.
  const copied = copyStack(deck);
  const deckSize = copied.length;
  const size = deckSize * deckCount;
  if (size > MAX_CARDS) {
    const decks = `${String(deckCount)} decks of ${String(deckSize)} ${deckSize === 1 ? "card" : "cards"}`;
    throw new InvalidArgumentError(
      `Invalid deck count ${String(deckCount)}: ${decks} would hold more cards than an array can`,
    );
  }

  // Read each option once, as `unknown`: JavaScript callers can pass anything,
  // and a getter could give the check one value and the shoe another.
  const {
    penetration = DEFAULT_PENETRATION,
    random,
  }: Readonly<{
    penetration?: unknown;
    random?: unknown;
  }> = options;
  const settingProblem =
    (typeof penetration === "number" && penetration >= 0 && penetration <= 1
      ? undefined
      : new InvalidArgumentError(
          `Invalid penetration option ${display(penetration)}: expected a number from 0 to 1`,
        )) ?? randomProblem(random);
  if (settingProblem !== undefined) throw settingProblem;

  // The copies one on top of another, then shuffled. This order and the
  // rounding below are fixed for 1.x (ADR 0013): changing either changes every
  // seeded shoe.
  const stacked = Array.from(
    { length: size },
    (_, i) => copied[i % deckSize] as C,
  );
  return Object.freeze({
    cards: shuffle(stacked, { random: random as RandomSource | undefined }),
    // `|| 0` turns the -0 that a penetration of -0 gives into 0.
    cutCard: Math.round((penetration as number) * size) || 0,
    discardPile: Object.freeze([]),
  });
}

/**
 * Draws cards from the top of a shoe, returning them and the shoe left, with
 * its cut card moved up by the cards drawn.
 *
 * The cut card's position stops at 0, which means it's been reached and the
 * shoe is due for a reshuffle. Drawing can go on past it, as a dealer finishes
 * the round in play, until the shoe runs out.
 *
 * The shoe is left untouched. The cards drawn, the shoe left and the result
 * holding them are new and frozen, and the shoe left keeps the discard pile.
 * The shoe can come from
 * {@link deckshoes!shoe | shoe()}, or be any object with the same shape.
 *
 * Leave `count` out, or pass `undefined`, to draw one card. `cards` is a stack
 * either way, so it holds that one card rather than being the card.
 *
 * To take cards out without using them, putting them on the discard pile, use
 * {@link burn}.
 *
 * @typeParam C - The type of card in the shoe.
 * @param shoe - The shoe to draw from.
 * @param count - How many cards to draw, an integer of 0 or more: 1 if it's
 * left out or `undefined`.
 * @returns A frozen object holding the `cards` drawn, a new frozen stack, top
 * first, and the `shoe` left, a new frozen shoe.
 * @throws {@link InvalidArgumentError} When `shoe` isn't an object holding an
 * array of `cards`, a `cutCard` that's an integer from 0 to the number of
 * cards, and a `discardPile` that's an array or left out, or `count` isn't an
 * integer of 0 or more.
 * @throws {@link InsufficientCardsError} When `count` is more than the shoe
 * holds.
 *
 * @example
 * ```ts
 * import { card, drawFromShoe, seededRandom, shoe, type Shoe } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * const sixDecks = shoe(standard52(), 6, { random: seededRandom(42) });
 * const { cards, shoe: next } = drawFromShoe(sixDecks, 2);
 * cards; // => [card("Q", "S"), card("7", "D")]
 * next.cards.length; // => 310
 * next.cutCard; // => 232
 *
 * // Leave the count out to draw one card.
 * drawFromShoe(next).cards; // => [card("8", "D")]
 *
 * // The cut card stops at 0 once it's reached, and drawing can go on past it.
 * const nearlyDone: Shoe = {
 *   cards: [card("A", "S"), card("K", "H"), card("10", "D")],
 *   cutCard: 1,
 *   discardPile: [],
 * };
 * drawFromShoe(nearlyDone, 2).shoe; // => { cards: [card("10", "D")], cutCard: 0, discardPile: [] }
 *
 * drawFromShoe(sixDecks, 313); // throws INSUFFICIENT_CARDS
 * ```
 *
 * @since NEXT
 */
export function drawFromShoe<C>(shoe: Shoe<C>, count = 1): ShoeDrawResult<C> {
  const checked = readShoe(shoe);
  if (checked instanceof InvalidArgumentError) throw checked;
  const { cards, cutCard, discardPile } = checked;
  const problem = countProblem(count) ?? shortfall(count, cards);
  if (problem !== undefined) throw problem;
  const drawn = draw(cards, count);
  return Object.freeze({
    cards: drawn.cards,
    shoe: shoeAfter(drawn.remainder, cutCard, count, discardPile),
  });
}

/**
 * Deals cards from the top of a shoe into hands, returning the hands and the
 * shoe left, with its cut card moved up by the cards dealt.
 *
 * It deals just as {@link deal} does, and takes the same hand count, hand size
 * and options, so a shoe can be dealt in packets, or until it runs out with
 * `RunOut.STOP`. The cut card moves up by the cards actually dealt.
 *
 * The cut card's position stops at 0, which means it's been reached and the
 * shoe is due for a reshuffle. Dealing can go on past it, as a dealer finishes
 * the round in play, until the shoe runs out.
 *
 * The shoe is left untouched. Every hand, the shoe left and the result holding
 * them are new and frozen, as is `hands`, and the shoe left keeps the discard
 * pile. The shoe can come from
 * {@link deckshoes!shoe | shoe()}, or be any object with the same shape.
 *
 * @typeParam C - The type of card in the shoe.
 * @param shoe - The shoe to deal from.
 * @param handCount - How many hands to deal, as {@link deal} takes it.
 * @param handSize - How many cards each hand gets, as {@link deal} takes it.
 * @param options - Settings for the deal, as {@link deal} takes them.
 * @returns A frozen object holding the `hands`, in the order they were dealt
 * to, each a new frozen stack, top first, and the `shoe` left, a new frozen
 * shoe.
 * @throws {@link InvalidArgumentError} When `shoe` isn't an object holding an
 * array of `cards`, a `cutCard` that's an integer from 0 to the number of
 * cards, and a `discardPile` that's an array or left out, or when
 * {@link deal} would.
 * @throws {@link InsufficientCardsError} When {@link deal} would: when the
 * shoe holds too few cards for the deal, unless `runOut` is `RunOut.STOP`.
 *
 * @example
 * ```ts
 * import { card, dealFromShoe, seededRandom, shoe } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * const sixDecks = shoe(standard52(), 6, { random: seededRandom(42) });
 *
 * // Two cards each to three players and the dealer, one at a time.
 * const { hands, shoe: next } = dealFromShoe(sixDecks, 4, 2);
 * hands.map((hand) => hand.length); // => [2, 2, 2, 2]
 * hands[0]?.[1] === card("2", "H"); // => true
 * next.cutCard; // => 226
 *
 * // Deal round after round until the cut card is reached.
 * let current = sixDecks;
 * let rounds = 0;
 * while (current.cutCard > 0) {
 *   current = dealFromShoe(current, 4, 2).shoe;
 *   rounds += 1;
 * }
 * rounds; // => 30
 * current.cards.length; // => 72
 *
 * dealFromShoe(sixDecks, 4, 79); // throws INSUFFICIENT_CARDS
 * ```
 *
 * @since NEXT
 */
export function dealFromShoe<C>(
  shoe: Shoe<C>,
  handCount: number,
  handSize: HandSize,
  options?: DealOptions,
): ShoeDealResult<C> {
  const checked = readShoe(shoe);
  if (checked instanceof InvalidArgumentError) throw checked;
  const { cards, cutCard, discardPile } = checked;
  // deal checks the hand count, hand size and options itself, reading each
  // option once. Checking them here too would read them twice, so @throws
  // documents deal's errors instead of this body throwing them.
  const { hands, remainder } = deal(cards, handCount, handSize, options);
  return Object.freeze({
    hands,
    shoe: shoeAfter(
      remainder,
      cutCard,
      cards.length - remainder.length,
      discardPile,
    ),
  });
}

/**
 * Burns cards from the top of a shoe: moves them to the discard pile without
 * using them, returning the shoe left, with its cut card moved up by the cards
 * burned.
 *
 * The burned cards go on top of the discard pile, in the order they had in the
 * shoe, so peeking at `discardPile` shows them, as a dealer turns up a burn
 * card. The cut card's position stops at 0, which means it's been reached and
 * the shoe is due for a reshuffle. Burning can go on past it, until the shoe
 * runs out.
 *
 * The shoe is left untouched. The shoe left, its cards and its discard pile are
 * new and frozen. The shoe can come from {@link deckshoes!shoe | shoe()}, or be
 * any object with the same shape.
 *
 * Leave `count` out, or pass `undefined`, to burn one card.
 *
 * Only a shoe has a discard pile, so there's no `burn` for stacks: to take
 * cards off a stack without using them, {@link draw} them and keep the
 * remainder. A one-deck game that burns cards, such as hold'em, can use a shoe
 * of one deck.
 *
 * @typeParam C - The type of card in the shoe.
 * @param shoe - The shoe to burn cards from.
 * @param count - How many cards to burn, an integer of 0 or more: 1 if it's
 * left out or `undefined`.
 * @returns The shoe left, a new frozen shoe, with the burned cards on top of
 * its discard pile.
 * @throws {@link InvalidArgumentError} When `shoe` isn't an object holding an
 * array of `cards`, a `cutCard` that's an integer from 0 to the number of
 * cards, and a `discardPile` that's an array or left out, or `count` isn't an
 * integer of 0 or more.
 * @throws {@link InsufficientCardsError} When `count` is more than the shoe
 * holds.
 *
 * @example
 * ```ts
 * import { burn, card, seededRandom, shoe } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * const sixDecks = shoe(standard52(), 6, { random: seededRandom(42) });
 *
 * // Burn the top card, as a blackjack dealer does after shuffling.
 * const burned = burn(sixDecks);
 * burned.discardPile[0] === card("Q", "S"); // => true
 * burned.cards.length; // => 311
 * burned.cutCard; // => 233
 *
 * // Burned cards go on top of the pile, in the order they had in the shoe.
 * burn(burned, 2).discardPile; // => [card("7", "D"), card("8", "D"), card("Q", "S")]
 *
 * burn(sixDecks, 313); // throws INSUFFICIENT_CARDS
 * ```
 *
 * @since NEXT
 */
export function burn<C>(shoe: Shoe<C>, count = 1): Shoe<C> {
  const checked = readShoe(shoe);
  if (checked instanceof InvalidArgumentError) throw checked;
  const { cards, cutCard, discardPile } = checked;
  const problem = countProblem(count) ?? shortfall(count, cards);
  if (problem !== undefined) throw problem;
  const drawn = draw(cards, count);
  return shoeAfter(drawn.remainder, cutCard, count, [
    ...drawn.cards,
    ...discardPile,
  ]);
}
