import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { CardStack } from "../stack.ts";

import {
  arraySubclasses,
  asStack,
  countingReads,
  nonArrays,
  nonRanks,
  stacks,
  thrownBy,
} from "../../test/helpers.ts";
import { type Card, card } from "../card.ts";
import { parseStack } from "../compact.ts";
import { handTotal, isBlackjack, isBust, isSoft } from "./hand.ts";

/** Each standard rank's value in blackjack, with an ace as 1, written out here rather than shared with the implementation. */
const VALUES: Readonly<Record<string, number>> = {
  A: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 10,
  Q: 10,
  K: 10,
};

/** Every total a hand can make, counting each ace as 1 or 11, lowest first. */
function totals(hand: readonly Card[]): number[] {
  const sum = hand.reduce((total, c) => total + (VALUES[c.rank] ?? NaN), 0);
  const aces = hand.filter((c) => c.rank === "A").length;
  return Array.from({ length: aces + 1 }, (_, elevens) => sum + 10 * elevens);
}

/** A hand's total by brute force: the highest it can make at 21 or under, or its lowest when every one is over. */
function oracleTotal(hand: readonly Card[]): number {
  const all = totals(hand);
  return all.findLast((total) => total <= 21) ?? Math.min(...all);
}

/** Whether a hand is soft by brute force: whether its best total counts an ace as 11. */
function oracleSoft(hand: readonly Card[]): boolean {
  return oracleTotal(hand) !== totals(hand)[0];
}

describe("hand totals", () => {
  // [hand, total, soft, blackjack, bust]
  it.each([
    ["", 0, false, false, false],
    ["AS", 11, true, false, false],
    ["7H", 7, false, false, false],
    ["AS AH", 12, true, false, false],
    ["AS 6H", 17, true, false, false],
    ["AS 6H KC", 17, false, false, false],
    ["10S 7H", 17, false, false, false],
    ["AS AH 9C", 21, true, false, false],
    ["AS KH", 21, true, true, false],
    ["KH AS", 21, true, true, false],
    ["10D AC", 21, true, true, false],
    ["JS AD", 21, true, true, false],
    ["QC AH", 21, true, true, false],
    ["7S 7H 7D", 21, false, false, false],
    ["AS 5H 5C", 21, true, false, false],
    ["AS KH 5C", 16, false, false, false],
    ["KS QH AC", 21, false, false, false],
    ["KS QH 2C", 22, false, false, true],
    ["AS AH AD AC 7S", 21, true, false, false],
    ["AS AH AD AC KS KH", 24, false, false, true],
    ["AS 9H", 20, true, false, false],
    ["KS QH", 20, false, false, false],
  ] as const)(
    "%s: %i, soft %s, blackjack %s, bust %s",
    (text, total, soft, blackjack, bust) => {
      const hand = parseStack(text);
      expect(handTotal(hand)).toBe(total);
      expect(isSoft(hand)).toBe(soft);
      expect(isBlackjack(hand)).toBe(blackjack);
      expect(isBust(hand)).toBe(bust);
    },
  );

  it("gives the best total at 21 or under, or the lowest when there's none, as brute force does", () => {
    fc.assert(
      fc.property(stacks(), (hand) => {
        expect(handTotal(hand)).toBe(oracleTotal(hand));
        expect(isSoft(hand)).toBe(oracleSoft(hand));
      }),
    );
  });

  it("doesn't depend on the order of the cards", () => {
    fc.assert(
      fc.property(stacks(), (hand) => {
        const reversed = hand.toReversed();
        expect(handTotal(reversed)).toBe(handTotal(hand));
        expect(isSoft(reversed)).toBe(isSoft(hand));
        expect(isBlackjack(reversed)).toBe(isBlackjack(hand));
      }),
    );
  });

  it("is soft only with an ace, at 21 or under", () => {
    fc.assert(
      fc.property(stacks(), (hand) => {
        if (!isSoft(hand)) return;
        expect(hand.some((c) => c.rank === "A")).toBe(true);
        expect(handTotal(hand)).toBeLessThanOrEqual(21);
      }),
    );
  });

  it("is bust exactly when the total is over 21", () => {
    fc.assert(
      fc.property(stacks(), (hand) => {
        expect(isBust(hand)).toBe(handTotal(hand) > 21);
      }),
    );
  });

  it("is a blackjack exactly when two cards total 21", () => {
    fc.assert(
      fc.property(stacks(), (hand) => {
        expect(isBlackjack(hand)).toBe(
          hand.length === 2 && handTotal(hand) === 21,
        );
      }),
    );
    const tens = parseStack("10S JH QD KC");
    for (const ten of tens) {
      expect(isBlackjack([card("A", "S"), ten])).toBe(true);
      expect(isBlackjack([ten, card("A", "S")])).toBe(true);
    }
  });

  it("gives the same answers for cloned cards, which it reads by rank", () => {
    fc.assert(
      fc.property(stacks(), (hand) => {
        const clone = structuredClone(hand);
        expect(handTotal(clone)).toBe(handTotal(hand));
        expect(isSoft(clone)).toBe(isSoft(hand));
        expect(isBlackjack(clone)).toBe(isBlackjack(hand));
        expect(isBust(clone)).toBe(isBust(hand));
      }),
    );
  });
});

