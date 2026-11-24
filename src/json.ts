import type { Card } from "./card.ts";
import type { Shoe } from "./shoe.ts";
import type { CardStack } from "./stack.ts";

import { InvalidArgumentError, InvalidCardError } from "./errors.ts";
import { stackProblem } from "./internal/checks.ts";
import { loadCard, loadStack } from "./internal/json.ts";
import { readShoe } from "./internal/shoe.ts";

/**
 * Loads a card saved as JSON, and returns the one card object it names.
 *
 * `JSON.stringify` writes a card as its `rank`, `suit` and `color`, such as
 * `{"rank":"10","suit":"H","color":"red"}`. Parse the JSON first, then pass
 * the result here: `JSON.parse` gives a plain object with those fields, which
 * isn't `===` to any card. A card cloned by `structuredClone` or
 * `postMessage`, or taken from another install of deckshoes, is the same kind
 * of object, and loads the same way.
 *
 * The rank and suit must be exactly as {@link card} takes them, so ten is
 * `"10"`, never `"T"`, and the colour must be its suit's. Any other field is
 * ignored. To load a stack or a shoe, use {@link stackFromJSON} or
 * {@link shoeFromJSON}.
 *
 * @param value - The card's JSON, already parsed, such as
 * `{ rank: "10", suit: "H", color: "red" }`.
 * @returns The one card object with that rank and suit.
 * @throws {@link InvalidCardError} When `value` isn't an object, its `rank` or
 * `suit` isn't standard, or its `color` isn't its suit's colour.
 *
 * @example
 * ```ts
 * import { card, cardFromJSON } from "deckshoes";
 *
 * const saved = JSON.stringify(card("10", "H"));
 * saved; // => '{"rank":"10","suit":"H","color":"red"}'
 * cardFromJSON(JSON.parse(saved)) === card("10", "H"); // => true
 *
 * // A cloned card is a plain object until it's loaded.
 * const clone = structuredClone(card("A", "S"));
 * clone === card("A", "S"); // => false
 * cardFromJSON(clone) === card("A", "S"); // => true
 *
 * // The colour has to be the suit's, and ten is "10".
 * cardFromJSON({ rank: "10", suit: "H", color: "black" }); // throws INVALID_CARD
 * cardFromJSON({ rank: "T", suit: "H", color: "red" }); // throws INVALID_CARD
 * ```
 *
 * @since NEXT
 */
export function cardFromJSON(value: unknown): Card {
  const loaded = loadCard(value, "");
  if (loaded instanceof InvalidCardError) throw loaded;
  return loaded;
}

/**
 * Loads a stack saved as JSON, and returns a new frozen stack of the card
 * objects it names, in the same order.
 *
 * `JSON.stringify` writes a stack as an array of cards, top first, each as its
 * `rank`, `suit` and `color`. Parse the JSON first, then pass the array here,
 * or pass a stack cloned by `structuredClone` or `postMessage`. Each card is
 * loaded as {@link cardFromJSON} loads it, and the error for one that can't be
 * names its position.
 *
 * @param value - The stack's JSON, already parsed: an array of cards.
 * @returns A new frozen stack of the card objects, top first.
 * @throws {@link InvalidArgumentError} When `value` isn't an array.
 * @throws {@link InvalidCardError} When a card in it isn't an object, its
 * `rank` or `suit` isn't standard, or its `color` isn't its suit's colour.
 *
 * @example
 * ```ts
 * import { card, deal, stackFromJSON } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * const { hands } = deal(standard52(), 2, 3);
 * const saved = JSON.stringify(hands[0]);
 * const hand = stackFromJSON(JSON.parse(saved));
 * hand; // => [card("A", "H"), card("3", "H"), card("5", "H")]
 * hand[0] === card("A", "H"); // => true
 *
 * // A card on its own isn't a stack, and every card needs its colour.
 * stackFromJSON({ rank: "A", suit: "H", color: "red" }); // throws INVALID_ARGUMENT
 * stackFromJSON([{ rank: "A", suit: "H" }]); // throws INVALID_CARD
 * ```
 *
 * @since NEXT
 */
export function stackFromJSON(value: unknown): CardStack {
  const problem = stackProblem(value);
  if (problem !== undefined) throw problem;
  const loaded = loadStack(value as CardStack<unknown>, "the stack");
  if (loaded instanceof InvalidCardError) throw loaded;
  return loaded;
}

/**
 * Loads a shoe saved as JSON, and returns a new frozen shoe of the card
 * objects it names, with the same cut card.
 *
 * `JSON.stringify` writes a shoe as its `cards`, `cutCard` and `discardPile`.
 * Parse the JSON first, then pass the object here. The shoe is checked as
 * every function that takes a shoe checks it, so a shoe saved without a
 * discard pile loads with an empty one, and each card is loaded as
 * {@link cardFromJSON} loads it.
 *
 * A random source isn't saved with a shoe, so a loaded shoe reshuffles with
 * whatever source you pass. The secure default needs nothing more. A fresh
 * {@link seededRandom} source with the original seed starts its sequence again,
 * repeating that seed's first reshuffles rather than carrying on, so save the
 * seed to use next with the shoe to make a loaded game repeatable.
 *
 * @param value - The shoe's JSON, already parsed: an object holding its
 * `cards`, `cutCard` and `discardPile`.
 * @returns A new frozen shoe of the card objects.
 * @throws {@link InvalidArgumentError} When `value` isn't an object holding an
 * array of `cards` and a `cutCard` that's an integer from 0 to the number of
 * cards, or its `discardPile` is there but isn't an array.
 * @throws {@link InvalidCardError} When a card in it isn't an object, its
 * `rank` or `suit` isn't standard, or its `color` isn't its suit's colour.
 *
 * @example
 * ```ts
 * import { burn, seededRandom, shoe, shoeFromJSON } from "deckshoes";
 * import { standard52 } from "deckshoes/presets";
 *
 * const sixDecks = burn(shoe(standard52(), 6, { random: seededRandom(42) }));
 * const saved = JSON.stringify(sixDecks);
 * const loaded = shoeFromJSON(JSON.parse(saved));
 * loaded; // => sixDecks
 * loaded.discardPile[0] === sixDecks.discardPile[0]; // => true
 *
 * // The cut card has to fall within the shoe's cards.
 * shoeFromJSON({ cards: [], cutCard: 1, discardPile: [] }); // throws INVALID_ARGUMENT
 * ```
 *
 * @since NEXT
 */
export function shoeFromJSON(value: unknown): Shoe {
  const checked = readShoe(value as Shoe<unknown>);
  if (checked instanceof InvalidArgumentError) throw checked;
  const cards = loadStack(checked.cards, "the shoe's cards");
  if (cards instanceof InvalidCardError) throw cards;
  const discardPile = loadStack(checked.discardPile, "the discard pile");
  if (discardPile instanceof InvalidCardError) throw discardPile;
  return Object.freeze({ cards, cutCard: checked.cutCard, discardPile });
}
