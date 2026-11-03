import { InvalidArgumentError } from "./errors.ts";
import { display } from "./internal/display.ts";
import { xoshiro128StarStar } from "./internal/random.ts";

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
 * @since 1.0.0
 */
export type RandomSource = () => number;

/** The largest seed, 2³² − 1. */
const MAX_SEED = 0xff_ff_ff_ff;

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
 * @since 1.0.0
 */
export function seededRandom(seed: number): RandomSource {
  if (!(Number.isInteger(seed) && seed >= 0 && seed <= MAX_SEED)) {
    throw new InvalidArgumentError(
      `Invalid seed ${display(seed)}: expected an integer from 0 to ${String(MAX_SEED)}`,
    );
  }

  return xoshiro128StarStar(seed);
}
