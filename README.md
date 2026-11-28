# deckshoes

[![npm](https://img.shields.io/npm/v/deckshoes?label=npm)](https://www.npmjs.com/package/deckshoes)
[![CI](https://github.com/SimpleProgrammingAU/deckshoes/actions/workflows/ci.yml/badge.svg)](https://github.com/SimpleProgrammingAU/deckshoes/actions/workflows/ci.yml)
[![Bundle size](https://img.shields.io/bundlejs/size/deckshoes)](https://bundlejs.com/?q=deckshoes)
[![License: MIT](https://img.shields.io/npm/l/deckshoes)](./LICENSE)

A lightweight, fully typed library for playing cards: decks, shoes, shuffling, dealing and more. No runtime dependencies, tree-shakeable, and it runs anywhere JavaScript does.

Upgrading from 0.4? 1.0 is a rewrite: see [Migrating from 0.4](#migrating-from-04).

## Install

```sh
npm install deckshoes
# or
pnpm add deckshoes
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

## What's in 1.0

Everything in deckshoes 1.0 is a pure function over immutable data, with an optional chain for when you'd rather write a pipeline. Shuffles take a random source, so you can make them reproducible with a seed. 1.0 covers shuffling, dealing, drawing, peeking, cutting, inserting, removing, sorting and grouping cards; shoes with a cut card, burn cards and a discard pile; saving and loading as JSON or compact strings; and the standard 52, Piquet, Euchre and Pinochle presets.

```ts
import { chain, deal, seededRandom, shuffle } from "deckshoes";
import { standard52 } from "deckshoes/presets";

// Functions: every call returns new data and leaves its input alone.
const deck = shuffle(standard52(), { random: seededRandom(42) });
const { hands, remainder } = deal(deck, 4, 5);
hands.length; // => 4
remainder.length; // => 32

// Or the same thing as a chain, giving the same { hands, remainder }.
chain(standard52())
  .shuffle({ random: seededRandom(42) })
  .deal(4, 5)
  .value(); // => { hands, remainder }
```

Since 1.0, blackjack helpers come from `deckshoes/blackjack`: see [Game helpers](#game-helpers). Next on the [roadmap](./ROADMAP.md): poker and bridge helpers, realistic shuffles, and custom decks, which bring jokers and the 500, Spanish and Tarot decks.

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

Each rank and suit has an English name, for showing to players. `rankName` and `suitName` give it capitalised, and plural for a suit, unless you ask for lower case or the singular. They check what they're given the same way `card` does.

```ts
import { card, rankName, suitName } from "deckshoes";

rankName("A"); // => "Ace"
rankName("10"); // => "Ten"
suitName("D"); // => "Diamonds"
suitName("D", { singular: true }); // => "Diamond"

const queen = card("Q", "H");
const rank = rankName(queen.rank, { lowercase: true });
const suit = suitName(queen.suit, { lowercase: true });
`the ${rank} of ${suit}`; // => "the queen of hearts"
```

## Cards as text

`parseCard` reads a card written as text and returns the one card object it names. It reads four notations, ignoring the case of A–Z:

- **Short**: the rank and then the suit's letter, such as `"AS"`, `"10h"` or `"Th"`. Ten is `10` or `T`.
- **Symbol**: the rank and then the suit's symbol, such as `"A♠"` or `"10♥"`. The outline symbols `♤ ♡ ♢ ♧` work too, and so does a suit symbol in its emoji form, such as `"♥️"` from a phone's keyboard. Other emoji, such as `❤️`, don't.
- **Name**: the card's name, such as `"Ace of Spades"`, made from `rankName` and `suitName`.
- **Unicode character**: the card's character from Unicode's Playing Cards block, such as `"🂡"` for the ace of spades. The block's other characters, such as the knights, the jokers and the card back, aren't standard cards, so they aren't read. Not every font has these characters, so check that they show where you use them.

`formatCard` writes a card in short notation, or in another notation you choose with `Notation.SYMBOL`, `Notation.NAME` or `Notation.UNICODE_CHARACTER`. Short and symbol notation write ten as `10`, never `T`, and `parseCard` reads whatever `formatCard` writes back to the same card.

Text that isn't a card makes `parseCard` throw `InvalidCardError`, and `tryParseCard` return `undefined`. Only the card is read, not even spaces around it, so trim user input first.

```ts
import { card, formatCard, Notation, parseCard, tryParseCard } from "deckshoes";

parseCard("AS") === card("A", "S"); // => true
parseCard("10h"); // => card("10", "H")
parseCard("Th"); // => card("10", "H")
parseCard("Q♦"); // => card("Q", "D")
parseCard("queen of hearts"); // => card("Q", "H")
parseCard("🂮"); // => card("K", "S")

const ten = card("10", "H");
formatCard(ten); // => "10H"
formatCard(ten, { notation: Notation.SYMBOL }); // => "10♥"
formatCard(ten, { notation: Notation.NAME }); // => "Ten of Hearts"
formatCard(ten, { notation: Notation.UNICODE_CHARACTER }); // => "🂺"

// Text that isn't a card.
parseCard("11S"); // throws INVALID_CARD
tryParseCard("11S"); // => undefined

// A joker's character isn't a standard card either.
tryParseCard("🃏"); // => undefined

// Spaces around the card aren't read, so trim user input first.
const input = " as\n";
tryParseCard(input); // => undefined
parseCard(input.trim()); // => card("A", "S")
```

## Presets

A preset is a ready-made deck, imported from `deckshoes/presets`. Each one returns the same frozen stack on every call with the same options, and operations such as `shuffle` return new stacks rather than changing it. A preset's order won't change in any 1.x release, since every seeded shuffle of it starts from that order.

| Preset                    | Cards | Ranks                   | Order                                            |
| ------------------------- | ----- | ----------------------- | ------------------------------------------------ |
| `standard52()`            | 52    | 2 to ace                | New deck order                                   |
| `piquet()`                | 32    | 7 to ace                | New deck order, without the 2s to 6s             |
| `euchre()`                | 24    | 9 to ace                | New deck order, without the 2s to 8s             |
| `pinochle()`              | 48    | 9 to ace, two of each   | Euchre's order, twice                            |
| `pinochle({ size: 64 })`  | 64    | 7 to ace, two of each   | Piquet's order, twice                            |
| `pinochle({ size: 80 })`  | 80    | 10 to ace, four of each | New deck order, without the 2s to 9s, four times |
| `pinochle({ size: 120 })` | 120   | 10 to ace, six of each  | New deck order, without the 2s to 9s, six times  |

New deck order is the order a new deck comes out of the box in: face down from the top, hearts and clubs from ace to king, then diamonds and spades from king to ace. Piquet and Euchre are stripped decks, the standard 52 with its low ranks taken out, so the cards left stay in that order. A Pinochle deck is one stripped deck repeated, one on top of the other: 48 cards for the usual game, 80 for double-deck Pinochle, and 64 or 120 for less common games. A card's copies are the same object, so they compare with `===`.

```ts
import { card } from "deckshoes";
import { euchre, pinochle, piquet, standard52 } from "deckshoes/presets";

standard52().length; // => 52
piquet().length; // => 32
euchre().length; // => 24
pinochle().length; // => 48
pinochle({ size: 80 }).length; // => 80

// The second Euchre deck in a Pinochle deck starts with the ace of hearts too.
pinochle()[24]; // => card("A", "H")

// The ace of hearts is on top, then the lowest heart the deck holds.
piquet().slice(0, 2); // => [card("A", "H"), card("7", "H")]
euchre().slice(0, 2); // => [card("A", "H"), card("9", "H")]

// The ace of spades is at the bottom.
euchre()[23]; // => card("A", "S")

// Every call returns the same frozen stack.
euchre() === euchre(); // => true
Object.isFrozen(euchre()); // => true
```

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
import { euchre, standard52 } from "deckshoes/presets";

const ranks = ["A", "2", "3", "4", "5", "6", "7"] as const;
const deck = ranks.map((rank) => card(rank, "S"));

// One card to each hand in turn, the first card dealt on top.
const { hands, remainder } = deal(deck, 2, 3);
hands[0]; // => [card("A", "S"), card("3", "S"), card("5", "S")]
hands[1]; // => [card("2", "S"), card("4", "S"), card("6", "S")]
remainder; // => [card("7", "S")]
deck.length; // => 7

// A Euchre deck dealt to 4 hands of 5 in packets of 3, then 2, leaves a
// remainder of 4.
const dealt = deal(euchre(), 4, 5, { packetSize: 3 });
dealt.hands[0]; // => [card("A", "H"), card("9", "H"), card("10", "H"), card("K", "D"), card("Q", "D")]
dealt.remainder.length; // => 4

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

## Shoes

`shoe(deck, deckCount)` builds a shoe, like the ones casinos deal blackjack and baccarat from: copies of a deck shuffled together, with a cut card that marks when to reshuffle, and a discard pile. It returns a frozen `{ cards, cutCard, discardPile }`: the cards in the shoe, top first, the cut card's position among them, and the cards burned and discarded since the last reshuffle, which starts empty. The deck you passed in doesn't change. Two settings go in the options:

- **`penetration`** sets how far into the shoe the cut card goes, as the proportion of cards dealt before it's reached: a number from 0 to 1, 0.75 unless you say otherwise, rounded to the nearest card. Near 1, there may be too few cards behind the cut card to finish a round.
- **`random`** is the random source for the shuffle, as for `shuffle`.

`drawFromShoe(shoe, count)` and `dealFromShoe(shoe, handCount, handSize)` take cards out as `draw` and `deal` do, with the same settings. They return the cards or hands and the shoe left, with its cut card moved up by the cards taken. Once `cutCard` is 0, the cut card has been reached and the shoe is due for a reshuffle. Dealing can go on past the cut card until the shoe runs out.

Three more functions move cards around a shoe, each returning the new shoe:

- **`burn(shoe, count)`** moves cards from the top to the discard pile without using them, and moves the cut card up as well. They go on top of the pile, so `peek(shoe.discardPile, count)` shows them.
- **`discard(shoe, cards)`** puts cards that are finished with, such as a round's hands, on top of the discard pile. Nothing checks that they came from the shoe, so discard only the cards you took, once each.
- **`reshuffle(shoe, options)`** shuffles the discard pile back in with the cards left in the shoe and puts the cut card back in. A shoe doesn't remember its penetration, so pass `reshuffle` the options you built the shoe with. Cards still in players' hands aren't part of it, so discard them first.

```ts
import {
  burn,
  card,
  count,
  dealFromShoe,
  discard,
  drawFromShoe,
  peek,
  reshuffle,
  seededRandom,
  shoe,
} from "deckshoes";
import { standard52 } from "deckshoes/presets";

// One options object for the shoe and every reshuffle.
const rules = { random: seededRandom(42) };
const sixDecks = shoe(standard52(), 6, rules);
sixDecks.cards.length; // => 312
sixDecks.cutCard; // => 234

// Two cards each to three players and the dealer, then a card for the first
// player.
const dealt = dealFromShoe(sixDecks, 4, 2);
dealt.hands[0]; // => [card("Q", "S"), card("2", "H")]
const hit = drawFromShoe(dealt.shoe);
hit.cards; // => [card("A", "C")]
hit.shoe.cutCard; // => 225

// Stack operations read a shoe's cards.
peek(hit.shoe.cards, 2); // => [card("3", "S"), card("2", "S")]
count(hit.shoe.cards, ({ rank }) => rank === "A"); // => 23

// Once the round is over, its cards go on the discard pile.
let current = discard(hit.shoe, [...dealt.hands.flat(), ...hit.cards]);
current.discardPile.length; // => 9

// Play rounds until the cut card is reached, then reshuffle and burn a card.
while (current.cutCard > 0) {
  const round = dealFromShoe(current, 4, 2);
  current = discard(round.shoe, round.hands.flat());
}
current.cards.length; // => 71
current = burn(reshuffle(current, rules));
current.cards.length; // => 311
current.cutCard; // => 233
current.discardPile.length; // => 1
```

Only a shoe has a discard pile, so a one-deck game that burns cards, such as hold'em, deals from a shoe of one deck:

```ts
import {
  burn,
  dealFromShoe,
  drawFromShoe,
  seededRandom,
  shoe,
} from "deckshoes";
import { standard52 } from "deckshoes/presets";

// Two cards each to six players, then burn one and deal the flop.
const oneDeck = shoe(standard52(), 1, {
  penetration: 1,
  random: seededRandom(1),
});
const { hands, shoe: dealt } = dealFromShoe(oneDeck, 6, 2);
hands.length; // => 6
const flop = drawFromShoe(burn(dealt), 3);
flop.cards.length; // => 3
flop.shoe.cards.length; // => 36
flop.shoe.discardPile.length; // => 1
```

A shoe isn't a stack, so stack operations and `chain` don't take one: anything that takes cards out of a shoe has to move its cut card as well. `chain(shoe.cards)` reads a shoe's cards like any other stack, and `chain(shoe.discardPile)` its pile.

## Cutting, inserting and removing

`cut(stack, position)` moves the cards above a position from the top to the bottom, keeping their order. `insert(stack, cards, position)` puts cards into a stack at a position, keeping their order. A position is the number of cards above it: 0 is the top, and the stack's size, which `Position.BOTTOM` stands for, is below the bottom card. A position outside the stack throws `InvalidArgumentError`, whereas `draw` throws `InsufficientCardsError` when the stack runs short.

Leave the position out, or pass `Position.RANDOM`, to pick one at random with the `random` option, as a shuffle does. A random cut picks from 0 to one less than the stack's size, so every card is as likely as any other to end up on top. A random insert picks from 0 to the stack's size and keeps the cards together.

`remove(stack, cards)` takes particular cards out of a stack, wherever they are: the topmost copy of each. `contains(stack, cards)` tells whether they're all there. Both count copies, one for each entry in `cards`, and `cards` is always an array, even for one card. If a card isn't there, `remove` throws before removing anything. To remove the cards only when they're all there, check with `contains` first. To remove whichever of them are there, check and remove one card at a time. `filter` isn't the same: it removes every copy. `count(stack, match)` counts the cards a function accepts.

```ts
import {
  card,
  contains,
  count,
  cut,
  insert,
  Position,
  remove,
  seededRandom,
} from "deckshoes";
import { standard52 } from "deckshoes/presets";

const hand = [card("A", "S"), card("K", "H"), card("10", "D")];

// The card above position 1 goes to the bottom.
cut(hand, 1); // => [card("K", "H"), card("10", "D"), card("A", "S")]

// The new cards start at the position, in their order.
insert(hand, [card("Q", "C"), card("J", "C")], 1); // => [card("A", "S"), card("Q", "C"), card("J", "C"), card("K", "H"), card("10", "D")]
insert(hand, [card("Q", "C")], Position.BOTTOM); // => [card("A", "S"), card("K", "H"), card("10", "D"), card("Q", "C")]

// A cut at random. The seed makes it the same every time.
const deck = cut(standard52(), Position.RANDOM, { random: seededRandom(42) });
deck[0] === card("8", "H"); // => true

// Each entry removes one copy, so two decks lose both aces of spades.
const twoDecks = [...standard52(), ...standard52()];
const left = remove(twoDecks, [card("A", "S"), card("A", "S")]);
left.length; // => 102
count(left, (each) => each === card("A", "S")); // => 0

// Every card has to be there.
remove(hand, [card("Q", "C")]); // throws INVALID_ARGUMENT
contains(hand, [card("Q", "C")]); // => false

// Count the cards a function accepts.
count(standard52(), ({ suit }) => suit === "H"); // => 13

// A position has to be in the stack.
cut(hand, 4); // throws INVALID_ARGUMENT
```

In a chain, `cut`, `insert` and `remove` carry on, as `shuffle` does. A chain can't name the size of the stack it holds, so pass `Position.BOTTOM` to insert at the bottom. `contains` and `count` end the pipeline, as `peek` does: carry on from the chain you called them on, which still holds the stack.

```ts
import { card, chain, Position } from "deckshoes";
import { standard52 } from "deckshoes/presets";

const queen = card("Q", "S");

// Cut the deck, then move the queen of spades to the bottom.
const chained = chain(standard52())
  .cut(26)
  .remove([queen])
  .insert([queen], Position.BOTTOM);
chained.value()[0] === card("K", "D"); // => true
chained.value()[51] === queen; // => true

// Look, then carry on from the same chain.
chained.contains([queen]).value(); // => true
chained.count(({ suit }) => suit === "S").value(); // => 13
chained.draw(5).value().remainder.length; // => 47
```

## Sorting and grouping

A rank order lists the ranks from lowest to highest, each once, and a suit order does the same for the suits. Both are plain arrays. `RankOrder.ACE_HIGH` and `RankOrder.ACE_LOW` are built in, and so is `SuitOrder.BRIDGE`: clubs, diamonds, hearts, then spades. The built-in orders are frozen. Any other order is an array you write, such as Pinochle's, where the ten ranks above the king. It works frozen or not, but a frozen order makes `compareCards` faster as a comparator. There's no default, so every call that compares, sorts or groups cards takes its order.

`compareCards(a, b, rankOrder)` returns -1, 0 or 1, and `sort(stack, rankOrder)` returns a new frozen stack with the lowest card on top. Cards of the same rank tie, and a sort keeps them in the order they had, unless a `suitOrder` option separates them. To sort highest first, reverse the orders.

`groupByRank(stack, rankOrder)` and `groupBySuit(stack, suitOrder)` give one frozen stack for each entry of the order, in its order, holding that rank's or suit's cards in the order they had. A rank or suit the stack doesn't hold gets an empty group, so the groups always line up with the order. To lay a hand out by suit, then rank, sort it, group it by suit, and flatten the groups.

Every card's rank has to be in the rank order, and its suit in the suit order when there is one, so the wrong order for a deck throws `InvalidArgumentError` rather than sorting quietly. So does an order that lists an entry twice or has a hole.

```ts
import {
  card,
  compareCards,
  groupByRank,
  groupBySuit,
  RankOrder,
  sort,
  SuitOrder,
} from "deckshoes";

const hand = [card("K", "S"), card("2", "H"), card("A", "H"), card("2", "C")];

// Lowest on top. The twos tie, so they keep their order.
sort(hand, RankOrder.ACE_HIGH); // => [card("2", "H"), card("2", "C"), card("K", "S"), card("A", "H")]
sort(hand, RankOrder.ACE_LOW); // => [card("A", "H"), card("2", "H"), card("2", "C"), card("K", "S")]

// A suit order separates cards of the same rank.
const bySuit = { suitOrder: SuitOrder.BRIDGE };
sort(hand, RankOrder.ACE_HIGH, bySuit); // => [card("2", "C"), card("2", "H"), card("K", "S"), card("A", "H")]

// Highest on top: reverse the orders.
sort(hand, RankOrder.ACE_HIGH.toReversed()); // => [card("A", "H"), card("K", "S"), card("2", "H"), card("2", "C")]

// Compare two cards, with a built-in order or one you write.
compareCards(card("A", "S"), card("K", "S"), RankOrder.ACE_HIGH); // => 1
const pinochleOrder: RankOrder = ["9", "J", "Q", "K", "10", "A"];
compareCards(card("10", "H"), card("K", "H"), pinochleOrder); // => 1

// One group for each suit, in bridge order. The hand has no diamonds.
const [clubs, diamonds, hearts, spades] = groupBySuit(hand, SuitOrder.BRIDGE);
clubs; // => [card("2", "C")]
diamonds; // => []
hearts; // => [card("2", "H"), card("A", "H")]
spades; // => [card("K", "S")]

// By suit, then rank: sort, then group by suit and flatten.
const laidOut = groupBySuit(sort(hand, RankOrder.ACE_HIGH), SuitOrder.BRIDGE);
laidOut.flat(); // => [card("2", "C"), card("2", "H"), card("A", "H"), card("K", "S")]

// One group for each rank, so pairs are easy to find.
const byRank = groupByRank(hand, RankOrder.ACE_HIGH);
byRank.filter((group) => group.length === 2); // => [[card("2", "H"), card("2", "C")]]

// Every card has to be in the order.
sort(hand, pinochleOrder); // throws INVALID_ARGUMENT
```

In a chain, `sort` carries on, as `shuffle` does. `groupByRank` and `groupBySuit` end the pipeline, as `deal` does: carry on with a group by wrapping it in a new chain.

```ts
import { card, chain, RankOrder, SuitOrder } from "deckshoes";
import { standard52 } from "deckshoes/presets";

const sorted = chain(standard52()).sort(RankOrder.ACE_LOW, {
  suitOrder: SuitOrder.BRIDGE,
});
sorted.draw(4).value().cards; // => [card("A", "C"), card("A", "D"), card("A", "H"), card("A", "S")]

// Group the sorted deck by suit, then carry on with the spades.
const groups = sorted.groupBySuit(SuitOrder.BRIDGE).value();
chain(groups[3] ?? [])
  .peek(2)
  .value(); // => [card("A", "S"), card("2", "S")]
```

## Game helpers

Game helpers come from their own entry points, one for each game, so you only download the games you import. They're functions, with no chain methods: unwrap a chain with `.value()` first. They read cards by rank, so cloned cards work, and they throw the same errors as the rest of deckshoes.

### Blackjack

`deckshoes/blackjack` totals hands and keeps count.

- **`handTotal(hand)`** sums a hand's values: a 2 to 10 is worth its number, a J, Q or K 10, and an ace 11, or 1 when 11 would take the total over 21.
- **`isSoft(hand)`** says whether the total counts an ace as 11, as in a soft 17. **`isBlackjack(hand)`** says whether the hand is an ace and a 10, J, Q or K, and **`isBust(hand)`** whether its total is over 21. `isBlackjack` sees only the cards, so treat a split hand's two-card 21 as your rules say.

```ts
import { type Card, card } from "deckshoes";
import { handTotal, isBlackjack, isBust, isSoft } from "deckshoes/blackjack";

const dealer = [card("A", "S"), card("6", "H")];
handTotal(dealer); // => 17
isSoft(dealer); // => true

// A dealer who stands on soft 17 draws below 17, and one who hits soft 17
// draws to it as well.
const standsOnSoft17 = (hand: readonly Card[]) => handTotal(hand) < 17;
const hitsSoft17 = (hand: readonly Card[]) =>
  handTotal(hand) < 17 || (handTotal(hand) === 17 && isSoft(hand));
standsOnSoft17(dealer); // => false
hitsSoft17(dealer); // => true

// Drawing a 9 makes a hard 16: the ace drops back to 1.
const drawn = [...dealer, card("9", "C")];
handTotal(drawn); // => 16
isSoft(drawn); // => false
isBust([...drawn, card("8", "D")]); // => true

isBlackjack([card("K", "D"), card("A", "C")]); // => true
```

Counting cards takes two more:

- **`runningCount(cards)`** sums the cards' Hi-Lo tags: +1 for a 2 to 6, 0 for a 7 to 9, and −1 for a 10 to ace. Counts add up, so count each round's cards as they're seen and add them on, and start again from 0 after a reshuffle. For another counting system, pass a `tag` function, which is given each card and returns its tag.
- **`trueCount(runningCount, remainder, deck)`** divides a running count by the decks left to deal: the cards left in the shoe over the cards in the deck it was built from. Spanish 21 (Pontoon in Australian casinos) deals 48-card decks, the standard 52 without its 10s, so pass the deck you built the shoe with. The true count isn't rounded: round it as your betting rules say.

```ts
import { burn, dealFromShoe, discard, seededRandom, shoe } from "deckshoes";
import { runningCount, trueCount } from "deckshoes/blackjack";
import { standard52 } from "deckshoes/presets";

const deck = standard52();
const sixDecks = shoe(deck, 6, { random: seededRandom(42) });

// Count each round's cards and add them on.
const round = dealFromShoe(sixDecks, 4, 2);
let count = runningCount(round.hands.flat());
const next = dealFromShoe(discard(round.shoe, round.hands.flat()), 4, 2);
count += runningCount(next.hands.flat());
count; // => 2

// The running count per deck left to deal: 296 cards is about 5.7 decks.
trueCount(count, next.shoe.cards, deck); // => 0.3513513513513513
Math.trunc(trueCount(count, next.shoe.cards, deck)); // => 0

// With three decks left, a running count of +6 is a true count of +2.
trueCount(6, burn(sixDecks, 156).cards, deck); // => 2

// Spanish 21 measures the decks left in 48-card decks.
const spanish21 = deck.filter((c) => c.rank !== "10");
const spanishShoe = shoe(spanish21, 6, { random: seededRandom(42) });
trueCount(12, spanishShoe.cards, spanish21); // => 2
```

## Saving and loading

Cards, stacks and shoes are plain data, so `JSON.stringify` saves them: a card as its `rank`, `suit` and `color`, a stack as an array of cards, and a shoe as its `cards`, `cutCard` and `discardPile`. But what `JSON.parse` gives back is plain objects, which aren't `===` to any card. `cardFromJSON`, `stackFromJSON` and `shoeFromJSON` load them back as the real cards.

They take the parsed value rather than the text, so you can parse a saved game once and load each part of it. Cards cloned by `structuredClone` or `postMessage`, or taken from a second install of deckshoes, load the same way. A card needs its rank and suit exactly as `card()` takes them, so ten is `"10"`, and its suit's colour; any other field is ignored.

```ts
import {
  cardFromJSON,
  dealFromShoe,
  seededRandom,
  shoe,
  shoeFromJSON,
  stackFromJSON,
} from "deckshoes";
import { standard52 } from "deckshoes/presets";

const sixDecks = shoe(standard52(), 6, { random: seededRandom(42) });
const { hands, shoe: dealt } = dealFromShoe(sixDecks, 2, 2);

// Save the game as JSON, then load each part of it.
const saved = JSON.stringify({ hands, shoe: dealt });
const state = JSON.parse(saved) as { hands: unknown[]; shoe: unknown };
const loaded = {
  hands: state.hands.map((hand) => stackFromJSON(hand)),
  shoe: shoeFromJSON(state.shoe),
};
loaded; // => { hands, shoe: dealt }
loaded.shoe.cards[0] === dealt.cards[0]; // => true

// A card's colour has to be its suit's.
cardFromJSON({ rank: "A", suit: "S", color: "red" }); // throws INVALID_CARD
```

### Compact strings

For logs and URLs, `formatStack` writes a stack as a compact string: its cards top first, separated by single spaces, such as `"AS 10H KD"`. Cards are in short notation unless you choose `Notation.SYMBOL` or `Notation.UNICODE_CHARACTER`; a card's name has spaces in it, so it can't be used.

`formatShoe` writes a shoe as `cards | cut card's position | discard pile`:

- **The cards**, top first, as `formatStack` writes them.
- **The cut card's position**: the number of cards still to be dealt before the cut card is reached, and 0 once it has been.
- **The discard pile**, written as the cards are. When it's empty, it's left out with the `" | "` before it.

So `"AS 10H KD | 2 | 2C"` is a shoe of three cards with the cut card below the ten, and the two of clubs on the discard pile.

`parseStack` and `parseShoe` read them back. Each card is read as `parseCard` reads it, so notations and case can mix, but nothing else is read: one space between cards, none around them, and exactly `" | "` between a shoe's parts. A shoe with no cards left is written starting with a space, as `" | 0 | 2C"`, so don't trim it. Text that isn't a stack or a shoe makes them throw, and makes `tryParseStack` and `tryParseShoe` return `undefined`.

```ts
import {
  burn,
  card,
  formatShoe,
  formatStack,
  Notation,
  parseShoe,
  parseStack,
  tryParseStack,
} from "deckshoes";

const hand = [card("A", "S"), card("10", "H"), card("K", "D")];
formatStack(hand); // => "AS 10H KD"
formatStack(hand, { notation: Notation.SYMBOL }); // => "A♠ 10♥ K♦"
parseStack("as 10♥ 🃎"); // => hand

const threeCards = { cards: hand, cutCard: 2, discardPile: [] };
formatShoe(threeCards); // => "AS 10H KD | 2"
const burned = formatShoe(burn(threeCards));
burned; // => "10H KD | 1 | AS"
parseShoe(burned); // => burn(threeCards)

// One space between cards, none around them, and " | " between a shoe's parts.
parseStack("AS  10H"); // throws INVALID_CARD
tryParseStack("AS, 10H"); // => undefined
parseShoe("10H KD|1|AS"); // throws INVALID_ARGUMENT
```

### Saving a game safely

A saved shoe gives away every card to come, and anyone who can change it can stack it. Keep unplayed cards on a server. If a shoe has to travel through the client, such as in a URL, encrypt it with a key the client never sees, such as with Web Crypto's AES-GCM, which also detects tampering.

A random source isn't saved with a shoe, so a loaded shoe reshuffles with whatever source you pass:

- **The secure default:** nothing changes. Use it in real games.
- **The original seed again:** `seededRandom(seed)` starts its sequence from the beginning, so the loaded game's reshuffles repeat the first ones that seed gave, not the ones the saved game would have had next.
- **A new seed of your own:** the game carries on, reproducibly from the saved shoe and that seed, but it isn't the game the original seed would have played. To make a loaded game repeatable, save the seed you'll use next with the shoe, and reshuffle with `seededRandom(thatSeed)` after loading.

Choose seeds the way you'd choose any secret: anyone who knows or guesses a seed, such as one taken from the date, knows every shuffle it gives.

## Error handling

Every error deckshoes throws extends `DeckshoesError` and carries a stable `code`. Branch on the code rather than the message, since messages can be reworded in any release.

| Code                 | Class                    | Thrown when                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INVALID_ARGUMENT`   | `InvalidArgumentError`   | A count, position, seed or option is out of range, a stack isn't an array, text to parse as a stack or shoe isn't a string, a shoe or a shoe's compact string is malformed, a card to remove isn't in the stack, a rank or suit order repeats an entry, has a hole, or lacks a card's rank or suit, a random source misbehaves, a stack or shoe would hold more than 2³² − 1 cards, or its compact string would be longer than the runtime allows |
| `INVALID_CARD`       | `InvalidCardError`       | A rank, suit, card, or a card's text can't be recognised, or a saved card's colour isn't its suit's                                                                                                                                                                                                                                                                                                                                               |
| `INSUFFICIENT_CARDS` | `InsufficientCardsError` | An operation needs more cards than there are (has details)                                                                                                                                                                                                                                                                                                                                                                                        |

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
- **One install per app.** If you publish a library that uses deckshoes, list it in `peerDependencies` so your users' apps get one install. Two installs still work side by side, but their cards aren't `===` to each other, so pass one install's cards through `stackFromJSON` to use them with the other; `isDeckshoesError` recognises errors from both if they share a major version.

## Documentation

- [API reference](https://simpleprogrammingau.github.io/deckshoes/), generated from the doc comments in the source. Every example in it is run as a test.
- [Roadmap](./ROADMAP.md)
- [Changelog](https://github.com/SimpleProgrammingAU/deckshoes/blob/main/CHANGELOG.md)

## Migrating from 0.4

1.0 replaces 0.4's classes (`PlayingCard`, `Deck`, `Shoe`) with functions over frozen data. The [migration guide](./MIGRATING.md) maps every 0.4 class, method and constant to its 1.0 equivalent, and names what 1.0.0 doesn't cover yet: jokers, the 500 deck, and 0.4's Spanish deck, which the guide rebuilds from the standard 52.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to set up the project, the workflow from issue to merged PR, and the documentation rules. By taking part you agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## License

[MIT](./LICENSE) © Simple Programming
