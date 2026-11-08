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

## Quick start

```ts
import { card, chain, seededRandom, shuffle } from "deckshoes";
import { standard52 } from "deckshoes/presets";

// A deck in new deck order, the order a new deck comes out of the box in.
const deck = standard52();
deck.length; // => 52
deck[0] === card("A", "H"); // => true

// Shuffle it. The seed makes the order the same every time.
const shuffled = shuffle(deck, { random: seededRandom(42) });
shuffled.slice(0, 3); // => [card("7", "H"), card("6", "C"), card("10", "D")]

// The same thing written as a chain, unwrapped with .value().
chain(deck)
  .shuffle({ random: seededRandom(42) })
  .value(); // => shuffled

// Shuffling returns a new stack and leaves the deck as it was.
deck[0] === card("A", "H"); // => true
```

A stack, such as a deck or a hand, is a frozen array of cards with the top card first. Every operation is a function that returns new data, and `chain()` writes the same operations as a pipeline, with the same results. Importing `chain` brings every stack operation into your bundle, even the ones you don't call, so use the functions if bundle size matters.

In a real game, leave the seed out, `shuffle(deck)`, to shuffle with a secure random source. See [Random sources](#random-sources).

## What's coming in 1.0

Everything in deckshoes 1.0 is a pure function over immutable data, with an optional chain for when you'd rather write a pipeline. Shuffles take a random source, so you can make them reproducible with a seed. This is the API being built; the [roadmap](./ROADMAP.md) tracks progress.

```ts no-test
import { chain, deal, seededRandom, shuffle } from "deckshoes";
import { standard52 } from "deckshoes/presets";

// Functions: every call returns new data and leaves its input alone.
const deck = shuffle(standard52(), { random: seededRandom(42) });
const { hands, remainder } = deal(deck, 4, 5);

// Or the same thing as a chain, giving the same { hands, remainder }.
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

## Random sources

Anything random, such as a shuffle, takes a random source as its `random` option. A random source is a function that returns a number from 0 up to, but not including, 1: the same shape as `Math.random`.

- **Leave `random` out** to use a secure source, backed by `crypto.getRandomValues`. Each shuffle makes its own, and nothing is kept between shuffles. Use this in real games.
- **Pass `seededRandom(seed)`** to get the same results for the same seed, in every runtime and every 1.x release. Use it for tests, examples and replays: record the seed, and you can replay the game. The seed is an integer from 0 to 2³² − 1.
- **Pass any other source**, such as `Math.random`, as it is. A method that uses `this`, such as `rng.next` on a library's random-number object, has to be wrapped first: `{ random: () => rng.next() }`.

A seeded source moves on each time it's used, so one source passed to two shuffles gives two different orders. To repeat a result, make a fresh source with the same seed.

```ts
import { seededRandom, shuffle } from "deckshoes";
import { standard52 } from "deckshoes/presets";

const random = seededRandom(7);
const first = shuffle(standard52(), { random });
const second = shuffle(standard52(), { random });
first.every((card, i) => card === second[i]); // => false

// A fresh source with the same seed repeats the first shuffle.
shuffle(standard52(), { random: seededRandom(7) }); // => first
```

Anyone who sees enough of a seeded source's results can work out what comes next, so don't use one where a player could gain from guessing the next card. A source that returns anything but a number from 0 up to 1, such as `1` or `NaN`, makes the operation throw `InvalidArgumentError`.

## Drawing

`draw(stack, count)` draws cards from the top of a stack, and `drawBottom(stack, count)` draws them from the bottom. Both return a frozen `{ cards, remainder }`: the cards drawn, and the stack left after drawing them. The stack you passed in doesn't change, so carry on with `remainder`.

`peek(stack, count)` and `peekBottom(stack, count)` look at the same cards without drawing them, so they return only those cards, as a frozen array.

The count is 1 if you leave it out or pass `undefined`. You still get a stack holding that one card, not the card itself.

```ts
import { card, draw, drawBottom, peek, peekBottom } from "deckshoes";

const stack = [card("A", "S"), card("K", "H"), card("10", "D")];

// Draw from the top. The stack you passed in doesn't change.
const { cards, remainder } = draw(stack, 2);
cards; // => [card("A", "S"), card("K", "H")]
remainder; // => [card("10", "D")]
stack.length; // => 3

// Leave the count out to draw one card.
draw(stack).cards; // => [card("A", "S")]

// Cards from the bottom stay in stack order, top first, so the bottom card is
// last. Drawing them one at a time gives the opposite order.
drawBottom(stack, 2).cards; // => [card("K", "H"), card("10", "D")]

// Look without drawing.
peek(stack, 2); // => [card("A", "S"), card("K", "H")]
peekBottom(stack, 2); // => [card("K", "H"), card("10", "D")]

// Too many cards, or a count that isn't an integer of 0 or more, throws.
draw(stack, 4); // throws INSUFFICIENT_CARDS
draw(stack, -1); // throws INVALID_ARGUMENT
```

In a chain, these operations end the pipeline: all that's left is `.value()`, which gives what the function gives. A draw leaves two stacks, so carry on by wrapping the remainder in a new chain. Peeked cards are still in the stack, so carry on from the chain you peeked from, which still holds the whole stack.

```ts
import { card, chain, seededRandom } from "deckshoes";
import { standard52 } from "deckshoes/presets";

const shuffled = chain(standard52()).shuffle({ random: seededRandom(42) });

// Look at the top card, then carry on from the same chain.
shuffled.peek().value(); // => [card("7", "H")]

// Draw two cards, then carry on from the remainder.
const { cards, remainder } = shuffled.draw(2).value();
cards; // => [card("7", "H"), card("6", "C")]
chain(remainder).draw().value().cards; // => [card("10", "D")]
```

## Dealing

`deal(deck, handCount, handSize)` deals cards from the top of a deck into hands and returns a frozen `{ hands, remainder }`: an array of hands, and the stack left after dealing. The deck you passed in doesn't change.

Each hand in turn gets a packet of cards, round after round, until every hand has its cards. A packet is one card unless you say otherwise, so by default the cards go round-robin. The first card dealt to a hand is its top card, so each hand is in the order it was dealt. At a real table, the last card dealt would be on top of a face-down pile.

Three settings change how the deal works. Their named values are constants holding strings, such as `RunOut.STOP` for `"stop"`:

- **`packetSize`** sets how many cards each hand gets at a time. A hand's last packet is smaller if it needs fewer cards, so `{ packetSize: 3 }` deals hands of 5 as 3 then 2. `PacketSize.HAND` gives each hand all its cards at once.
- **`HandSize.MAXIMIZE`**, in place of a hand size, deals out the whole deck as evenly as possible, with any extra cards going to the first hands.
- **`runOut: RunOut.STOP`** deals until the deck runs out, instead of throwing when it holds too few cards. Hands the deck runs out on are short.

```ts
import { card, deal, HandSize, PacketSize, RunOut } from "deckshoes";
import { standard52 } from "deckshoes/presets";

const ranks = ["A", "2", "3", "4", "5", "6", "7"] as const;
const deck = ranks.map((rank) => card(rank, "S"));

// One card to each hand in turn, the first card dealt on top.
const { hands, remainder } = deal(deck, 2, 3);
hands[0]; // => [card("A", "S"), card("3", "S"), card("5", "S")]
hands[1]; // => [card("2", "S"), card("4", "S"), card("6", "S")]
remainder; // => [card("7", "S")]
deck.length; // => 7

// Packets of 3, then 2, as in Euchre.
const euchre = deal(standard52(), 4, 5, { packetSize: 3 });
euchre.hands[0]; // => [card("A", "H"), card("2", "H"), card("3", "H"), card("K", "H"), card("A", "C")]

// Each hand's cards all at once.
deal(deck, 2, 3, { packetSize: PacketSize.HAND }).hands[0]; // => [card("A", "S"), card("2", "S"), card("3", "S")]

// The whole deck, as evenly as possible.
const all = deal(standard52(), 3, HandSize.MAXIMIZE);
all.hands.map((hand) => hand.length); // => [18, 17, 17]

// Too few cards throws, unless the deal stops when the deck runs out.
deal(standard52(), 5, 11); // throws INSUFFICIENT_CARDS
const short = deal(standard52(), 5, 11, { runOut: RunOut.STOP });
short.hands.map((hand) => hand.length); // => [11, 11, 10, 10, 10]

// So does a count that isn't an integer of 1 or more.
deal(deck, 0, 3); // throws INVALID_ARGUMENT
```

In a chain, `deal` ends the pipeline, as `draw` does: all that's left is `.value()`. To carry on, wrap the remainder in a new chain.

```ts
import { card, chain, seededRandom } from "deckshoes";
import { standard52 } from "deckshoes/presets";

const { hands, remainder } = chain(standard52())
  .shuffle({ random: seededRandom(42) })
  .deal(4, 5)
  .value();

// The top card of each hand.
hands.map((hand) => hand[0]); // => [card("7", "H"), card("6", "C"), card("10", "D"), card("J", "C")]

chain(remainder).draw().value().cards; // => [card("2", "C")]
```

## Error handling

Every error deckshoes throws extends `DeckshoesError` and carries a stable `code`. Branch on the code rather than the message, since messages can be reworded in any release.

| Code                 | Class                    | Thrown when                                                                                           |
| -------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `INVALID_ARGUMENT`   | `InvalidArgumentError`   | A count, index, seed or option is out of range, a stack isn't an array, or a random source misbehaves |
| `INVALID_CARD`       | `InvalidCardError`       | A rank, suit or card string can't be recognised                                                       |
| `INSUFFICIENT_CARDS` | `InsufficientCardsError` | An operation needs more cards than there are (has details)                                            |

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
- **Randomness:** the default random source uses the global `crypto.getRandomValues`, which Node.js 22.12+, Deno, Bun and current browsers all have. Where it's missing or incomplete, such as React Native without a polyfill, a shuffle without a `random` option throws the runtime's own error, such as a `ReferenceError` or `TypeError`, rather than a deckshoes error. Polyfill `crypto.getRandomValues`, or pass a `random` source.
- **One install per app.** If you publish a library that uses deckshoes, list it in `peerDependencies` so your users' apps get one install. Two installs still work side by side, but their cards aren't `===` to each other; `isDeckshoesError` recognises errors from both if they share a major version.

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
