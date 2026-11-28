import { InvalidCardError } from "../errors.ts";
import { display } from "./display.ts";

/** Looks up a card's rank, read once, in a table with an entry for every standard rank, as game helpers read cards (ADR 0015); returns the entry, or the error for a card without a standard rank at `position` of the stack `stackName` names, such as "the hand". A hole, `null` or a primitive has no rank. */
export function byRank<V>(
  card: unknown,
  table: ReadonlyMap<unknown, V>,
  position: number,
  stackName: string,
): InvalidCardError | V {
  const traits = card as Partial<Record<"rank", unknown>> | null | undefined;
  const rank = traits?.rank;
  const entry = table.get(rank);
  if (entry !== undefined) return entry;
  const shown =
    typeof card === "object" && card !== null
      ? `with rank ${display(rank)}`
      : display(card);
  return new InvalidCardError(
    `Invalid card ${shown} at position ${String(position)} of ${stackName}: expected a card with rank "A", "2" to "10", "J", "Q" or "K"`,
  );
}
