import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { type RandomSource, seededRandom } from "./random.ts";

/** Returns the next `count` values from `random`, as the 32-bit integers they come from. */
function take(random: RandomSource, count: number): number[] {
  return Array.from({ length: count }, () => random() * 2 ** 32);
}

/** Lets a test pass a seed that isn't a number, as untyped callers can. */
function asSeed(value: unknown): number {
  return value as number;
}

/** Returns what `run` throws, failing the test if it doesn't throw. */
function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error("Expected a throw, but nothing was thrown");
}

const seeds = fc.integer({ max: 0xff_ff_ff_ff, min: 0 });

describe("seededRandom", () => {
  // Checked against the reference C code for xoshiro128** 1.1, seeded with
  // the same splitmix32. These values are fixed for 1.x: if they change,
  // every seeded shuffle changes too.
  it.each([
    [
      0,
      [1_789_933_344, 44_971_166, 2_521_387_044, 3_848_737_593, 1_138_324_114],
    ],
    [
      1,
      [393_288_148, 2_174_103_013, 3_814_759_091, 2_092_745_082, 1_865_176_206],
    ],
    [42, [660_444_221, 3_652_823_732, 77_672_526, 910_233_633, 2_297_337_756]],
    [
      0xff_ff_ff_ff,
      [
        4_104_197_751, 1_825_856_343, 1_152_209_388, 2_427_537_429,
        3_685_145_430,
      ],
    ],
  ])("gives the pinned sequence for seed %i", (seed, expected) => {
    expect(take(seededRandom(seed), 5)).toStrictEqual(expected);
  });

  it("gives the same sequence for the same seed", () => {
    fc.assert(
      fc.property(seeds, (seed) => {
        expect(take(seededRandom(seed), 20)).toStrictEqual(
          take(seededRandom(seed), 20),
        );
      }),
    );
  });

  it("gives numbers from 0 up to 1 that are multiples of 2⁻³²", () => {
    fc.assert(
      fc.property(seeds, (seed) => {
        const random = seededRandom(seed);
        for (let i = 0; i < 100; i++) {
          const value = random();
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThan(1);
          expect(Number.isInteger(value * 2 ** 32)).toBe(true);
        }
      }),
    );
  });

  it("gives different seeds different first values", () => {
    fc.assert(
      fc.property(seeds, seeds, (a, b) => {
        fc.pre(a !== b);
        expect(seededRandom(a)()).not.toBe(seededRandom(b)());
      }),
    );
  });

  it("moves on with each call", () => {
    const random = seededRandom(42);
    const first = take(random, 3);
    expect(take(random, 3)).not.toStrictEqual(first);
    expect(new Set(first).size).toBe(3);
  });

  it("treats -0 as 0", () => {
    expect(take(seededRandom(-0), 5)).toStrictEqual(take(seededRandom(0), 5));
  });

  it.each([
    ["a negative seed", -1],
    ["2³²", 2 ** 32],
    ["a fraction", 1.5],
    ["NaN", NaN],
    ["Infinity", Infinity],
    ["-Infinity", -Infinity],
    ["a numeric string", "42"],
    ["a bigint", 42n],
    ["null", null],
    ["undefined", undefined],
    ["an object", {}],
  ])("rejects %s as a seed", (_label, seed) => {
    expect(thrownBy(() => seededRandom(asSeed(seed)))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });

  it("rejects any other value as a seed", () => {
    fc.assert(
      fc.property(
        fc
          .anything()
          .filter(
            (value) =>
              !(
                Number.isInteger(value) &&
                (value as number) >= 0 &&
                (value as number) <= 0xff_ff_ff_ff
              ),
          ),
        (seed) => {
          expect(thrownBy(() => seededRandom(asSeed(seed)))).toMatchObject({
            code: "INVALID_ARGUMENT",
          });
        },
      ),
    );
  });
});
