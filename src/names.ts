import type { Rank, Suit } from "./card.ts";

import {
  flagProblem,
  optionsProblem,
  unknownRank,
  unknownSuit,
} from "./internal/checks.ts";
import { lookup } from "./internal/lookup.ts";

/** The English name of each standard rank. */
const RANK_NAMES = /* @__PURE__ */ lookup<Rank, string>({
  A: "Ace",
  2: "Two",
  3: "Three",
  4: "Four",
  5: "Five",
  6: "Six",
  7: "Seven",
  8: "Eight",
  9: "Nine",
  10: "Ten",
  J: "Jack",
  Q: "Queen",
  K: "King",
});

/** A suit's name in the plural and the singular. */
interface SuitNames {
  readonly plural: string;
  readonly singular: string;
}

/** The English name of each standard suit. */
const SUIT_NAMES = /* @__PURE__ */ lookup<Suit, SuitNames>({
  S: { plural: "Spades", singular: "Spade" },
  H: { plural: "Hearts", singular: "Heart" },
  D: { plural: "Diamonds", singular: "Diamond" },
  C: { plural: "Clubs", singular: "Club" },
});

/**
 * Settings for {@link rankName}.
 *
 * @example
 * ```ts
 * import { rankName, type RankNameOptions } from "deckshoes";
 *
 * const options: RankNameOptions = { lowercase: true };
 * rankName("Q", options); // => "queen"
 * ```
 *
 * @since NEXT
 */
export interface RankNameOptions {
  /**
   * Whether to give the name in lower case, such as `"ace"` rather than
   * `"Ace"`. Leave it out, or pass `undefined` or `false`, for a capital.
   */
  readonly lowercase?: boolean | undefined;
}

/**
 * Settings for {@link suitName}.
 *
 * @example
 * ```ts
 * import { suitName, type SuitNameOptions } from "deckshoes";
 *
 * const options: SuitNameOptions = { lowercase: true, singular: true };
 * suitName("D", options); // => "diamond"
 * ```
 *
 * @since NEXT
 */
export interface SuitNameOptions {
  /**
   * Whether to give the name in lower case, such as `"spades"` rather than
   * `"Spades"`. Leave it out, or pass `undefined` or `false`, for a capital.
   */
  readonly lowercase?: boolean | undefined;

  /**
   * Whether to give the singular name, such as `"Diamond"`, as in a Diamond
   * flush, rather than `"Diamonds"`. Leave it out, or pass `undefined` or
   * `false`, for the plural.
   */
  readonly singular?: boolean | undefined;
}

/**
 * Returns the English name of a standard rank, such as `"Ace"` for `"A"` or
 * `"Ten"` for `"10"`.
 *
 * The name is capitalised unless you ask for lower case. TypeScript rejects
 * any other rank, and values that reach `rankName` without being
 * type-checked, such as user input, are checked when it runs.
 *
 * @param rank - The rank to name: `"A"`, `"2"` to `"10"`, `"J"`, `"Q"` or
 * `"K"`.
 * @param options - Settings for the name: whether it's in lower case.
 * @returns The rank's name: Ace, Two to Ten, Jack, Queen or King.
 * @throws {@link InvalidCardError} When `rank` isn't a standard rank.
 * @throws {@link InvalidArgumentError} When `options` isn't an object or is an
 * array, or its `lowercase` isn't `true` or `false`.
 *
 * @example
 * ```ts
 * import { card, type Rank, rankName } from "deckshoes";
 *
 * rankName("A"); // => "Ace"
 * rankName("10"); // => "Ten"
 * rankName(card("Q", "H").rank, { lowercase: true }); // => "queen"
 *
 * // Text from outside TypeScript is checked when it's named.
 * function nameOf(rank: string) {
 *   return rankName(rank as Rank);
 * }
 * nameOf("T"); // throws INVALID_CARD
 * ```
 *
 * @since NEXT
 */
export function rankName(rank: Rank, options: RankNameOptions = {}): string {
  const name = RANK_NAMES.get(rank);
  if (name === undefined) throw unknownRank(rank);
  const optionsError = optionsProblem(options, "{ lowercase: true }");
  if (optionsError !== undefined) throw optionsError;

  // Read each option once, as `unknown`: JavaScript callers can pass anything,
  // and a getter could give the check one value and the name another.
  const { lowercase = false }: Readonly<{ lowercase?: unknown }> = options;
  const problem = flagProblem(lowercase, "lowercase");
  if (problem !== undefined) throw problem;

  return lowercase === true ? name.toLowerCase() : name;
}

/**
 * Returns the English name of a standard suit, such as `"Diamonds"` for
 * `"D"`.
 *
 * The name is plural and capitalised unless you ask for the singular or for
 * lower case. TypeScript rejects any other suit, and values that reach
 * `suitName` without being type-checked, such as user input, are checked when
 * it runs.
 *
 * @param suit - The suit to name: `"S"`, `"H"`, `"D"` or `"C"`.
 * @param options - Settings for the name: whether it's singular, and whether
 * it's in lower case.
 * @returns The suit's name: Spades, Hearts, Diamonds or Clubs, or Spade,
 * Heart, Diamond or Club in the singular.
 * @throws {@link InvalidCardError} When `suit` isn't a standard suit.
 * @throws {@link InvalidArgumentError} When `options` isn't an object or is an
 * array, or its `lowercase` or `singular` isn't `true` or `false`.
 *
 * @example
 * ```ts
 * import { card, rankName, suitName } from "deckshoes";
 *
 * suitName("D"); // => "Diamonds"
 * suitName("D", { singular: true }); // => "Diamond"
 * suitName("S", { lowercase: true }); // => "spades"
 *
 * const ace = card("A", "S");
 * `${rankName(ace.rank)} of ${suitName(ace.suit)}`; // => "Ace of Spades"
 * ```
 *
 * @since NEXT
 */
export function suitName(suit: Suit, options: SuitNameOptions = {}): string {
  const names = SUIT_NAMES.get(suit);
  if (names === undefined) throw unknownSuit(suit);
  const optionsError = optionsProblem(options, "{ singular: true }");
  if (optionsError !== undefined) throw optionsError;

  // Read each option once, as `unknown`: JavaScript callers can pass anything,
  // and a getter could give the check one value and the name another.
  const {
    lowercase = false,
    singular = false,
  }: Readonly<{ lowercase?: unknown; singular?: unknown }> = options;
  const problem =
    flagProblem(lowercase, "lowercase") ?? flagProblem(singular, "singular");
  if (problem !== undefined) throw problem;

  const name = singular === true ? names.singular : names.plural;
  return lowercase === true ? name.toLowerCase() : name;
}
