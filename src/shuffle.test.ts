import fc from "fast-check";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  arraySubclasses,
  asShuffleOptions,
  asStack,
  counted,
  isPlainFrozen,
  nonArrays,
  seeds,
  short,
  sparseStacks,
  stacks,
  thrownBy,
} from "../test/helpers.ts";
import { card } from "./card.ts";
import { standard52 } from "./presets/standard52.ts";
import { seededRandom } from "./random.ts";
import { shuffle } from "./shuffle.ts";

/** Counts how often each value appears, matching values the way `Map` keys do. */
function tally(values: readonly unknown[]): Map<unknown, number> {
  const counts = new Map<unknown, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

describe("shuffle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("with a seeded source", () => {
    it("keeps every card, copies included", () => {
      fc.assert(
        fc.property(stacks(), seeds, (stack, seed) => {
          const shuffled = shuffle(stack, { random: seededRandom(seed) });
          expect(tally(shuffled)).toStrictEqual(tally(stack));
        }),
      );
    });

    it("keeps every value of a stack of anything", () => {
      fc.assert(
        fc.property(fc.array(fc.anything()), seeds, (stack, seed) => {
          const shuffled = shuffle(stack, { random: seededRandom(seed) });
          expect(tally(shuffled)).toStrictEqual(tally(stack));
        }),
      );
    });

    it("leaves the input unchanged, frozen or not", () => {
      fc.assert(
        fc.property(stacks(), fc.boolean(), seeds, (original, frozen, seed) => {
          const stack = frozen ? Object.freeze([...original]) : [...original];
          shuffle(stack, { random: seededRandom(seed) });
          expect(stack).toHaveLength(original.length);
          expect(stack.every((c, i) => c === original[i])).toBe(true);
          expect(Object.isFrozen(stack)).toBe(frozen);
        }),
      );
    });

    it("gives the same order for the same seed", () => {
      fc.assert(
        fc.property(stacks(), seeds, (stack, seed) => {
          expect(shuffle(stack, { random: seededRandom(seed) })).toStrictEqual(
            shuffle(stack, { random: seededRandom(seed) }),
          );
        }),
      );
    });

    it("returns a new frozen stack, even with too few cards to move", () => {
      fc.assert(
        fc.property(stacks(), seeds, (stack, seed) => {
          const shuffled = shuffle(stack, { random: seededRandom(seed) });
          expect(shuffled).not.toBe(stack);
          expect(Object.isFrozen(shuffled)).toBe(true);
        }),
      );
    });

    it.each(arraySubclasses())(
      "gives a plain frozen stack in the same order as a plain array for %s, frozen or not",
      (_label, make) => {
        fc.assert(
          fc.property(stacks(), seeds, fc.boolean(), (stack, seed, frozen) => {
            const given = frozen ? Object.freeze(make(stack)) : make(stack);
            const shuffled = shuffle(given, { random: seededRandom(seed) });
            expect(shuffled).toStrictEqual(
              shuffle(stack, { random: seededRandom(seed) }),
            );
            expect(isPlainFrozen(shuffled)).toBe(true);
          }),
        );
      },
    );

    it("reads a hole as undefined", () => {
      fc.assert(
        fc.property(sparseStacks(), seeds, (stack, seed) => {
          // Spreading turns each hole into undefined, and toStrictEqual tells them apart.
          expect(shuffle(stack, { random: seededRandom(seed) })).toStrictEqual(
            shuffle([...stack], { random: seededRandom(seed) }),
          );
        }),
      );
    });

    it("calls the source once for each card but the top one", () => {
      fc.assert(
        fc.property(stacks(), (stack) => {
          // 0 is never rejected, so each pick calls the source exactly once.
          const random = counted(() => 0);
          shuffle(stack, { random });
          expect(random.calls).toBe(Math.max(stack.length - 1, 0));
        }),
      );
    });

    // Fixed for 1.x (ADR 0006): if this changes, every seeded shuffle changes.
    // Worked out separately from the reference algorithms, in Python.
    it("gives the pinned order for seed 42", () => {
      const order = [
        "7H 6C 10D JC 3H 4D 10C 9H 8S 2H AD 5C KS",
        "5H 8C 4S 7D 3D 8D QD 2C 7S 9D 4H 3S 6H",
        "4C 2D AS 6S 10H KD JD 9C AC 3C 2S QH QS",
        "10S QC KH 5D 5S 7C 6D JS KC JH AH 9S 8H",
      ];
      const shuffled = shuffle(standard52(), { random: seededRandom(42) });
      expect(shuffled.map((c) => short(c))).toStrictEqual(
        order.join(" ").split(" "),
      );
    });

    it("makes every order of 3 cards about equally likely", () => {
      // Each of the 6 orders should come up about 10000 times in 60000
      // shuffles, give or take about 91, so ±500 is about 5.5σ. The classic
      // biased shuffle, which swaps each card with any position, gives some
      // orders about 8900 times and others about 11100. One that can't reach
      // some orders, such as Sattolo's, gives 0 for those.
      const random = seededRandom(1);
      const hand = [card("A", "S"), card("K", "H"), card("10", "D")];
      const counts = tally(
        Array.from({ length: 60_000 }, () =>
          shuffle(hand, { random })
            .map((c) => short(c))
            .join(" "),
        ),
      );
      expect(counts.size).toBe(6);
      for (const count of counts.values()) {
        expect(count).toBeGreaterThan(9500);
        expect(count).toBeLessThan(10_500);
      }
    });
  });

  describe("with the default source", () => {
    it("gives each shuffle its own secure source", () => {
      const spy = vi.spyOn(crypto, "getRandomValues");
      const first = shuffle(standard52());
      const second = shuffle(standard52());
      // One pool of 256 values covers a 52-card shuffle, so a shared source
      // would only fill it once.
      expect(spy).toHaveBeenCalledTimes(2);
      expect(tally(first)).toStrictEqual(tally(standard52()));
      expect(tally(second)).toStrictEqual(tally(standard52()));
    });

    it("uses the secure source when random is undefined", () => {
      const spy = vi.spyOn(crypto, "getRandomValues");
      shuffle(standard52(), { random: undefined });
      expect(spy).toHaveBeenCalledOnce();
    });

    it("doesn't touch crypto when there are too few cards to move", () => {
      const spy = vi.spyOn(crypto, "getRandomValues");
      expect(shuffle([])).toStrictEqual([]);
      expect(shuffle([card("A", "S")])).toStrictEqual([card("A", "S")]);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("with bad options", () => {
    it.each([
      ["a number", 42],
      ["a numeric string", "0.5"],
      ["null", null],
      ["an object", {}],
      ["true", true],
      ["an array", [0.5]],
    ])("rejects %s as the random option", (_label, random) => {
      const spy = vi.spyOn(crypto, "getRandomValues");
      expect(
        thrownBy(() => shuffle([], asShuffleOptions({ random }))),
      ).toMatchObject({ code: "INVALID_ARGUMENT" });
      expect(spy).not.toHaveBeenCalled();
    });

    it.each(nonArrays())("rejects %s as the stack", (_label, stack) => {
      const random = counted(() => 0);
      expect(thrownBy(() => shuffle(asStack(stack), { random }))).toMatchObject(
        { code: "INVALID_ARGUMENT" },
      );
      expect(random.calls).toBe(0);
    });

    it.each([
      ["a random source", seededRandom(42)],
      ["null", null],
      ["a number", 42],
      ["a string", "random"],
    ])("rejects %s in place of the options object", (_label, options) => {
      expect(
        thrownBy(() => shuffle(standard52(), asShuffleOptions(options))),
      ).toMatchObject({ code: "INVALID_ARGUMENT" });
    });
  });

  describe("with a broken source", () => {
    it("gives up on a source that's stuck in the rejected values", () => {
      // 2³² − 1 is in the incomplete last bucket for 52 cards.
      const random = counted(() => 1 - Number.EPSILON);
      const stack = [...standard52()];
      expect(thrownBy(() => shuffle(stack, { random }))).toMatchObject({
        code: "INVALID_ARGUMENT",
      });
      expect(random.calls).toBe(64);
      expect(stack).toStrictEqual(standard52());
    });

    it.each([
      ["NaN", NaN],
      ["1", 1],
      ["a negative number", -0.5],
      ["a string", "0.5"],
    ])("rejects %s from the source", (_label, value) => {
      const stack = [...standard52()];
      expect(
        thrownBy(() => shuffle(stack, { random: counted(() => value) })),
      ).toMatchObject({ code: "INVALID_ARGUMENT" });
      expect(stack).toStrictEqual(standard52());
    });
  });
});
