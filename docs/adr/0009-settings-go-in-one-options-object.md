# Settings go in one options object

A stack operation takes the stack, and the counts or cards it acts on, as positional parameters. Everything that changes how it works goes in one options object, which is always the last parameter and always optional: the random source ([ADR 0006](./0006-randomness-is-an-injected-source.md)), dealing in blocks, a riffle's number of passes. Presets that take options follow the same rule ([ADR 0008](./0008-presets-ship-from-a-subpath.md)).

```ts no-test
shuffle(deck, { random: seededRandom(42) });
chain(deck)
  .shuffle({ random: seededRandom(42) })
  .deal(4, 5)
  .value();
```

## Considered options

- **Optional positional parameters** (`shuffle(deck, random)`). The shortest form for one setting, but an operation that gains a second one ends up as `riffle(deck, { passes: 7 }, random)` or with callers passing `undefined` to skip a parameter, and adding a parameter in front of an existing one breaks callers.
- **Either a random source or an options object as the last parameter.** Short and extensible, but every operation needs an overload and a runtime check, and the docs show two ways to do the same thing.

## Consequences

- Adding a setting to an operation is a minor change.
- The common case is longer: `shuffle(deck, { random: seededRandom(42) })` rather than `shuffle(deck, seededRandom(42))`.
- Counts stay positional, even ones with a default: `draw(stack, 2)`, not `draw(stack, { count: 2 })`.
- Chain methods take the same options object as the functions.
