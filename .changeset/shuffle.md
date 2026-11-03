---
"deckshoes": minor
---

Add `shuffle(stack, options)`, which returns a shuffled copy of a stack as a new frozen array, with every order equally likely, and leaves the stack untouched. It's a Fisher–Yates shuffle. Pass `{ random: seededRandom(seed) }` to get the same order every time; leave `random` out to use a secure source backed by `crypto.getRandomValues`. A stack that isn't an array, options that aren't an object, a `random` option that isn't a function, and a random source that misbehaves throw `InvalidArgumentError`.

The `CardStack` type describes a stack: a readonly array of cards, top first. `ShuffleOptions` describes `shuffle`'s options.
