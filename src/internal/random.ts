import type { RandomSource } from "../random.ts";

import { InvalidArgumentError } from "../errors.ts";
import { assert } from "./assert.ts";
import { display } from "./display.ts";

/**
 * The one part of the Web Crypto API deckshoes uses. The library is typed
 * without DOM or Node.js globals, so it declares this itself.
 */
declare const crypto: {
  getRandomValues(array: Uint32Array): Uint32Array;
};

/** 2³², the number of 32-bit values, which turns one into a number from 0 up to 1. */
const TWO_TO_THE_32 = 2 ** 32;

/** How many 32-bit values a {@link secureRandom} source asks crypto for at once, unless it's given another size. */
const POOL_SIZE = 256;

/** How many values in a row {@link randomIndex} rejects before deciding the source is broken. */
const MAX_REJECTIONS = 64;

/**
 * Returns a new secure random source, backed by `crypto.getRandomValues`, with
 * 32 bits in each value, asking crypto for `poolSize` values at a time: a
 * shuffle uses most of the default 256, and a single pick needs only 1. Each
 * operation makes its own and drops it when done, so no values from crypto are
 * kept between operations.
 */
export function secureRandom(poolSize: number = POOL_SIZE): RandomSource {
  const pool = new Uint32Array(poolSize);
  let next = poolSize;
  return () => {
    if (next === poolSize) {
      // If this throws, `next` stays put and the next call tries again.
      crypto.getRandomValues(pool);
      next = 0;
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- next < POOL_SIZE here
    const value = pool[next]!;
    next += 1;
    return value / TWO_TO_THE_32;
  };
}

/** Rotates a 32-bit integer left by `bits`, from 1 to 31. */
function rotateLeft(value: number, bits: number): number {
  return (value << bits) | (value >>> (32 - bits));
}

/** Returns xoshiro128** as a random source, its state expanded from a 32-bit `seed` by splitmix32. */
export function xoshiro128StarStar(seed: number): RandomSource {
  // splitmix32 expands the seed into xoshiro128**'s 128 bits of state. It
  // steps a 32-bit counter by 0x9E3779B9 and mixes each step with the hash
  // [16 21f0aaad 15 735a2d97 15] from Hash Prospector. The mix is a
  // bijection and the four counter values differ, so at most one word of
  // state is 0, and no seed gives the all-zero state.
  let counter = seed >>> 0;
  const splitmix32 = (): number => {
    counter = (counter + 0x9e_37_79_b9) >>> 0;
    let z = counter;
    z = Math.imul(z ^ (z >>> 16), 0x21_f0_aa_ad);
    z = Math.imul(z ^ (z >>> 15), 0x73_5a_2d_97);
    return (z ^ (z >>> 15)) >>> 0;
  };
  let s0 = splitmix32();
  let s1 = splitmix32();
  let s2 = splitmix32();
  let s3 = splitmix32();

  // xoshiro128** 1.1 by Blackman and Vigna, as in their reference C code.
  // Every step is 32-bit integer arithmetic that ECMAScript defines exactly
  // (Math.imul, shifts, xor), so every runtime gives the same sequence. Each
  // value is the 32-bit output divided by 2³².
  return () => {
    const result = Math.imul(rotateLeft(Math.imul(s1, 5), 7), 9) >>> 0;
    const t = s1 << 9;
    s2 ^= s0;
    s3 ^= s1;
    s1 ^= s2;
    s0 ^= s3;
    s2 ^= t;
    s3 = rotateLeft(s3, 11);
    return result / TWO_TO_THE_32;
  };
}

/**
 * Picks an integer from 0 to n − 1, each equally likely, from a random source.
 *
 * It splits the 2³² values of `floor(r × 2³²)` into n buckets of
 * `floor(2³² / n)` and returns the bucket the value falls in, calling the
 * source again when the value lands in the incomplete last bucket. It calls
 * the source even when n is 1. `n` must be an integer from 1 to 2³², which
 * callers guarantee, so anything else is a bug. This mapping is fixed for 1.x:
 * changing it changes every seeded result.
 */
export function randomIndex(n: number, random: RandomSource): number {
  // Checked before calling assert, so the message is only built for a bug:
  // a shuffle calls this once per card.
  if (!(Number.isInteger(n) && n >= 1 && n <= TWO_TO_THE_32)) {
    assert(
      false,
      `randomIndex needs an integer n from 1 to 2³², not ${String(n)}`,
    );
  }
  const size = Math.floor(TWO_TO_THE_32 / n);
  for (let rejections = 0; rejections < MAX_REJECTIONS; rejections++) {
    const value: unknown = random();
    if (!(typeof value === "number" && value >= 0 && value < 1)) {
      throw new InvalidArgumentError(
        `The random source returned ${display(value)}: expected a number from 0 up to, but not including, 1`,
      );
    }
    // `>>> 0` takes floor(r × 2³²), since r × 2³² is never negative, and
    // turns -0 into 0.
    const x = (value * TWO_TO_THE_32) >>> 0;
    const index = Math.floor(x / size);
    if (index < n) return index;
  }
  throw new InvalidArgumentError(
    `The random source returned ${String(MAX_REJECTIONS)} values in a row that had to be rejected, so it isn't working`,
  );
}

/**
 * Picks one of `choices` positions with {@link randomIndex}, from `random` or
 * a new secure source if it's `undefined`, calling the source only when there
 * is more than one choice. This is fixed for 1.x (ADR 0006): changing it
 * changes every seeded cut and insert.
 */
export function randomPosition(
  choices: number,
  random: RandomSource | undefined,
): number {
  // One pick almost always needs one value, so the secure source asks crypto
  // for one at a time rather than filling a pool it would throw away.
  return choices > 1 ? randomIndex(choices, random ?? secureRandom(1)) : 0;
}
