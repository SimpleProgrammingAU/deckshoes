import { describe, expect, it } from "vitest";

import { short } from "../../test/helpers.ts";
import { card, isCard } from "../card.ts";
import { piquet } from "./piquet.ts";

describe("piquet", () => {
  // Fixed for 1.x (ADR 0008): new deck order without the 2s to 6s.
  it("is in new deck order without the 2s to 6s, top first", () => {
    const order = [
      "AH 7H 8H 9H 10H JH QH KH",
      "AC 7C 8C 9C 10C JC QC KC",
      "KD QD JD 10D 9D 8D 7D AD",
      "KS QS JS 10S 9S 8S 7S AS",
    ];
    expect(piquet().map((c) => short(c))).toStrictEqual(
      order.join(" ").split(" "),
    );
  });

  it("holds each standard card from 7 to ace once", () => {
    const deck = piquet();
    expect(deck).toHaveLength(32);
    expect(new Set(deck).size).toBe(32);
    expect(deck.every((c) => isCard(c))).toBe(true);
  });

  it("holds the same objects that card() returns", () => {
    for (const c of piquet()) expect(c).toBe(card(c.rank, c.suit));
  });

  it("returns the same frozen stack on every call", () => {
    const deck = piquet();
    expect(piquet()).toBe(deck);
    expect(Object.isFrozen(deck)).toBe(true);
  });
});
