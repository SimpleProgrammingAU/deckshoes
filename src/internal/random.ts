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

/** 2³², the number of 32-bit values. */
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
