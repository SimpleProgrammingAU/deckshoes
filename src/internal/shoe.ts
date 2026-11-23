import type { Shoe } from "../shoe.ts";
import type { CardStack } from "../stack.ts";

import { InvalidArgumentError } from "../errors.ts";
import { cardsProblem, countProblem } from "./checks.ts";
import { display } from "./display.ts";
import { copyStack } from "./stack.ts";

/** Reads a shoe's cards and cut card once each, the cards through `copyStack`, so a getter or a Proxy can't give the check one value and the operation another, and returns them, or the error for something that isn't a shoe. */
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
  }: Readonly<{
    cards?: unknown;
    cutCard?: unknown;
  }> = value;
  const problem = cardsProblem(cards);
  if (problem !== undefined) return problem;
  const copied = copyStack(cards as CardStack<C>);
  return (
    countProblem(cutCard, "cut card", 0, copied.length) ?? {
      cards: copied,
      cutCard: cutCard as number,
    }
  );
}

/** The shoe left once `taken` cards come off the top: the remainder, with the cut card moved up by as many, stopping at 0. */
export function shoeAfter<C>(
  remainder: CardStack<C>,
  cutCard: number,
  taken: number,
): Shoe<C> {
  return Object.freeze({
    cards: remainder,
    cutCard: Math.max(0, cutCard - taken),
  });
}
