/**
 * A lightweight, fully typed library for playing cards.
 *
 * @packageDocumentation
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
