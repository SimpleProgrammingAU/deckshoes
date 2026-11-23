import type { Shoe } from "../shoe.ts";
import type { CardStack } from "../stack.ts";

import { InvalidArgumentError } from "../errors.ts";
import { cardsProblem, countProblem } from "./checks.ts";
import { display } from "./display.ts";
import { copyStack } from "./stack.ts";

/** Reads a shoe's cards, cut card and discard pile once each, the stacks through `copyStack`, so a getter or a Proxy can't give the check one value and the operation another, and returns them, or the error for something that isn't a shoe. A missing discard pile is read as an empty one (ADR 0013). */
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
    cardsProblem(cards) ??
    (Array.isArray(discardPile)
      ? undefined
      : new InvalidArgumentError(
          `Invalid discard pile ${display(discardPile)}: expected an array of cards`,
        ));
  if (problem !== undefined) return problem;
  const copied = copyStack(cards as CardStack<C>);
  return (
    countProblem(cutCard, "cut card", 0, copied.length) ?? {
      cards: copied,
      cutCard: cutCard as number,
      discardPile: copyStack(discardPile as CardStack<C>),
    }
  );
}

/** The shoe left once `taken` cards come off the top: the remainder, with the cut card moved up by as many, stopping at 0, and the discard pile `pile`, frozen. */
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