describe.each([
  ["handTotal", handTotal],
  ["isSoft", isSoft],
  ["isBlackjack", isBlackjack],
  ["isBust", isBust],
] as const)("%s", (_name, operation: (hand: CardStack) => unknown) => {
  it("reads the length once and each card once, by index", () => {
    const { reads, stack } = countingReads(parseStack("AS 6H KC"));
    operation(stack);
    expect(reads.length).toBe(1);
    expect(reads.positions).toStrictEqual([1, 1, 1]);
  });

  it("leaves the hand untouched", () => {
    const hand = [...parseStack("AS 6H")];
    operation(hand);
    expect(hand).toStrictEqual(parseStack("AS 6H"));
    expect(Object.isFrozen(hand)).toBe(false);
  });

  it.each(arraySubclasses())(
    "gives what a plain array gives for %s, frozen or not",
    (_label, make) => {
      fc.assert(
        fc.property(stacks(), fc.boolean(), (hand, frozen) => {
          const given = frozen ? Object.freeze(make(hand)) : make(hand);
          expect(operation(given)).toBe(operation(hand));
        }),
      );
    },
  );

  it.each(nonArrays())("rejects %s as the hand", (_label, hand) => {
    expect(thrownBy(() => operation(asStack(hand)))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });

  it.each(nonRanks())(
    "rejects a card with %s as its rank, naming its position",
    (_label, rank) => {
      const hand = asStack([card("A", "S"), { rank, suit: "S" }]);
      expect(thrownBy(() => operation(hand))).toMatchObject({
        code: "INVALID_CARD",
        message: expect.stringMatching(
          /^Invalid card with rank .+ at position 1 of the hand: /u,
        ) as unknown,
      });
    },
  );

  it("rejects a hole in the hand, naming its position", () => {
    const hand: Card[] = [card("K", "H")];
    hand.length = 2;
    expect(thrownBy(() => operation(hand))).toMatchObject({
      code: "INVALID_CARD",
      message: expect.stringMatching(
        /^Invalid card undefined at position 1 of the hand: /u,
      ) as unknown,
    });
  });

  it.each([
    ["undefined", undefined, "undefined"],
    ["null", null, "null"],
    ["a string", "AS", '"AS"'],
    ["a number", 1, "1"],
  ])("rejects %s in the hand, naming its position", (_label, value, shown) => {
    const hand = asStack([card("K", "H"), value]);
    expect(thrownBy(() => operation(hand))).toMatchObject({
      code: "INVALID_CARD",
      message: `Invalid card ${shown} at position 1 of the hand: expected a card with rank "A", "2" to "10", "J", "Q" or "K"`,
    });
  });

  it("checks every card, even past the ones it needs", () => {
    const hand = asStack([card("A", "S"), card("K", "H"), null]);
    expect(thrownBy(() => operation(hand))).toMatchObject({
      code: "INVALID_CARD",
    });
  });
});
