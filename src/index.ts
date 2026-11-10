/**
 * A lightweight, fully typed library for playing cards. Presets come from
 * {@link deckshoes/presets!}.
 *
 * @packageDocumentation
 * @module deckshoes
 */

export {
  card,
  type Card,
  type Color,
  isCard,
  type Rank,
  type Suit,
} from "./card.ts";
export { chain, type Chain, type TerminatedChain } from "./chain.ts";
export {
  cut,
  type CutOptions,
  insert,
  type InsertOptions,
  Position,
} from "./cut.ts";
export {
  deal,
  type DealOptions,
  type DealResult,
  HandSize,
  PacketSize,
  RunOut,
} from "./deal.ts";
export { draw, drawBottom, type DrawResult, peek, peekBottom } from "./draw.ts";
export {
  DeckshoesError,
  type DeckshoesErrorCode,
  type DeckshoesErrorMap,
  InsufficientCardsError,
  InvalidArgumentError,
  InvalidCardError,
  isDeckshoesError,
} from "./errors.ts";
export {
  rankName,
  type RankNameOptions,
  suitName,
  type SuitNameOptions,
} from "./names.ts";
export {
  formatCard,
  type FormatCardOptions,
  Notation,
  parseCard,
  tryParseCard,
} from "./notation.ts";
export { type RandomSource, seededRandom } from "./random.ts";
export { shuffle, type ShuffleOptions } from "./shuffle.ts";
export { type CardStack } from "./stack.ts";
