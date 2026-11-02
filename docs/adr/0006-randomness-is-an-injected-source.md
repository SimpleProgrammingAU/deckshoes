# Randomness is an injected source

Every operation that needs randomness takes a random source as an optional last parameter, `random`. A random source has the same shape as `Math.random`: a function returning a number in [0, 1). So `shuffle(stack, Math.random)` and any third-party generator just work. When none is passed, the default is backed by `crypto.getRandomValues`. `seededRandom(seed)` gives a reproducible source (xoshiro128\*\*) that produces the same sequence in every runtime, which makes examples, tests and replays deterministic.

To pick an index without modulo bias, deckshoes takes `floor(r × 2³²)` from the source and rejects values from the incomplete last bucket, drawing again. This is exactly unbiased for any source with at least 32 bits of resolution, which includes both built-in sources and `Math.random` in every major engine.

## Considered options

- **`Math.random` as the default.** Not suitable for anything where fairness matters, and not seedable.
- **A source that returns 32-bit integers.** Just as unbiased, but users couldn't pass `Math.random` or most generators directly.
- **Pure generator state threaded through return values** (`[stack, nextRandom]`). Keeps every function pure, but makes every random call clumsy.

## Consequences

- A seeded source is stateful: each call moves it on, so passing the same source to two shuffles gives two different orders. This is the one deliberate impurity in the library. Create a fresh `seededRandom(seed)` to repeat a result.
- A source that returns a value outside [0, 1) is rejected with `InvalidArgumentError`.
