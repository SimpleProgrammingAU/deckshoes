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
export {
  DeckshoesError,
  type DeckshoesErrorCode,
  type DeckshoesErrorMap,
  InsufficientCardsError,
  InvalidArgumentError,
  InvalidCardError,
  isDeckshoesError,
} from "./errors.ts";
export { type RandomSource, seededRandom } from "./random.ts";
export { type CardStack } from "./stack.ts";
