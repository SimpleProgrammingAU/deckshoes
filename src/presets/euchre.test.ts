import { describe, expect, it } from "vitest";

import { short } from "../../test/helpers.ts";
import { card, isCard } from "../card.ts";
import { euchre } from "./euchre.ts";

describe("euchre", () => {
  // Fixed for 1.x (ADR 0008): new deck order without the 2s to 8s.
  it("is in new deck order without the 2s to 8s, top first", () => {
    const order = [
      "AH 9H 10H JH QH KH",
      "AC 9C 10C JC QC KC",
      "KD QD JD 10D 9D AD",
      "KS QS JS 10S 9S AS",
    ];
    expect(euchre().map((c) => short(c))).toStrictEqual(
      order.join(" ").split(" "),
    );
  });

  it("holds each standard card from 9 to ace once", () => {
    const deck = euchre();
    expect(deck).toHaveLength(24);
    expect(new Set(deck).size).toBe(24);
    expect(deck.every((c) => isCard(c))).toBe(true);
  });

  it("holds the same objects that card() returns", () => {
    for (const c of euchre()) expect(c).toBe(card(c.rank, c.suit));
  });

  it("returns the same frozen stack on every call", () => {
    const deck = euchre();
    expect(euchre()).toBe(deck);
    expect(Object.isFrozen(deck)).toBe(true);
  });
});
