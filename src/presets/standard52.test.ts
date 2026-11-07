import { describe, expect, it } from "vitest";

import { short } from "../../test/helpers.ts";
import { card, isCard } from "../card.ts";
import { standard52 } from "./standard52.ts";

describe("standard52", () => {
  // Fixed for 1.x (ADR 0008): every seeded shuffle of the deck starts here.
  it("is in new deck order, top first", () => {
    const order = [
      "AH 2H 3H 4H 5H 6H 7H 8H 9H 10H JH QH KH",
      "AC 2C 3C 4C 5C 6C 7C 8C 9C 10C JC QC KC",
      "KD QD JD 10D 9D 8D 7D 6D 5D 4D 3D 2D AD",
      "KS QS JS 10S 9S 8S 7S 6S 5S 4S 3S 2S AS",
    ];
    expect(standard52().map((c) => short(c))).toStrictEqual(
      order.join(" ").split(" "),
    );
  });

  it("holds each standard card once", () => {
    const deck = standard52();
    expect(deck).toHaveLength(52);
    expect(new Set(deck).size).toBe(52);
    expect(deck.every((c) => isCard(c))).toBe(true);
  });

  it("holds the same objects that card() returns", () => {
    for (const c of standard52()) expect(c).toBe(card(c.rank, c.suit));
  });

  it("returns the same frozen stack on every call", () => {
    const deck = standard52();
    expect(standard52()).toBe(deck);
    expect(Object.isFrozen(deck)).toBe(true);
  });
});
