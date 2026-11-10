import fc from "fast-check";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { RandomSource } from "./random.ts";
import type { CardStack } from "./stack.ts";

import {
  arraySubclasses,
  asStack,
  counted,
  isPlainFrozen,
  nonArrays,
  sameValues,
  seeds,
  sparseStacks,
  stacks,
  stacksWithCounts,
  thrownBy,
} from "../test/helpers.ts";
import { type Card, card } from "./card.ts";
import { cut, type CutOptions, insert, Position } from "./cut.ts";
import { standard52 } from "./presets/standard52.ts";
import { seededRandom } from "./random.ts";

const ACE = card("A", "S");
const KING = card("K", "H");
const TEN = card("10", "D");
const QUEEN = card("Q", "S");
const JACK = card("J", "C");
const hand = [ACE, KING, TEN];

/** The cards the shared tests insert, which aren't in {@link hand}. */
const INSERTED = [QUEEN, JACK];

/** What `cut` should give: the cards from `position` down, then the ones above it. */
function cutOracle(
  stack: readonly unknown[],
  position: number,
): readonly unknown[] {
  return [...stack.slice(position), ...stack.slice(0, position)];
}

/** What `insert` should give: the cards above `position`, then `cards`, then the rest. */
function insertOracle(
  stack: readonly unknown[],
  cards: readonly unknown[],
  position: number,
): readonly unknown[] {
  return [...stack.slice(0, position), ...cards, ...stack.slice(position)];
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each<
  readonly [
    name: string,
    operation: (
      stack: CardStack<unknown>,
      position?: Position,
      options?: CutOptions,
    ) => CardStack<unknown>,
    oracle: (stack: readonly unknown[], position: number) => readonly unknown[],
    choices: (size: number) => number,
    positionOf: (result: CardStack<unknown>) => number,
  ]
>([
  [
    "cut",
    cut,
    cutOracle,
    (size) => size,
    (result) => hand.indexOf(result[0] as Card),
  ],
  [
    "insert",
    (stack, position, options) => insert(stack, INSERTED, position, options),
    (stack, position) => insertOracle(stack, INSERTED, position),
    (size) => size + 1,
    (result) => result.indexOf(QUEEN),
  ],
])("%s", (_name, operation, oracle, choices, positionOf) => {
  describe("at a given position", () => {
    it("moves the cards as the oracle does", () => {
      fc.assert(
        fc.property(stacksWithCounts(), ({ count, stack }) => {
          expect(
            sameValues(operation(stack, count), oracle(stack, count)),
          ).toBe(true);
        }),
      );
    });

    it("keeps every value of a stack of anything, in order", () => {
      fc.assert(
        fc.property(
          stacksWithCounts(fc.array(fc.anything())),
          ({ count, stack }) => {
            expect(
              sameValues(operation(stack, count), oracle(stack, count)),
            ).toBe(true);
          },
        ),
      );
    });

    it("takes Position.BOTTOM as the stack's size", () => {
      fc.assert(
        fc.property(stacks(), (stack) => {
          expect(operation(stack, Position.BOTTOM)).toStrictEqual(
            operation(stack, stack.length),
          );
        }),
      );
    });

    it("counts -0 as 0", () => {
      expect(operation(hand, -0)).toStrictEqual(operation(hand, 0));
    });

    it("leaves the input unchanged, frozen or not", () => {
      fc.assert(
        fc.property(
          stacksWithCounts(),
          fc.boolean(),
          ({ count, stack: original }, frozen) => {
            const stack = frozen ? Object.freeze([...original]) : [...original];
            operation(stack, count);
            expect(sameValues(stack, original)).toBe(true);
            expect(Object.isFrozen(stack)).toBe(frozen);
          },
        ),
      );
    });

    it.each([
      ["the top", 0],
      ["the bottom", 3],
    ])("returns a new frozen stack at %s", (_label, position) => {
      const stack = Object.freeze([ACE, KING, TEN]);
      const result = operation(stack, position);
      expect(Object.isFrozen(result)).toBe(true);
      expect(result).not.toBe(stack);
    });

    it.each(arraySubclasses())(
      "gives a plain frozen stack holding the right cards for %s, frozen or not",
      (_label, make) => {
        fc.assert(
          fc.property(
            stacksWithCounts(),
            fc.boolean(),
            ({ count, stack }, frozen) => {
              const given = frozen ? Object.freeze(make(stack)) : make(stack);
              const result = operation(given, count);
              expect(result).toStrictEqual(operation(stack, count));
              expect(isPlainFrozen(result)).toBe(true);
            },
          ),
        );
      },
    );

    it("reads a hole as undefined", () => {
      fc.assert(
        fc.property(stacksWithCounts(sparseStacks()), ({ count, stack }) => {
          // Spreading turns each hole into undefined, and toStrictEqual tells them apart.
          expect(operation(stack, count)).toStrictEqual(
            operation([...stack], count),
          );
        }),
      );
    });

    it("never calls the source", () => {
      fc.assert(
        fc.property(stacksWithCounts(), ({ count, stack }) => {
          const random = counted(() => 0);
          operation(stack, count, { random });
          operation(stack, Position.BOTTOM, { random });
          expect(random.calls).toBe(0);
        }),
      );
    });
  });

  describe("at a random position", () => {
    it("uses Position.RANDOM when the position is left out or undefined", () => {
      fc.assert(
        fc.property(stacks(), seeds, (stack, seed) => {
          const expected = operation(stack, Position.RANDOM, {
            random: seededRandom(seed),
          });
          expect(
            operation(stack, undefined, { random: seededRandom(seed) }),
          ).toStrictEqual(expected);
        }),
      );
    });

    it("gives what the oracle gives at some position, the same for the same seed", () => {
      fc.assert(
        fc.property(stacks(), seeds, (stack, seed) => {
          const result = operation(stack, Position.RANDOM, {
            random: seededRandom(seed),
          });
          const fits = Array.from({ length: stack.length + 1 }, (_, position) =>
            sameValues(result, oracle(stack, position)),
          );
          expect(fits).toContain(true);
          expect(
            operation(stack, Position.RANDOM, { random: seededRandom(seed) }),
          ).toStrictEqual(result);
        }),
      );
    });

    it("calls the source once when there's more than one choice, and never otherwise", () => {
      fc.assert(
        fc.property(stacks(), (stack) => {
          // 0 is never rejected, so a pick calls the source exactly once.
          const random = counted(() => 0);
          operation(stack, Position.RANDOM, { random });
          expect(random.calls).toBe(choices(stack.length) > 1 ? 1 : 0);
        }),
      );
    });

    it("makes every position about equally likely", () => {
      // Each of the n positions should come up about 60000 / n times, give or
      // take at most about 116, so ±600 is over 5σ.
      const random = seededRandom(1);
      const counts = new Map<number, number>();
      for (let i = 0; i < 60_000; i++) {
        const position = positionOf(
          operation(hand, Position.RANDOM, { random }),
        );
        counts.set(position, (counts.get(position) ?? 0) + 1);
      }
      const n = choices(hand.length);
      expect(counts.size).toBe(n);
      for (const [position, count] of counts) {
        expect(position).toBeGreaterThanOrEqual(0);
        expect(position).toBeLessThan(n);
        expect(Math.abs(count - 60_000 / n)).toBeLessThan(600);
      }
    });

    it("uses a new secure source when random is left out or undefined", () => {
      const spy = vi.spyOn(crypto, "getRandomValues");
      operation(hand);
      operation(hand, Position.RANDOM, { random: undefined });
      // One pool of 256 values covers a pick, so a shared source would only
      // fill it once.
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("doesn't touch crypto when there's only one choice", () => {
      const spy = vi.spyOn(crypto, "getRandomValues");
      const small = [[], [ACE]].filter((stack) => choices(stack.length) <= 1);
      expect(small.length).toBeGreaterThan(0);
      for (const stack of small) operation(stack);
      expect(spy).not.toHaveBeenCalled();
    });

    it("gives up on a source that's stuck in the rejected values", () => {
      // 2³² − 1 is in the incomplete last bucket for 52 or 53 choices.
      const random = counted(() => 1 - Number.EPSILON);
      const stack = [...standard52()];
      expect(
        thrownBy(() => operation(stack, Position.RANDOM, { random })),
      ).toMatchObject({ code: "INVALID_ARGUMENT" });
      expect(random.calls).toBe(64);
      expect(stack).toStrictEqual(standard52());
    });

    it.each([
      ["NaN", NaN],
      ["1", 1],
      ["a string", "0.5"],
    ])("rejects %s from the source", (_label, value) => {
      expect(
        thrownBy(() =>
          operation(hand, Position.RANDOM, { random: counted(() => value) }),
        ),
      ).toMatchObject({ code: "INVALID_ARGUMENT" });
    });
  });

  describe("with bad arguments", () => {
    it.each([
      ["a negative number", -1],
      ["a fraction", 1.5],
      ["NaN", NaN],
      ["Infinity", Infinity],
      ["-Infinity", -Infinity],
      ["a numeric string", "2"],
      ["a string that isn't a named value", "top"],
      ["a named value's constant name", "BOTTOM"],
      ["null", null],
      ["a bigint", 2n],
      ["an array", [2]],
      ["an object", {}],
    ])(
      "rejects %s as the position, even on an empty stack",
      (_label, value) => {
        for (const stack of [hand, []]) {
          expect(
            thrownBy(() => operation(stack, value as Position)),
          ).toMatchObject({ code: "INVALID_ARGUMENT" });
        }
      },
    );

    it("rejects a position past the bottom", () => {
      fc.assert(
        fc.property(
          stacks(),
          fc.integer({ max: 1000, min: 1 }),
          (stack, extra) => {
            expect(
              thrownBy(() => operation(stack, stack.length + extra)),
            ).toMatchObject({ code: "INVALID_ARGUMENT" });
          },
        ),
      );
    });

    it.each(nonArrays())("rejects %s as the stack", (_label, stack) => {
      expect(thrownBy(() => operation(asStack(stack), 0))).toMatchObject({
        code: "INVALID_ARGUMENT",
      });
    });

    it.each([
      ["a number", 42],
      ["a numeric string", "0.5"],
      ["null", null],
      ["an object", {}],
      ["true", true],
      ["an array", [0.5]],
    ])(
      "rejects %s as the random option, even at a given position",
      (_label, random) => {
        const spy = vi.spyOn(crypto, "getRandomValues");
        for (const position of [0, Position.BOTTOM, Position.RANDOM]) {
          expect(
            thrownBy(() =>
              operation(hand, position, {
                random: random as RandomSource,
              }),
            ),
          ).toMatchObject({ code: "INVALID_ARGUMENT" });
        }
        expect(spy).not.toHaveBeenCalled();
      },
    );

    it.each([
      ["a random source", seededRandom(42)],
      ["null", null],
      ["a number", 42],
      ["a string", "random"],
    ])(
      "rejects %s in place of the options object, even at a given position",
      (_label, options) => {
        expect(
          thrownBy(() => operation(hand, 0, options as CutOptions)),
        ).toMatchObject({ code: "INVALID_ARGUMENT" });
      },
    );
  });
});

describe("cut", () => {
  it("is a rotation that a cut at the size less the position undoes", () => {
    fc.assert(
      fc.property(stacksWithCounts(), ({ count, stack }) => {
        const result = cut(stack, count);
        for (const [i, value] of result.entries()) {
          expect(value).toBe(stack[(i + count) % stack.length]);
        }
        expect(sameValues(cut(result, stack.length - count), stack)).toBe(true);
      }),
    );
  });

  it("leaves the order as it was at the top and the bottom", () => {
    expect(cut(hand, 0)).toStrictEqual(hand);
    expect(cut(hand, 3)).toStrictEqual(hand);
    expect(cut([], 0)).toStrictEqual([]);
  });

  it("keeps copies where the rotation puts them", () => {
    expect(cut([ACE, KING, ACE, TEN], 2)).toStrictEqual([ACE, TEN, ACE, KING]);
  });

  // Fixed for 1.x (ADR 0006): if this changes, every seeded cut changes. Seed
  // 42's first value is 660444221 / 2³², which is in bucket 7 of 52 (see
  // randomIndex's pinned indices).
  it("gives the pinned cut for seed 42", () => {
    const deck = standard52();
    expect(
      cut(deck, Position.RANDOM, { random: seededRandom(42) }),
    ).toStrictEqual(cutOracle(deck, 7));
  });
});

describe("insert", () => {
  it("puts the cards in at the position, in their order", () => {
    fc.assert(
      fc.property(stacksWithCounts(), stacks(), ({ count, stack }, cards) => {
        const result = insert(stack, cards, count);
        expect(result).toHaveLength(stack.length + cards.length);
        expect(sameValues(result, insertOracle(stack, cards, count))).toBe(
          true,
        );
      }),
    );
  });

  it("puts the first card at the position", () => {
    expect(insert(hand, [QUEEN, JACK], 1)).toStrictEqual([
      ACE,
      QUEEN,
      JACK,
      KING,
      TEN,
    ]);
    expect(insert(hand, [QUEEN], 0)[0]).toBe(QUEEN);
    expect(insert(hand, [QUEEN], Position.BOTTOM)[3]).toBe(QUEEN);
  });

  it("gives a copy of the stack for no cards", () => {
    fc.assert(
      fc.property(stacksWithCounts(), ({ count, stack }) => {
        expect(sameValues(insert(stack, [], count), stack)).toBe(true);
      }),
    );
  });

  it("can put a stack into itself", () => {
    expect(insert(hand, hand, 1)).toStrictEqual([
      ACE,
      ACE,
      KING,
      TEN,
      KING,
      TEN,
    ]);
  });

  it("leaves the cards unchanged, frozen or not", () => {
    fc.assert(
      fc.property(
        stacksWithCounts(),
        stacks(),
        fc.boolean(),
        ({ count, stack }, original, frozen) => {
          const cards = frozen ? Object.freeze([...original]) : [...original];
          insert(stack, cards, count);
          expect(sameValues(cards, original)).toBe(true);
          expect(Object.isFrozen(cards)).toBe(frozen);
        },
      ),
    );
  });

  it.each(arraySubclasses())(
    "gives a plain frozen stack holding the right cards for %s as the cards, frozen or not",
    (_label, make) => {
      fc.assert(
        fc.property(
          stacksWithCounts(),
          stacks(),
          fc.boolean(),
          ({ count, stack }, cards, frozen) => {
            const given = frozen ? Object.freeze(make(cards)) : make(cards);
            const result = insert(stack, given, count);
            expect(result).toStrictEqual(insert(stack, cards, count));
            expect(isPlainFrozen(result)).toBe(true);
          },
        ),
      );
    },
  );

  it("reads a hole in the cards as undefined", () => {
    fc.assert(
      fc.property(
        stacksWithCounts(),
        sparseStacks(),
        ({ count, stack }, cards) => {
          expect(insert(stack, cards, count)).toStrictEqual(
            insert(stack, [...cards], count),
          );
        },
      ),
    );
  });

  it.each(nonArrays())("rejects %s as the cards", (_label, cards) => {
    expect(thrownBy(() => insert(hand, asStack(cards), 0))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });

  // Fixed for 1.x (ADR 0006): if this changes, every seeded insert changes.
  // Seed 42's first value is 660444221 / 2³², which is in bucket 8 of 53.
  it("gives the pinned position for seed 42", () => {
    const deck = standard52();
    expect(
      insert(deck, [QUEEN], Position.RANDOM, { random: seededRandom(42) }),
    ).toStrictEqual(insertOracle(deck, [QUEEN], 8));
  });
});
