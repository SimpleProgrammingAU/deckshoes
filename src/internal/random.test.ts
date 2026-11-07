import fc from "fast-check";
import { afterEach, describe, expect, it, vi } from "vitest";

import { thrownBy } from "../../test/helpers.ts";
import { isDeckshoesError } from "../errors.ts";
import { type RandomSource, seededRandom } from "../random.ts";
import { randomIndex, secureRandom } from "./random.ts";

/** A random source that returns each 32-bit integer as a value from 0 up to 1, and counts its calls. */
function source(...integers: number[]): RandomSource & { calls: number } {
  const random = Object.assign(
    () => {
      const integer = integers[random.calls];
      random.calls += 1;
      if (integer === undefined)
        throw new Error("The source was called too often");
      return integer / 2 ** 32;
    },
    { calls: 0 },
  );
  return random;
}

/** Lets a test return a value that isn't a number, as untyped sources can. */
function returning(value: unknown): RandomSource {
  return () => value as number;
}

/** A count from 1 to 2³², and an index below it. */
const countAndIndex = fc
  .integer({ max: 2 ** 32, min: 1 })
  .chain((n) => fc.tuple(fc.constant(n), fc.integer({ max: n - 1, min: 0 })));

describe("randomIndex", () => {
  // Fixed for 1.x: if these change, every seeded shuffle changes too.
  // Worked out from the reference C outputs for seed 42.
  it("gives the pinned indices for seed 42, as a shuffle of 52 cards draws them", () => {
    const random = seededRandom(42);
    const indices = Array.from({ length: 10 }, (_, i) =>
      randomIndex(52 - i, random),
    );
    expect(indices).toStrictEqual([7, 43, 0, 10, 25, 41, 33, 19, 25, 34]);
  });

  it("splits the values into n buckets of equal size", () => {
    fc.assert(
      fc.property(countAndIndex, ([n, i]) => {
        const size = Math.floor(2 ** 32 / n);
        expect(randomIndex(n, source(i * size))).toBe(i);
        expect(randomIndex(n, source((i + 1) * size - 1))).toBe(i);
      }),
    );
  });

  it("puts the buckets for 52 cards where they should be", () => {
    const size = 82_595_524; // floor(2³² / 52)
    expect(randomIndex(52, source(0))).toBe(0);
    expect(randomIndex(52, source(size - 1))).toBe(0);
    expect(randomIndex(52, source(size))).toBe(1);
    expect(randomIndex(52, source(52 * size - 1))).toBe(51);
  });

  it("draws again when a value lands in the incomplete last bucket", () => {
    fc.assert(
      fc.property(countAndIndex, ([n, i]) => {
        const size = Math.floor(2 ** 32 / n);
        fc.pre(n * size < 2 ** 32);
        const random = source(n * size, 2 ** 32 - 1, i * size);
        expect(randomIndex(n, random)).toBe(i);
        expect(random.calls).toBe(3);
      }),
    );
  });

  it("always gives an integer below n", () => {
    fc.assert(
      fc.property(
        fc.integer({ max: 2 ** 32, min: 1 }),
        fc.double({ max: 1, maxExcluded: true, min: 0, noNaN: true }),
        (n, value) => {
          // If `value` lands in the last bucket, 0 is drawn next.
          const random = source((value * 2 ** 32) >>> 0, 0);
          const result = randomIndex(n, random);
          expect(Number.isInteger(result)).toBe(true);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThan(n);
        },
      ),
    );
  });

  it.each([
    ["0", 0],
    ["a fraction", 2.5],
    ["more than 2³²", 2 ** 32 + 1],
    ["NaN", NaN],
  ])("treats %s as n as a bug, without drawing", (_label, n) => {
    const random = source();
    const error = thrownBy(() => randomIndex(n, random));
    expect(isDeckshoesError(error)).toBe(false);
    expect(error).toBeInstanceOf(Error);
    expect(random.calls).toBe(0);
  });

  it("draws once for a single card", () => {
    const random = source(2 ** 32 - 1);
    expect(randomIndex(1, random)).toBe(0);
    expect(random.calls).toBe(1);
  });

  it("accepts the smallest and largest values below 1", () => {
    expect(
      Object.is(
        randomIndex(52, () => -0),
        0,
      ),
    ).toBe(true);
    expect(randomIndex(52, () => Number.MIN_VALUE)).toBe(0);
    expect(randomIndex(2, () => 1 - 2 ** -53)).toBe(1);
  });

  it("gives up on a stuck source after 64 rejections in a row", () => {
    let calls = 0;
    const stuck = () => {
      calls += 1;
      return 1 - Number.EPSILON;
    };
    expect(thrownBy(() => randomIndex(52, stuck))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
    expect(calls).toBe(64);
  });

  it("accepts a value after 63 rejections in a row", () => {
    const random = source(...Array.from({ length: 63 }, () => 2 ** 32 - 1), 0);
    expect(randomIndex(52, random)).toBe(0);
    expect(random.calls).toBe(64);
  });

  it.each([
    ["NaN", NaN],
    ["1", 1],
    ["a number above 1", 1.5],
    ["a negative number", -0.1],
    ["Infinity", Infinity],
    ["-Infinity", -Infinity],
    ["a numeric string", "0.5"],
    ["null", null],
    ["undefined", undefined],
    ["a bigint", 0n],
    ["a Number object", new Object(0.5)],
  ])("rejects %s from the source", (_label, value) => {
    expect(thrownBy(() => randomIndex(52, returning(value)))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });

  it("rejects any other value from the source", () => {
    fc.assert(
      fc.property(
        fc
          .oneof(fc.anything(), fc.double())
          .filter(
            (value) => !(typeof value === "number" && value >= 0 && value < 1),
          ),
        (value) => {
          expect(
            thrownBy(() => randomIndex(52, returning(value))),
          ).toMatchObject({ code: "INVALID_ARGUMENT" });
        },
      ),
    );
  });
});

describe("secureRandom", () => {
  /** Fills each array crypto is asked to fill with the integers counting up from 0. */
  function countUp(): typeof crypto.getRandomValues {
    let next = 0;
    return (array) => {
      if (array instanceof Uint32Array) {
        for (let i = 0; i < array.length; i++) array[i] = next++;
      }
      return array;
    };
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("gives numbers from 0 up to 1 that are multiples of 2⁻³²", () => {
    const random = secureRandom();
    for (let i = 0; i < 1000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      expect(Number.isInteger(value * 2 ** 32)).toBe(true);
    }
  });

  it("doesn't touch crypto until a source is used", async () => {
    const spy = vi.spyOn(crypto, "getRandomValues");
    vi.resetModules();
    const module = await import("./random.ts");
    const random = module.secureRandom();
    expect(spy).not.toHaveBeenCalled();
    random();
    expect(spy).toHaveBeenCalledOnce();
  });

  it("hands out crypto's values in order, asking for 256 at a time", () => {
    const spy = vi
      .spyOn(crypto, "getRandomValues")
      .mockImplementation(countUp());
    const random = secureRandom();
    const values = Array.from({ length: 513 }, () => random() * 2 ** 32);
    expect(values).toStrictEqual(Array.from({ length: 513 }, (_, i) => i));
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("gives each source its own values", () => {
    const spy = vi
      .spyOn(crypto, "getRandomValues")
      .mockImplementation(countUp());
    const first = secureRandom();
    const second = secureRandom();
    expect(first() * 2 ** 32).toBe(0);
    expect(second() * 2 ** 32).toBe(256);
    expect(first() * 2 ** 32).toBe(1);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("tries crypto again after it throws", () => {
    const spy = vi
      .spyOn(crypto, "getRandomValues")
      .mockImplementation(countUp())
      .mockImplementationOnce(() => {
        throw new Error("No randomness available");
      });
    const random = secureRandom();
    expect(() => random()).toThrow("No randomness available");
    expect(random()).toBe(0);
    expect(random() * 2 ** 32).toBe(1);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
