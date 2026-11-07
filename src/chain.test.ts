import fc from "fast-check";
import { afterEach, describe, expect, it, vi } from "vitest";

import { thrownBy } from "../test/helpers.ts";
import { type Card, card } from "./card.ts";
import { chain } from "./chain.ts";
import { standard52 } from "./presets/standard52.ts";
import { seededRandom } from "./random.ts";
import { shuffle, type ShuffleOptions } from "./shuffle.ts";

/** Lets a test pass a stack that isn't an array, as untyped callers can. */
function asStack(value: unknown): readonly Card[] {
  return value as readonly Card[];
}

/** Lets a test pass options that aren't `ShuffleOptions`, as untyped callers can. */
function asOptions(value: unknown): ShuffleOptions {
  return value as ShuffleOptions;
}

const seeds = fc.integer({ max: 0xff_ff_ff_ff, min: 0 });

/** Stacks of standard cards, copies allowed, from none up to two decks' worth. */
const stacks = fc.array(fc.constantFrom(...standard52()), { maxLength: 104 });

describe("chain", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("value", () => {
    it("returns the stack itself, frozen or not, and leaves it unchanged", () => {
      fc.assert(
        fc.property(stacks, fc.boolean(), (original, frozen) => {
          const stack = frozen ? Object.freeze([...original]) : [...original];
          expect(chain(stack).value()).toBe(stack);
          expect(stack).toStrictEqual(original);
          expect(Object.isFrozen(stack)).toBe(frozen);
        }),
      );
    });
  });

  describe("shuffle", () => {
    it("gives what the shuffle function gives", () => {
      fc.assert(
        fc.property(stacks, seeds, (stack, seed) => {
          expect(
            chain(stack)
              .shuffle({ random: seededRandom(seed) })
              .value(),
          ).toStrictEqual(shuffle(stack, { random: seededRandom(seed) }));
        }),
      );
    });

    it("passes the same random source on to each shuffle", () => {
      fc.assert(
        fc.property(stacks, seeds, (stack, seed) => {
          const chained = seededRandom(seed);
          const called = seededRandom(seed);
          expect(
            chain(stack)
              .shuffle({ random: chained })
              .shuffle({ random: chained })
              .value(),
          ).toStrictEqual(
            shuffle(shuffle(stack, { random: called }), { random: called }),
          );
        }),
      );
    });

    it("returns a new chain and leaves the old one holding its stack", () => {
      const deck = standard52();
      const before = chain(deck);
      const after = before.shuffle({ random: seededRandom(42) });
      expect(after).not.toBe(before);
      expect(before.value()).toBe(deck);
      expect(after.value()[0]).toBe(card("7", "H"));
    });

    it("uses the secure source when there are no options, or random is undefined", () => {
      const spy = vi.spyOn(crypto, "getRandomValues");
      chain(standard52()).shuffle();
      expect(spy).toHaveBeenCalledOnce();
      chain(standard52()).shuffle({ random: undefined });
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it.each([
      ["a random source that returns 1", { random: () => 1 }],
      ["a random source as the options", asOptions(seededRandom(42))],
    ])("throws what the shuffle function throws for %s", (_label, options) => {
      const chained = chain(standard52());
      expect(thrownBy(() => chained.shuffle(options))).toStrictEqual(
        thrownBy(() => shuffle(standard52(), options)),
      );
      expect(chained.value()).toBe(standard52());
    });
  });

  it("returns a frozen chain, before and after an operation", () => {
    const chained = chain(standard52());
    expect(Object.isFrozen(chained)).toBe(true);
    expect(Object.isFrozen(chained.shuffle({ random: seededRandom(1) }))).toBe(
      true,
    );
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["a string", "AS KH"],
    ["a one-character string", "A"],
    ["a Set", new Set(standard52())],
    ["an array-like object", { 0: card("A", "S"), length: 1 }],
  ])("rejects %s as the stack", (_label, stack) => {
    expect(thrownBy(() => chain(asStack(stack)))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });
});
