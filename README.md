# deckshoes

[![npm](https://img.shields.io/npm/v/deckshoes?label=npm)](https://www.npmjs.com/package/deckshoes)
[![npm alpha](https://img.shields.io/npm/v/deckshoes/alpha?label=alpha)](https://www.npmjs.com/package/deckshoes?activeTab=versions)
[![CI](https://github.com/SimpleProgrammingAU/deckshoes/actions/workflows/ci.yml/badge.svg)](https://github.com/SimpleProgrammingAU/deckshoes/actions/workflows/ci.yml)
[![Bundle size](https://img.shields.io/bundlejs/size/deckshoes)](https://bundlejs.com/?q=deckshoes)
[![License: MIT](https://img.shields.io/npm/l/deckshoes)](./LICENSE)

A lightweight, fully typed library for playing cards: decks, multi-deck shoes, shuffling, dealing and more. No runtime dependencies, tree-shakeable, and it runs anywhere JavaScript does.

> [!WARNING]
> **deckshoes 1.0 is a rewrite and is under active development.** The 1.0 API is arriving piece by piece in alpha releases (`deckshoes@alpha`) and may change between them. The last stable release is 0.4.0; see [Migrating from 0.4](#migrating-from-04).

## Install

```sh
npm install deckshoes@alpha
# or
pnpm add deckshoes@alpha
```

## What's coming in 1.0

Everything in deckshoes 1.0 is a pure function over immutable data, with an optional chain for when you'd rather write a pipeline. Shuffles take a random source, so you can make them reproducible with a seed. This is the API being built; the [roadmap](./ROADMAP.md) tracks progress.

```ts no-test
import { chain, deal, seededRandom, shuffle } from "deckshoes";
import { standard52 } from "deckshoes/presets";

// Functions: every call returns new data and leaves its input alone.
const deck = shuffle(standard52(), { random: seededRandom(42) });
const { hands, rest } = deal(deck, 4, 5);

// Or the same thing as a chain, giving the same { hands, rest }.
const same = chain(standard52())
  .shuffle({ random: seededRandom(42) })
  .deal(4, 5)
  .value();
```

Planned for 1.0: cards that you can parse from and format to text such as `"AS"`, `"10h"` and `"A♠"`; presets for the standard 52-card, Piquet, Euchre and Pinochle decks; shoes with a cut card; and serialisation. After 1.0: optional poker, blackjack and bridge helpers, realistic shuffles, and custom decks, which bring jokers and the 500, Spanish and Tarot decks.

## Cards

A card is a frozen object with a `rank`, a `suit` and a `color`. The ranks are `"A"`, `"2"` to `"10"`, `"J"`, `"Q"` and `"K"`, with ten written `"10"`. The suits are `"S"`, `"H"`, `"D"` and `"C"`, for spades, hearts, diamonds and clubs. A card's colour comes from its suit: red for hearts and diamonds, black for spades and clubs.

There's exactly one object for each card, so cards compare with `===`, and `includes`, `indexOf`, `Set` and `Map` work on them without a helper.

```ts
import { card, isCard } from "deckshoes";

const ace = card("A", "S");
ace; // => { rank: "A", suit: "S", color: "black" }
card("10", "H").color; // => "red"

ace === card("A", "S"); // => true
[card("K", "D"), ace].includes(card("A", "S")); // => true

// An object with the same fields isn't a card.
isCard(ace); // => true
isCard({ rank: "A", suit: "S", color: "black" }); // => false
```

TypeScript rejects any other rank or suit. Values it can't check, such as user input, are checked when the card is made: a rank or suit that isn't standard throws `InvalidCardError`.

## Error handling

Every error deckshoes throws extends `DeckshoesError` and carries a stable `code`. Branch on the code rather than the message, since messages can be reworded in any release.

| Code                 | Class                    | Thrown when                                                |
| -------------------- | ------------------------ | ---------------------------------------------------------- |
| `INVALID_ARGUMENT`   | `InvalidArgumentError`   | A count, index or option is out of range                   |
| `INVALID_CARD`       | `InvalidCardError`       | A rank, suit or card string can't be recognised            |
| `INSUFFICIENT_CARDS` | `InsufficientCardsError` | An operation needs more cards than there are (has details) |

Use `isDeckshoesError` to check an unknown value. It narrows the type, and unlike `instanceof` it still works if your app ends up with deckshoes installed twice.

```ts
import { InsufficientCardsError, isDeckshoesError } from "deckshoes";

function describe(error: unknown): string {
  if (isDeckshoesError(error, "INSUFFICIENT_CARDS")) {
    return `Only ${String(error.available)} cards left`;
  }
  if (isDeckshoesError(error)) {
    return `deckshoes error: ${error.code}`;
  }
  return "Something else went wrong";
}

describe(new InsufficientCardsError(5, 2)); // => "Only 2 cards left"
describe(new Error("boom")); // => "Something else went wrong"
```

## Compatibility

- **ESM only.** Node.js 22.12 and later can also `require()` it.
- **Runtimes:** Node.js 22.12+, Deno, Bun, and current browsers. The library doesn't use any Node.js APIs.
- **TypeScript:** types are included. Strict mode is recommended.
- **One install per app.** If you publish a library that uses deckshoes, list it in `peerDependencies` so your users' apps get one install. Two installs still work side by side, but their cards aren't `===` to each other; `isDeckshoesError` recognises errors from both.

## Documentation

- [API reference](https://simpleprogrammingau.github.io/deckshoes/), generated from the doc comments in the source. Every example in it is run as a test.
- [Roadmap](./ROADMAP.md)
- [Changelog](https://github.com/SimpleProgrammingAU/deckshoes/blob/main/CHANGELOG.md)

## Migrating from 0.4

1.0 replaces the 0.x classes (`PlayingCard`, `Deck`, `Shoe`) with a new API. 1.0.0 covers the 52 standard cards. 0.4's jokers and 500 deck come back after 1.0 with custom decks. 0.4's Spanish deck used French suits, so it's the standard 52 without the 10s; custom decks bring Spanish decks with Spanish suits instead. A full migration guide will be published with 1.0.0. Until then, 0.4.0 stays the `latest` release on npm, so `npm install deckshoes` still gives you 0.4.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to set up the project, the workflow from issue to merged PR, and the documentation rules. By taking part you agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## License

[MIT](./LICENSE) © Simple Programming
