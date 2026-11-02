# A functional core with a chain

deckshoes is a set of pure functions over frozen data: every stack operation returns new values and leaves its inputs alone. For people who'd rather write a pipeline, `chain(stack)` returns a `Chain` whose methods have the same names as the functions and only delegate to them, one line each, so the two styles can't disagree. `.value()` unwraps the result. This replaces 0.4's classes, which held mutable state and couldn't be tree-shaken.

```ts no-test
// Functions
const { hands, rest } = deal(shuffle(standard52(), seededRandom(42)), 4, 5);

// The same thing as a chain
const same = chain(standard52()).shuffle(seededRandom(42)).deal(4, 5).value();
```

## Considered options

- **Classes, as in 0.4** (`new Deck().shuffle()`). Methods hide state that changes under you, and a bundler has to keep every method.
- **`pipe` with curried functions** (`pipe(stack, shuffle(random), deal(4, 5))`). Tree-shakeable with nothing to wrap or unwrap, but every function needs a second, curried form, which doubles the types and the docs.
- **Functions only.** The smallest API, but pipelines become nested calls or temporary variables.

## Consequences

- "Deck" is a role a stack plays (see the glossary), and what `chain()` returns is always a chain, never a deck, so nothing is named twice.
- Importing `chain` bundles every stack operation, because methods can't be tree-shaken. Users who care about bundle size use the functions.
- An operation that splits a stack returns a frozen object naming each part, never a tuple: `{ cards, rest }` from `draw`, `{ hands, rest }` from `deal`. The function and the chain give the same shape, and a new field can be added without breaking anyone.
- A chain holding a split result offers only `.value()`. To carry on with the remainder, wrap it again with `chain(result.rest)`.
