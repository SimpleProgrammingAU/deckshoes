import { InvalidArgumentError } from "./errors.ts";
import { display } from "./internal/display.ts";

/**
 * Where an operation that needs randomness, such as a shuffle, gets it: a
 * function returning a number from 0 up to, but not including, 1.
 *
 * It has the same shape as `Math.random`, so `Math.random` and most
 * third-party sources work as they are. Operations take one as their `random`
 * option and use a secure source, backed by `crypto.getRandomValues`, when
 * none is passed. Pass {@link seededRandom} to make results reproducible.
 *
 * deckshoes reads 32 bits from each value, so its results are exactly unbiased
 * for any source with at least 32 bits of resolution, which includes
 * `Math.random` in every major engine. A value that isn't a number from 0 up
 * to 1, `NaN` included, throws {@link InvalidArgumentError} when an operation
 * uses it.
 *
 * @example
 * ```ts
 * import { type RandomSource, seededRandom } from "deckshoes";
 *
 * const seeded: RandomSource = seededRandom(7);
 * const value = seeded();
 * value >= 0 && value < 1; // => true
 *
 * // Math.random has the same shape, so it's a random source too.
 * const fast: RandomSource = Math.random;
 * typeof fast(); // => "number"
 * ```
 *
 * @since NEXT
 */
export type RandomSource = () => number;

/** The largest seed, 2³² − 1. */
const MAX_SEED = 0xff_ff_ff_ff;

/** 2³², which turns a 32-bit integer into a number from 0 up to 1. */
const TWO_TO_THE_32 = 2 ** 32;

/**
 * Rotates a 32-bit integer left, as xoshiro128** does.
 *
 * @param value - The integer to rotate.
 * @param bits - How many bits to rotate it by, from 1 to 31.
 * @returns The rotated integer, as a signed 32-bit value.
 */
function rotateLeft(value: number, bits: number): number {
  return (value << bits) | (value >>> (32 - bits));
}

/**
 * Returns a random source that gives the same sequence for the same seed, in
 * every runtime.
 *
 * Each call moves the source on, so passing one source to two shuffles gives
 * two different orders. To repeat a result, make a fresh source with the same
 * seed. Every value is a multiple of 2⁻³², and the sequence for each seed
 * won't change in any 1.x release.
 *
 * A seeded source is predictable from what it returns, so use it for tests,
 * examples and replays, not where an opponent could gain from guessing the
 * next card. Leave the `random` option out to get the secure default instead.
 *
 * To make a game you can replay, pick a seed, record it, and seed the source
 * with it. The seed has to fit in 32 bits, so reduce a larger number, such as
 * `Date.now()`, first.
 *
 * @param seed - An integer from 0 to 2³² − 1 (4294967295).
 * @returns A random source whose sequence depends only on `seed`.
 * @throws {@link InvalidArgumentError} When `seed` isn't an integer from 0 to
 * 2³² − 1.
 *
 * @example
 * ```ts
 * import { seededRandom } from "deckshoes";
 *
 * const random = seededRandom(42);
 * random(); // => 0.15377165307290852
 * random(); // => 0.8504893006756902
 *
 * // A fresh source with the same seed starts the sequence again.
 * seededRandom(42)(); // => 0.15377165307290852
 *
 * // A seed you can record, so the game can be replayed.
 * const seed = Math.floor(Math.random() * 2 ** 32);
 * const replayable = seededRandom(seed);
 * typeof replayable(); // => "number"
 *
 * // A larger number has to be reduced to 32 bits first.
 * seededRandom(Date.now() % 2 ** 32);
 * seededRandom(Date.now()); // throws INVALID_ARGUMENT
 * seededRandom(1.5); // throws INVALID_ARGUMENT
 * ```
 *
 * @since NEXT
 */
export function seededRandom(seed: number): RandomSource {
  if (!(Number.isInteger(seed) && seed >= 0 && seed <= MAX_SEED)) {
    throw new InvalidArgumentError(
      `Invalid seed ${display(seed)}: expected an integer from 0 to ${String(MAX_SEED)}`,
    );
  }

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
  // (Math.imul, shifts, xor), so every runtime gives the same sequence.
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
