import type { Card, Color, Rank, Suit } from "../card.ts";

/** Every standard rank. */
const RANKS: readonly Rank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

/** The colour of each standard suit. */
const COLORS: Readonly<Record<Suit, Color>> = {
  S: "black",
  H: "red",
  D: "red",
  C: "black",
};

/** Builds the one frozen object for each standard card, keyed by rank and then suit. */
function createTable(): ReadonlyMap<Rank, ReadonlyMap<Suit, Card>> {
  const table = new Map<Rank, ReadonlyMap<Suit, Card>>();
  for (const rank of RANKS) {
    const bySuit = new Map<Suit, Card>();
    for (const [suit, color] of Object.entries(COLORS) as [Suit, Color][]) {
      bySuit.set(suit, Object.freeze({ rank, suit, color }) as Card);
    }
    table.set(rank, bySuit);
  }
  return table;
}

/** Collects every card in a table into one set. */
function collectCards(
  table: ReadonlyMap<Rank, ReadonlyMap<Suit, Card>>,
): ReadonlySet<unknown> {
  return new Set([...table.values()].flatMap((bySuit) => [...bySuit.values()]));
}

/** The one object for each standard card, keyed by rank and then suit. */
export const CARD_TABLE: ReadonlyMap<
  Rank,
  ReadonlyMap<Suit, Card>
> = /* @__PURE__ */ createTable();

/** Every card in {@link CARD_TABLE}, for checking whether a value is a card. */
export const CARDS: ReadonlySet<unknown> =
  /* @__PURE__ */ collectCards(CARD_TABLE);
