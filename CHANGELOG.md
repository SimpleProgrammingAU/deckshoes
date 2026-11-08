# deckshoes

## 1.0.0-alpha.2

### Minor Changes

- [#50](https://github.com/SimpleProgrammingAU/deckshoes/pull/50) [`e5df658`](https://github.com/SimpleProgrammingAU/deckshoes/commit/e5df658617623274cdff4d2a447dadb1da16fefb) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - Add `chain(stack)`. It wraps a stack so that stack operations can be written as a pipeline, such as `chain(standard52()).shuffle({ random }).value()`. Its methods have the same names as the functions and give the same results, and `.value()` returns the stack. A stack that isn't an array throws `InvalidArgumentError`. Importing `chain` brings in every stack operation, so call the functions when bundle size matters.
  
  The docs for `InvalidArgumentError` now mention a stack that isn't an array.

- [#59](https://github.com/SimpleProgrammingAU/deckshoes/pull/59) [`462cbe6`](https://github.com/SimpleProgrammingAU/deckshoes/commit/462cbe60de3ff42855e49f4cd1df0a7434e041bd) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - Add `deal(deck, handCount, handSize, options)`, which deals cards from the top of a deck into hands and returns a frozen `{ hands, remainder }`. Cards go round-robin by default, or in packets with `packetSize`, such as `{ packetSize: 3 }` for 3 then 2, or `PacketSize.HAND` for each hand's cards at once. `HandSize.MAXIMIZE` deals out the whole deck as evenly as possible, and `runOut: RunOut.STOP` gives short hands instead of throwing when the deck runs out. The first card dealt to a hand is its top card. The chain's `deal` method ends the chain with a `TerminatedChain`, like `draw`.

- [#53](https://github.com/SimpleProgrammingAU/deckshoes/pull/53) [`47d7f1d`](https://github.com/SimpleProgrammingAU/deckshoes/commit/47d7f1d09fcbf772ba5399f5cc860988856f3327) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - Add `draw` and `drawBottom`, which draw cards from the top or bottom of a stack and return a frozen `{ cards, remainder }`, and `peek` and `peekBottom`, which look at those cards without drawing them. The chain has the same operations, and each ends it with a `TerminatedChain`, which only offers `.value()`.

### Patch Changes

- [#55](https://github.com/SimpleProgrammingAU/deckshoes/pull/55) [`0179daa`](https://github.com/SimpleProgrammingAU/deckshoes/commit/0179daaa856c5833b26265f710d29b78294b4f08) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - Stack operations now always return plain frozen arrays, whatever array they're given. An Array subclass could make `shuffle` throw a raw `TypeError`, return its own class or something that isn't an array, or lose cards. A hole in a sparse array now comes back as `undefined`.

## 1.0.0-alpha.1

### Minor Changes

- [#47](https://github.com/SimpleProgrammingAU/deckshoes/pull/47) [`429a112`](https://github.com/SimpleProgrammingAU/deckshoes/commit/429a112f54025e82c4cda9c35e7506988e70c353) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - Add random sources. `seededRandom(seed)` returns a random source that gives the same sequence for the same seed in every runtime, for reproducible results in tests, examples and replays. The `RandomSource` type describes any random source: a function returning a number from 0 up to 1, the same shape as `Math.random`. Operations that need randomness, such as shuffles, take one as their `random` option. A seed that isn't an integer from 0 to 2³² − 1 throws `InvalidArgumentError`. The docs for `InvalidArgumentError` now cover seeds and random sources.

- [#48](https://github.com/SimpleProgrammingAU/deckshoes/pull/48) [`8d46bdc`](https://github.com/SimpleProgrammingAU/deckshoes/commit/8d46bdc3c2abcecdd6e37f8de986cf790adbfbfc) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - Add `shuffle(stack, options)`, which returns a shuffled copy of a stack as a new frozen array, with every order equally likely, and leaves the stack untouched. It's a Fisher–Yates shuffle. Pass a fresh `seededRandom(seed)` as the `random` option to get the same order every time; leave `random` out to use a secure source backed by `crypto.getRandomValues`. A stack that isn't an array, options that aren't an object, a `random` option that isn't a function, and a random source that misbehaves throw `InvalidArgumentError`.
  
  The `CardStack` type describes a stack: a readonly array of cards, top first. `ShuffleOptions` describes `shuffle`'s options.

- [#44](https://github.com/SimpleProgrammingAU/deckshoes/pull/44) [`f0d2e63`](https://github.com/SimpleProgrammingAU/deckshoes/commit/f0d2e636ef79704e9f505d6d5b07c6eaf5b76040) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - Add the 52 standard cards. `card(rank, suit)` returns the card with that rank and suit: a frozen object with a `rank`, a `suit` and a `color`, set from the suit. There's exactly one object for each card, so cards compare with `===`. `isCard()` checks whether a value is one of those cards, and the `Card`, `Rank`, `Suit` and `Color` types describe them. A rank or suit that isn't standard throws `InvalidCardError`.
  
  The doc comments for `DeckshoesError` and `isDeckshoesError` now say "two installs" of deckshoes instead of "two copies", because a copy means one of several identical cards.

- [#48](https://github.com/SimpleProgrammingAU/deckshoes/pull/48) [`c77a2ce`](https://github.com/SimpleProgrammingAU/deckshoes/commit/c77a2ce182aeeec37a28d369e98c0923cdee6fbc) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - Add presets, imported from the new `deckshoes/presets` entry point. The first is `standard52()`, which returns the 52 standard cards in new deck order, the order a new deck comes out of the box in: hearts and clubs from ace to king, then diamonds and spades from king to ace. The ace of hearts is on top and the ace of spades at the bottom. Every call returns the same frozen stack, holding the same card objects that `card()` returns.

## 1.0.0-alpha.0

### Major Changes

- [#1](https://github.com/SimpleProgrammingAU/deckshoes/pull/1) [`766b774`](https://github.com/SimpleProgrammingAU/deckshoes/commit/766b77428801455d0474cf06b387f757f01361da) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - Start the deckshoes 1.0 rewrite. This is a breaking change from 0.4: the package is now ESM-only TypeScript, requires Node 22.12 or later (or any modern browser), and replaces the 0.x classes with a new API that arrives over the 1.0 alpha releases.
  
  This first piece adds the error types every later feature uses: `DeckshoesError` and its subclasses `InvalidArgumentError`, `InvalidCardError` and `InsufficientCardsError`, each with a stable `code`, plus the `isDeckshoesError()` type guard.
