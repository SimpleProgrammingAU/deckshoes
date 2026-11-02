---
"deckshoes": minor
---

Add random sources. `seededRandom(seed)` returns a random source that gives the same sequence for the same seed in every runtime, for reproducible results in tests, examples and replays. The `RandomSource` type describes any random source: a function returning a number from 0 up to 1, the same shape as `Math.random`. Operations that need randomness, such as shuffles, take one as their `random` option. A seed that isn't an integer from 0 to 2³² − 1 throws `InvalidArgumentError`.
