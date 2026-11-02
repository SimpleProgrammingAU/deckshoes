import type { RandomSource } from "../random.ts";

import { InvalidArgumentError } from "../errors.ts";
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

/** How many 32-bit values {@link secureRandom} asks crypto for at once. */
const POOL_SIZE = 256;

/** How many values in a row {@link randomIndex} rejects before deciding the source is broken. */
const MAX_REJECTIONS = 64;

/** Values from crypto that {@link secureRandom} hasn't handed out yet, allocated on first use. */
let pool: Uint32Array | undefined;

/** Where the next unused value in {@link pool} is; `POOL_SIZE` once they're all used. */
let next = POOL_SIZE;

/** The default random source: secure, backed by `crypto.getRandomValues`, with 32 bits in each value. */
export function secureRandom(): number {
  pool ??= new Uint32Array(POOL_SIZE);
  if (next === POOL_SIZE) {
    // If this throws, `next` stays put and the next call tries again.
    crypto.getRandomValues(pool);
    next = 0;
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- next < POOL_SIZE here
  const value = pool[next]!;
  next += 1;
  return value / TWO_TO_THE_32;
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
 * `floor(2³² / n)` and returns the bucket the value falls in, drawing again
 * when it lands in the incomplete last bucket. `n` must be an integer from 1
 * to 2³². This mapping is fixed for 1.x: changing it changes every seeded
 * result.
 */
export function randomIndex(n: number, random: RandomSource): number {
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
