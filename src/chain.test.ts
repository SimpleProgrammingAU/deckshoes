import fc from "fast-check";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CardStack } from "./stack.ts";

import {
  asShuffleOptions,
  asStack,
  nonArrays,
  seeds,
  stacks,
  stacksWithCounts,
  thrownBy,
} from "../test/helpers.ts";
import { card } from "./card.ts";
import { chain } from "./chain.ts";
import { draw, drawBottom, peek, peekBottom } from "./draw.ts";
import { standard52 } from "./presets/standard52.ts";
import { seededRandom } from "./random.ts";
import { shuffle } from "./shuffle.ts";

describe("chain", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("value", () => {
    it("returns the stack itself, frozen or not, and leaves it unchanged", () => {
      fc.assert(
        fc.property(stacks(), fc.boolean(), (original, frozen) => {
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
        fc.property(stacks(), seeds, (stack, seed) => {
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
        fc.property(stacks(), seeds, (stack, seed) => {
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
      ["a random source as the options", asShuffleOptions(seededRandom(42))],
    ])("throws what the shuffle function throws for %s", (_label, options) => {
      const chained = chain(standard52());
      expect(thrownBy(() => chained.shuffle(options))).toStrictEqual(
        thrownBy(() => shuffle(standard52(), options)),
      );
      expect(chained.value()).toBe(standard52());
    });
  });

  describe.each<
    readonly [
      name: "draw" | "drawBottom" | "peek" | "peekBottom",
      operation: (stack: CardStack, count?: number) => unknown,
    ]
  >([
    ["draw", draw],
    ["drawBottom", drawBottom],
    ["peek", peek],
    ["peekBottom", peekBottom],
  ])("%s", (name, operation) => {
    it("gives what the function gives", () => {
      fc.assert(
        fc.property(stacksWithCounts(), ({ count, stack }) => {
          expect(chain(stack)[name](count).value()).toStrictEqual(
            operation(stack, count),
          );
        }),
      );
    });

    it("uses the function's default when the count is left out or undefined", () => {
      const deck = standard52();
      expect(chain(deck)[name]().value()).toStrictEqual(operation(deck));
      expect(chain(deck)[name](undefined).value()).toStrictEqual(
        operation(deck),
      );
    });

    it.each([
      ["more cards than the stack holds", 53],
      ["a negative count", -1],
      ["a fraction", 1.5],
    ])("throws what the function throws for %s", (_label, count) => {
      const chained = chain(standard52());
      expect(thrownBy(() => chained[name](count))).toStrictEqual(
        thrownBy(() => operation(standard52(), count)),
      );
      expect(chained.value()).toBe(standard52());
    });

    it("leaves the chain it's called on holding its stack", () => {
      const deck = standard52();
      const before = chain(deck);
      before[name](2);
      expect(before.value()).toBe(deck);
    });

    it("returns a frozen chain that can only be unwrapped", () => {
      const terminated = chain(standard52())[name](2);
      expect(Object.isFrozen(terminated)).toBe(true);
      expect(terminated.value()).toBe(terminated.value());
      for (const method of [
        "draw",
        "drawBottom",
        "peek",
        "peekBottom",
        "shuffle",
      ]) {
        expect(terminated).not.toHaveProperty(method);
      }
    });
  });

  it("carries on after a draw by wrapping the remainder again", () => {
    const deck = standard52();
    const { remainder } = chain(deck).draw(2).value();
    expect(chain(remainder).draw().value()).toStrictEqual(
      draw(draw(deck, 2).remainder),
    );
  });

  it("carries on after a peek from the chain it was called on", () => {
    const shuffled = chain(standard52()).shuffle({ random: seededRandom(42) });
    const peeked = shuffled.peek(2).value();
    expect(shuffled.draw(2).value().cards).toStrictEqual(peeked);
  });

  it("returns a frozen chain, before and after an operation", () => {
    const chained = chain(standard52());
    expect(Object.isFrozen(chained)).toBe(true);
    expect(Object.isFrozen(chained.shuffle({ random: seededRandom(1) }))).toBe(
      true,
    );
  });

  it.each(nonArrays())("rejects %s as the stack", (_label, stack) => {
    expect(thrownBy(() => chain(asStack(stack)))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });
});
