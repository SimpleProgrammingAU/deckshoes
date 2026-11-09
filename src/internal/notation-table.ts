import type { Card, Suit } from "../card.ts";

import { rankName, suitName } from "../names.ts";
import { CARD_TABLE } from "./card-table.ts";

/** The symbol each standard suit is written with. */
export const SYMBOLS: Readonly<Record<Suit, string>> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};

/** The outline symbol for each standard suit, which parsing reads as well. */
const OUTLINE_SYMBOLS: Readonly<Record<Suit, string>> = {
  S: "♤",
  H: "♡",
  D: "♢",
  C: "♧",
};

/** What can follow a suit symbol: nothing, or a variation selector for text (U+FE0E) or emoji (U+FE0F). */
const SELECTORS: readonly string[] = ["", "\u{FE0E}", "\u{FE0F}"];

/** Builds the table of every text that parsing reads, lower-cased for A–Z, with the card it names. */
function createTextTable(): ReadonlyMap<string, Card> {
  const table = new Map<string, Card>();
  for (const [rank, bySuit] of CARD_TABLE) {
    const ranks = rank === "10" ? ["10", "t"] : [rank.toLowerCase()];
    const rankWords = rankName(rank, { lowercase: true });
    for (const [suit, card] of bySuit) {
      table.set(`${rankWords} of ${suitName(suit, { lowercase: true })}`, card);
      for (const written of ranks) {
        table.set(`${written}${suit.toLowerCase()}`, card);
        for (const symbol of [SYMBOLS[suit], OUTLINE_SYMBOLS[suit]]) {
          for (const selector of SELECTORS) {
            table.set(`${written}${symbol}${selector}`, card);
          }
        }
      }
    }
  }
  return table;
}

/** Returns the length of the longest key in a table. */
function longestKey(table: ReadonlyMap<string, unknown>): number {
  let longest = 0;
  for (const key of table.keys()) longest = Math.max(longest, key.length);
  return longest;
}

/** Every text that parsing reads, lower-cased for A–Z, with the card it names. */
const TEXT_TABLE = /* @__PURE__ */ createTextTable();

/** The length of the longest text parsing reads, so longer text is turned down without being lower-cased. */
const LONGEST_TEXT = /* @__PURE__ */ longestKey(TEXT_TABLE);

/** Returns the card that some text names in any notation, or `undefined` if it names none. Only A–Z change case, so a lookalike such as the Kelvin sign isn't read as K (ADR 0011). */
export function readCard(text: unknown): Card | undefined {
  return typeof text === "string" && text.length <= LONGEST_TEXT
    ? TEXT_TABLE.get(
        text.replaceAll(/[A-Z]/gu, (letter) => letter.toLowerCase()),
      )
    : undefined;
}
