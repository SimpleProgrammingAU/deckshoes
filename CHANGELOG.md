# deckshoes

## 1.1.0

### Minor Changes

- [#98](https://github.com/SimpleProgrammingAU/deckshoes/pull/98) [`2a0edad`](https://github.com/SimpleProgrammingAU/deckshoes/commit/2a0edadb0324d1b2ebc9f0ed95a64d56424940ea) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - Add blackjack helpers, imported from the new `deckshoes/blackjack` entry point. `handTotal()` gives a hand's total, counting an ace as 11 when that keeps the total at 21 or under, and `isSoft()`, `isBlackjack()` and `isBust()` say whether a hand is soft, a blackjack or bust. `runningCount()` sums the cards' tags in Hi-Lo, or in a counting system of your own through its `tag` option, and `trueCount()` divides a running count by the decks left to deal, measured by the deck the shoe was built from, so Spanish 21's 48-card decks count correctly. They read cards by rank, so cloned cards count the same as real ones.

- [#103](https://github.com/SimpleProgrammingAU/deckshoes/pull/103) [`7b717bb`](https://github.com/SimpleProgrammingAU/deckshoes/commit/7b717bbfd8c3174a03de7f8c56ec254e15db518a) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - Add bridge helpers, imported from the new `deckshoes/bridge` entry point. `highCardPoints()` counts a hand's high-card points, 4 for an ace, 3 for a king, 2 for a queen and 1 for a jack, and `distribution()` gives its suit lengths, longest first, such as `[4, 3, 3, 3]`. Both take any cards, such as a hand in mid-play or a partnership's two hands. Both read each card's rank, and `distribution()` its suit too, so cloned cards work.

- [#101](https://github.com/SimpleProgrammingAU/deckshoes/pull/101) [`0e0fc90`](https://github.com/SimpleProgrammingAU/deckshoes/commit/0e0fc9090d2604e1940ac8554520e1da373431e2) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - Add poker helpers, imported from the new `deckshoes/poker` entry point. `handCategory()` names a poker hand's category, such as `Category.FULL_HOUSE`, `bestHand()` gives its cards, most significant first, and `compareHands()` says which of two poker hands wins, or that they tie, and works as a sort comparator. Each judges the best five of the cards it's given, such as hold'em's hole cards with the community cards, or all of them while there are fewer than five, so a pair before the flop is one pair. They read cards by rank and suit, so cloned cards work, and a card given twice throws.

## 1.0.0

### Major Changes

- [#95](https://github.com/SimpleProgrammingAU/deckshoes/pull/95) [`616ba5b`](https://github.com/SimpleProgrammingAU/deckshoes/commit/616ba5b6d35c5a27c9a51b100c20c2a70cdee17c) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - deckshoes 1.0.0 is the first stable release of the rewrite, and replaces 0.4's classes with functions over frozen data. The [migration guide](https://github.com/SimpleProgrammingAU/deckshoes/blob/main/MIGRATING.md) maps every 0.4 class, method and constant to its 1.0 equivalent, and names what 1.0.0 doesn't cover yet.
  
  This section lists what's new since 1.0.0-alpha.3. The [changelog](https://github.com/SimpleProgrammingAU/deckshoes/blob/main/CHANGELOG.md)'s 1.0.0-alpha sections list everything else in 1.0. From here, releases follow [semantic versioning](https://semver.org).

### Minor Changes

- [#81](https://github.com/SimpleProgrammingAU/deckshoes/pull/81) [`1e4e539`](https://github.com/SimpleProgrammingAU/deckshoes/commit/1e4e53914b954b02a8b04812d49a11180fec461f) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - Add burning, discarding and reshuffling to shoes, with a `discardPile` that starts empty:
  
  - `burn(shoe, count)` moves cards from the top to the discard pile without using them, moving the cut card up as well.
  - `discard(shoe, cards)` puts cards that are finished with, such as a round's hands, on the discard pile.
  - `reshuffle(shoe, { penetration, random })` shuffles the discard pile back in with the cards left in the shoe and puts the cut card back in. A shoe doesn't remember its penetration, so pass the options you built it with.
  
  A shoe without a `discardPile`, such as one written in JavaScript, is read as having an empty one.

- [#86](https://github.com/SimpleProgrammingAU/deckshoes/pull/86) [`9d09bf0`](https://github.com/SimpleProgrammingAU/deckshoes/commit/9d09bf0597a2c0b1d2ebc120cdc3b4557fb14773) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - Add saving and loading. `JSON.stringify` already writes cards, stacks and shoes as JSON; `cardFromJSON`, `stackFromJSON` and `shoeFromJSON` load them back as the real card objects, which are `===` to the ones `card()` returns. They take the parsed value, so they also load cards cloned by `structuredClone` or `postMessage`. A card whose `color` doesn't match its suit throws `InvalidCardError`.
  
  Add compact strings for logs and URLs. `formatStack(stack, { notation })` writes a stack's cards top first, separated by single spaces, such as `"AS 10H KD"`, in short or symbol notation or as Unicode characters. `parseStack` reads one back, reading each card as `parseCard` does except for names, which have spaces, and `tryParseStack` returns `undefined` rather than throwing.
  
  `formatShoe` writes a shoe as its cards, its cut card's position and its discard pile, separated by `" | "`, such as `"AS 10H KD | 2 | 2C"`, leaving out an empty discard pile. `parseShoe` and `tryParseShoe` read one back.

- [#78](https://github.com/SimpleProgrammingAU/deckshoes/pull/78) [`ddcfccf`](https://github.com/SimpleProgrammingAU/deckshoes/commit/ddcfccf142f4dfb1d3d689eac7467cf8234523cb) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - Add shoes. `shoe(deck, deckCount, { penetration, random })` shuffles copies of a deck together and puts a cut card at the penetration, three quarters of the way in by default. `drawFromShoe` and `dealFromShoe` take cards out as `draw` and `deal` do, and move the cut card up by the cards taken. A shoe is a frozen `{ cards, cutCard, discardPile }`: once `cutCard` is 0, the cut card has been reached and the shoe is due for a reshuffle. Read a shoe's cards with any stack operation on `shoe.cards`.

### Patch Changes

- [#92](https://github.com/SimpleProgrammingAU/deckshoes/pull/92) [`57d379f`](https://github.com/SimpleProgrammingAU/deckshoes/commit/57d379f88d44c4d9c6ed177f0cc2e581db718707) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - `insert` throws `INVALID_ARGUMENT` when the stack and the cards put into it would hold more than 2³² − 1 cards between them, instead of the runtime's `RangeError`, which has no `code` and which `isDeckshoesError` doesn't recognise.

## 1.0.0-alpha.3

### Minor Changes

- [#67](https://github.com/SimpleProgrammingAU/deckshoes/pull/67) [`de6198e`](https://github.com/SimpleProgrammingAU/deckshoes/commit/de6198e4e3bf04a277906321a048413b8e2c32d5) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - Five new stack operations, each with a chain method of the same name:
  
  - `cut(stack, position?, options?)` moves the cards above a position from the top to the bottom. Leave the position out, or pass `Position.RANDOM`, to cut at random with the `random` option.
  - `insert(stack, cards, position?, options?)` puts cards into a stack at a position, keeping their order: 0 for the top, `Position.BOTTOM` for the bottom, or `Position.RANDOM`.
  - `remove(stack, cards)` takes the topmost copy of each card out of a stack, and throws `InvalidArgumentError` if one has no copy left.
  - `contains(stack, cards)` tells whether `remove` would find every card, counting copies.
  - `count(stack, match)` counts the cards a function accepts.

- [#63](https://github.com/SimpleProgrammingAU/deckshoes/pull/63) [`2965235`](https://github.com/SimpleProgrammingAU/deckshoes/commit/29652350d7bda80f7ad95338242e2a52d5a46e1f) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - Add `parseCard(text)`, `tryParseCard(text)` and `formatCard(card, options)`, which read and write cards as text. Parsing reads short notation (`"AS"`, `"10h"`, `"Th"`), symbol notation (`"A♠"`) and names (`"Ace of Spades"`), in any case. Unrecognised text makes `parseCard` throw `InvalidCardError`, and `tryParseCard` return `undefined`. `formatCard` writes short notation, or pass `{ notation: Notation.SYMBOL }` or `{ notation: Notation.NAME }`.

- [#70](https://github.com/SimpleProgrammingAU/deckshoes/pull/70) [`cae10c7`](https://github.com/SimpleProgrammingAU/deckshoes/commit/cae10c7c394e9ba72209aed7cfe0d503748b92e1) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - Add the Pinochle preset to `deckshoes/presets`. `pinochle()` gives the 48-card deck, two of each card from 9 to ace, and `pinochle({ size })` the 64-, 80- and 120-card decks. Each is one stripped deck repeated, one on top of the other, and a card's copies are the same object. Every call returns the same frozen stack for its size, and any other size throws `InvalidArgumentError`. The rank order examples now call Pinochle's order `pinochleOrder`, so it doesn't clash with the preset.

- [#61](https://github.com/SimpleProgrammingAU/deckshoes/pull/61) [`f51b941`](https://github.com/SimpleProgrammingAU/deckshoes/commit/f51b94138f5804b4c819aff2e7a819e1433174b9) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - Add `rankName(rank, options)` and `suitName(suit, options)`, which give the English name of a standard rank or suit, such as `"Ace"` or `"Diamonds"`. Pass `{ lowercase: true }` for lower case, and `{ singular: true }` to `suitName` for `"Diamond"`.

- [#68](https://github.com/SimpleProgrammingAU/deckshoes/pull/68) [`13e99b4`](https://github.com/SimpleProgrammingAU/deckshoes/commit/13e99b46ce60c4356d0086d5e863c7ccb2b83b7a) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - Rank and suit orders, for comparing, sorting and grouping cards:
  
  - `RankOrder.ACE_HIGH` and `RankOrder.ACE_LOW` are the built-in rank orders, and `SuitOrder.BRIDGE` (clubs, diamonds, hearts, spades) the built-in suit order. Each is a frozen array, lowest first, and any other order is an array you write, such as Pinochle's `["9", "J", "Q", "K", "10", "A"]`. The `RankOrder` and `SuitOrder` types are generic over the rank and suit, so they also work for cards that aren't standard cards.
  - `compareCards(a, b, rankOrder, options?)` returns -1, 0 or 1. Cards of the same rank tie unless you pass a `suitOrder` option. An order that lists an entry twice or has a hole or `undefined` in it, or that lacks a card's rank or suit, throws `InvalidArgumentError`.
  - `sort(stack, rankOrder, options?)` returns a new frozen stack with the lowest card on top. It's stable, so cards that tie keep their order, and the `suitOrder` option separates cards of the same rank. To sort highest first, reverse the orders.
  - `groupByRank(stack, rankOrder)` and `groupBySuit(stack, suitOrder)` return a frozen array with one frozen stack for each entry of the order, lowest first, holding that rank's or suit's cards in the order they had. A rank or suit the stack doesn't hold gets an empty group, so the groups line up with the order. To lay a hand out by suit, then rank, use `groupBySuit(sort(hand, RankOrder.ACE_HIGH), SuitOrder.BRIDGE).flat()`.
  - The chain gets `sort`, `groupByRank` and `groupBySuit` methods. `sort` carries on, and the grouping methods end the chain, as `deal` does.

- [#69](https://github.com/SimpleProgrammingAU/deckshoes/pull/69) [`909c114`](https://github.com/SimpleProgrammingAU/deckshoes/commit/909c1142d87226d53f1eded8dff3577339119e01) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - Add the Piquet and Euchre presets to `deckshoes/presets`. `piquet()` gives the 32 cards from 7 to ace, and `euchre()` the 24 cards from 9 to ace. Each is the standard 52 without its low ranks, still in new deck order, and returns the same frozen stack on every call. The `DealOptions` example now deals from `euchre()`.

- [#64](https://github.com/SimpleProgrammingAU/deckshoes/pull/64) [`b0fa0ba`](https://github.com/SimpleProgrammingAU/deckshoes/commit/b0fa0ba2885badbb2a2e825b35ecbc1dc90824cb) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - `parseCard` and `tryParseCard` read a card's Unicode character from Unicode's Playing Cards block, such as `"🂡"` for the ace of spades, and `formatCard` writes it with `{ notation: Notation.UNICODE_CHARACTER }`. The block's other characters, such as the knights, the jokers and the card back, aren't standard cards, so `parseCard` throws `InvalidCardError` for them and `tryParseCard` returns `undefined`.

### Patch Changes

- [#63](https://github.com/SimpleProgrammingAU/deckshoes/pull/63) [`8200025`](https://github.com/SimpleProgrammingAU/deckshoes/commit/8200025f4d65fa53ba9265b48b28d7e2f1abf866) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - An error message that cuts long input short no longer splits a character such as an emoji, which used to leave an escape such as `\ud83c` at the end of the text shown.

- [#68](https://github.com/SimpleProgrammingAU/deckshoes/pull/68) [`e53c4d0`](https://github.com/SimpleProgrammingAU/deckshoes/commit/e53c4d0598e3d8246bc45f175175319c14e62436) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - An array passed as the options to `shuffle`, `cut`, `insert`, `deal`, `rankName`, `suitName` or `formatCard` now throws `InvalidArgumentError`, as anything else that isn't an object does. It used to be ignored, so the defaults applied. Error messages now show an array as `(array)`, rather than `(object)`.

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
