import type { Card, Rank, Suit } from "../card.ts";

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

/** U+1F0A0, the card back, where Unicode's Playing Cards block starts. */
const BLOCK_START = 0x1_f0_a0;

/** How far into the Playing Cards block each standard suit's row of 16 starts. */
const SUIT_ROWS: Readonly<Record<Suit, number>> = {
  S: 0x00,
  H: 0x10,
  D: 0x20,
  C: 0x30,
};

/** Where each standard rank sits in its suit's row. The knight, which isn't a standard card, is at 12, between the jack and the queen. */
const RANK_COLUMNS: Readonly<Record<Rank, number>> = {
  A: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  10: 10,
  J: 11,
  Q: 13,
  K: 14,
};

/** Returns a standard card's character from Unicode's Playing Cards block, such as 🂡 for the ace of spades. */
export function unicodeCharacter(card: Card): string {
  return String.fromCodePoint(
    BLOCK_START + SUIT_ROWS[card.suit] + RANK_COLUMNS[card.rank],
  );
}

/** Builds the table of every text that parsing reads, lower-cased for A–Z, with the card it names. */
function createTextTable(): ReadonlyMap<string, Card> {
  const table = new Map<string, Card>();
  for (const [rank, bySuit] of CARD_TABLE) {
    const ranks = rank === "10" ? ["10", "t"] : [rank.toLowerCase()];
    const rankWords = rankName(rank, { lowercase: true });
    for (const [suit, card] of bySuit) {
      table.set(`${rankWords} of ${suitName(suit, { lowercase: true })}`, card);
      table.set(unicodeCharacter(card), card);
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
