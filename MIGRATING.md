# Migrating from 0.4

deckshoes 1.0 is a rewrite. This guide maps each part of 0.4's API to its 1.0 equivalent, with examples, and names what 1.0.0 doesn't cover yet.

The 0.x packages on npm held their README and tests but no compiled code, so this guide maps the API those document. 0.2 and 0.3 have the same API as 0.4, so it covers them too.

## What changed

- **Functions, not classes.** 0.4's `Deck` and `Shoe` changed themselves as you added and drew cards. In 1.0, cards, stacks and shoes are frozen, and every function returns new data and leaves what you passed it alone, so keep each result. `chain()` writes the same calls as a pipeline.
- **One object for each card.** `card("A", "S")` returns the same object every time, so cards compare with `===`, and `includes`, `Set` and `Map` work on them.
- **Strings, not enums.** Suits are `"S"`, `"H"`, `"D"` and `"C"`, and colours are `"red"` and `"black"`, where 0.4 had the `Suit` and `Color` enums.
- **Draws come from the top.** 0.4 drew a random card each time. In 1.0 you shuffle once, with a random source you can seed, and then draw from the top.
- **Errors carry codes.** Every error 1.0 throws extends `DeckshoesError` and has a stable `code` to branch on.
- **ESM only.** 1.0 runs on Node.js 22.12 or later, which can also `require()` it, and in Deno, Bun and current browsers. See the README's [Install](./README.md#install) and [Compatibility](./README.md#compatibility) sections.

## Every 0.4 API at a glance

| 0.4                                                         | 1.0                                                     | See                                                |
| ----------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| `PlayingCard` (the type)                                    | `Card`                                                  | [Cards](#cards)                                    |
| `new PlayingCard(rank, suit)`                               | `card(rank, suit)`                                      | [Cards](#cards)                                    |
| `PlayingCard.parseString(text)`                             | `parseCard(text)`, or `tryParseCard(text)`              | [Cards](#cards)                                    |
| `getRank()`                                                 | `rank`                                                  | [Cards](#cards)                                    |
| `getSuit()`                                                 | `suit`                                                  | [Cards](#cards)                                    |
| `Suit.spades`, `Suit.hearts`, `Suit.diamonds`, `Suit.clubs` | `"S"`, `"H"`, `"D"`, `"C"`, of the type `Suit`          | [Cards](#cards)                                    |
| `Color.red`, `Color.black`                                  | `"red"`, `"black"`, of the type `Color`                 | [Cards](#cards)                                    |
| `JokerCard`, `new JokerCard(color)`, `getColor()`           | Not in 1.0.0. A standard card's colour is `color`       | [What 1.0.0 doesn't cover](#what-100-doesnt-cover) |
| `Deck` (the type)                                           | `CardStack`                                             | [Decks](#decks)                                    |
| `new Deck()`                                                | `[]`                                                    | [Decks](#decks)                                    |
| `Deck.generateDeck()`, `Deck.generateStandardDeck()`        | `standard52()`                                          | [Decks](#decks)                                    |
| `Deck.generatePiquetDeck()`                                 | `piquet()`                                              | [Decks](#decks)                                    |
| `Deck.generateSpanishDeck()`                                | `standard52().filter(({ rank }) => rank !== "10")`      | [What 1.0.0 doesn't cover](#what-100-doesnt-cover) |
| `Deck.generate500Deck(players)`                             | Not in 1.0.0                                            | [What 1.0.0 doesn't cover](#what-100-doesnt-cover) |
| `deck.count`                                                | `deck.length`                                           | [Decks](#decks)                                    |
| `deck.drawCard()`                                           | `draw(deck)`, after a `shuffle`                         | [Decks](#decks)                                    |
| `deck.addCard(card)`                                        | `insert(deck, [card], position)`                        | [Decks](#decks)                                    |
| `deck.removeCard(card)`                                     | `remove(deck, [card])`                                  | [Decks](#decks)                                    |
| `deck.validateDeck()`                                       | `new Set(deck).size === deck.length`                    | [Decks](#decks)                                    |
| `Shoe` (the class)                                          | `Shoe`, the type of what `shoe(deck, deckCount)` builds | [Shoes](#shoes)                                    |
| `new Shoe(deckCount)`                                       | `shoe(standard52(), deckCount)`                         | [Shoes](#shoes)                                    |
| `new Shoe()`                                                | None: a shoe holds at least one deck                    | [Shoes](#shoes)                                    |
| `shoe.addDeck(deck)`, `shoe.addStandardDecks(count)`        | Choose the decks when you build the shoe                | [Shoes](#shoes)                                    |
| `shoe.count`                                                | The deck count you passed to `shoe()`                   | [Shoes](#shoes)                                    |
| `shoe.cardCount`                                            | `shoe.cards.length`                                     | [Shoes](#shoes)                                    |
| `shoe.drawCard()`                                           | `drawFromShoe(shoe)`                                    | [Shoes](#shoes)                                    |
| `shoe.empty()`                                              | Build a new shoe                                        | [Shoes](#shoes)                                    |
| `InvalidArgumentError`                                      | `InvalidArgumentError` or `InvalidCardError`            | [Errors](#errors)                                  |
| `OutOfBoundsError`                                          | `InsufficientCardsError` or `InvalidArgumentError`      | [Errors](#errors)                                  |

## Cards

In 0.4:

```ts no-test
import { PlayingCard, Suit } from "deckshoes";

const ace = new PlayingCard("A", Suit.spades);
ace.getRank(); // "A"
ace.getSuit(); // Suit.spades

const parsed = PlayingCard.parseString("as");
```

`card(rank, suit)` returns the one object for that card, and its `rank`, `suit` and `color` are properties. TypeScript checks the rank and suit you pass. Values it can't check, such as user input, are checked when the card is made: a rank or suit that isn't standard throws `InvalidCardError`.

`parseCard` reads a card written as text, ignoring the case of A–Z as 0.4's `parseString` did. It reads more than 0.4 did: ten as `T`, suit symbols such as `"A♠"`, names such as `"Ace of Spades"`, and Unicode's playing-card characters. `tryParseCard` returns `undefined` where `parseCard` throws.

0.4 took three things that 1.0 doesn't:

- **`"1"` for the ace.** Write `"A"`.
- **A lower-case rank**, such as `new PlayingCard("j", Suit.spades)`. `card()` takes ranks exactly as written, so it's `card("J", "S")`. `parseCard` still ignores case.
- **The 500 deck's 11s, 12s and 13s**, such as `"11S"`. See [What 1.0.0 doesn't cover](#what-100-doesnt-cover).

In 1.0:

```ts
import { card, parseCard, tryParseCard } from "deckshoes";

const ace = card("A", "S");
ace.rank; // => "A"
ace.suit; // => "S"
ace.color; // => "black"

// Text in any case gives the same object as card().
parseCard("as") === ace; // => true
parseCard("js"); // => card("J", "S")

// No 1 for the ace, and no 11, 12 or 13.
parseCard("1S"); // throws INVALID_CARD
tryParseCard("11S"); // => undefined
```

## Decks

In 0.4:

```ts no-test
import { Deck, PlayingCard, Suit } from "deckshoes";

const deck = Deck.generateStandardDeck();
deck.count; // 52
deck.validateDeck(); // true

// Each call changes the deck.
deck.removeCard(new PlayingCard("4", Suit.diamonds)).count; // 51
const drawn = deck.drawCard(); // A random card
deck.addCard(drawn);
```

A deck is a stack: a frozen array of cards, top first, of the type `CardStack`. So `new Deck()` is `[]`, `count` is `length`, and any array of cards works wherever a stack is taken. Presets give full decks: `standard52()` for `generateDeck()` and `generateStandardDeck()`, and `piquet()` for `generatePiquetDeck()`, both in new deck order.

Every function returns a new stack and leaves the one you passed alone, so keep the result where 0.4 changed the deck:

- **Drawing.** 0.4's `drawCard` took a random card. In 1.0, shuffle the deck once and `draw` from the top, which gives the same odds. `draw` returns the cards drawn and the remainder, the stack left after drawing them: carry on with the remainder.
- **Adding.** `insert(deck, cards, position)` puts cards in at a position: 0 for the top, or `Position.BOTTOM`. Where 0.4's `addCard` put a card didn't matter, since its draws were random, but 1.0 draws from the top. Leave the position out to insert at random.
- **Removing.** `remove(deck, cards)` takes out the topmost copy of each card, and throws `InvalidArgumentError` if one isn't there. `cards` is always an array, even for one card.
- **Checking.** 0.4's `validateDeck` turned false once the deck held a card twice. Each card is one object, so a `Set` finds copies: `new Set(deck).size === deck.length`.

0.4's `addCard` and `removeCard` returned the deck, so one call could follow another. `chain(deck)` does the same, and `.value()` unwraps the result.

In 1.0:

```ts
import {
  card,
  type CardStack,
  chain,
  draw,
  insert,
  Position,
  remove,
  seededRandom,
  shuffle,
} from "deckshoes";
import { standard52 } from "deckshoes/presets";

const deck: CardStack = standard52();
deck.length; // => 52

// Every call returns a new stack, so keep the result.
const fewer = remove(deck, [card("4", "D")]);
fewer.length; // => 51
deck.length; // => 52

// Shuffle once, then draw from the top.
const shuffled = shuffle(deck, { random: seededRandom(42) });
const { cards, remainder } = draw(shuffled);
cards; // => [card("7", "H")]
remainder.length; // => 51

// Put the card back, at the bottom this time.
const back = insert(remainder, cards, Position.BOTTOM);
back[51]; // => card("7", "H")

// No card twice.
new Set(back).size === back.length; // => true
const twoAces = [...deck, card("A", "S")];
new Set(twoAces).size === twoAces.length; // => false

// One call after another, as a chain.
chain(deck)
  .remove([card("4", "D")])
  .insert([card("4", "D")], 0)
  .value()[0]; // => card("4", "D")
```

## Shoes

In 0.4:

```ts no-test
import { Deck, Shoe } from "deckshoes";

const shoe = new Shoe(6); // Six standard decks
shoe.addDeck(Deck.generatePiquetDeck()).addStandardDecks(1);
shoe.count; // 8 decks
shoe.cardCount; // The cards in all its decks

const drawn = shoe.drawCard(); // A random card
shoe.empty(); // No decks left
```

A 1.0 shoe is the cards of one or more decks, shuffled together, with a cut card that marks when to reshuffle. `shoe(deck, deckCount)` builds it in one call and returns a frozen `{ cards, cutCard, discardPile }`. Where 0.4's shoe was a list of decks you could add to:

- **Choose the decks when you build it.** `shoe(standard52(), 6)` is six standard decks. For different decks, join them into one stack first, and build a shoe of one copy of it: `shoe([...standard52(), ...piquet()], 1)`. A shoe holds at least one deck, so there's no empty shoe to add to.
- **Count its cards** with `shoe.cards.length`. A shoe doesn't remember how many decks went into it, so keep the count you passed.
- **Draw** with `drawFromShoe(shoe)`. The shoe was shuffled when it was built, so this draws from the top, and returns the cards drawn and the shoe left.
- **Start again** by building a new shoe, where 0.4 emptied it. To put the cards you've dealt back in, `discard` them and `reshuffle`.

1.0's shoes also burn cards, keep a discard pile, and tell you when the cut card is reached. See the README's [Shoes](./README.md#shoes) section.

In 1.0:

```ts
import { card, drawFromShoe, seededRandom, shoe } from "deckshoes";
import { piquet, standard52 } from "deckshoes/presets";

const sixDecks = shoe(standard52(), 6, { random: seededRandom(42) });
sixDecks.cards.length; // => 312

// Draw from the top, and carry on with the shoe left.
const { cards, shoe: left } = drawFromShoe(sixDecks);
cards; // => [card("Q", "S")]
left.cards.length; // => 311

// Different decks: join them into one stack, then build a shoe of one copy.
const mixed = shoe([...standard52(), ...piquet()], 1, {
  random: seededRandom(7),
});
mixed.cards.length; // => 84

// A shoe holds at least one deck.
shoe(standard52(), 0); // throws INVALID_ARGUMENT
```

## Errors

0.4 threw `InvalidArgumentError` and `OutOfBoundsError`, and their messages told the problems apart. Every error 1.0 throws extends `DeckshoesError` and carries a stable `code`. Branch on the code rather than the message, since messages can be reworded in any release. The README's [Error handling](./README.md#error-handling) section lists every code.

| 0.4 error              | 0.4 message                                              | 1.0 code                                                           |
| ---------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| `InvalidArgumentError` | "Invalid rank. Must be 1 to 13; A, J, Q, K; or Joker."   | `INVALID_CARD`                                                     |
| `InvalidArgumentError` | "Invalid suit. Must be one of: H, C, D, S."              | `INVALID_CARD`                                                     |
| `InvalidArgumentError` | "Invalid string representation of a card entered."       | `INVALID_CARD`                                                     |
| `OutOfBoundsError`     | "There are no cards available to draw from the deck."    | `INSUFFICIENT_CARDS`                                               |
| `OutOfBoundsError`     | "All decks are empty."                                   | `INSUFFICIENT_CARDS`                                               |
| `OutOfBoundsError`     | "Argument must be a number greater than zero."           | `INVALID_ARGUMENT`                                                 |
| `InvalidArgumentError` | "Argument must be a number."                             | A TypeScript error, or `INVALID_ARGUMENT` for a value it can't see |
| `InvalidArgumentError` | "Argument must be a valid Deck object."                  | A TypeScript error, or `INVALID_ARGUMENT` for a value it can't see |
| `InvalidArgumentError` | "Arguement must be a number between 2 and 6, inclusive." | None: the 500 deck isn't in 1.0.0                                  |

The codes belong to the classes `InvalidCardError`, `InsufficientCardsError` and `InvalidArgumentError`. `isDeckshoesError(error, code)` checks a caught error and narrows its type.

In 1.0:

```ts
import {
  card,
  type Card,
  type CardStack,
  draw,
  isDeckshoesError,
  parseCard,
  shoe,
} from "deckshoes";
import { standard52 } from "deckshoes/presets";

parseCard("QueenD"); // throws INVALID_CARD
draw([]); // throws INSUFFICIENT_CARDS
shoe(standard52(), -1); // throws INVALID_ARGUMENT

// Catch an error by its code.
function drawOne(deck: CardStack): Card | undefined {
  try {
    return draw(deck).cards[0];
  } catch (error) {
    if (isDeckshoesError(error, "INSUFFICIENT_CARDS")) return undefined;
    throw error;
  }
}
drawOne(standard52()); // => card("A", "H")
drawOne([]); // => undefined
```

## What 1.0.0 doesn't cover

1.0.0 has the 52 standard cards and nothing else ([ADR 0003](./docs/adr/0003-standard-cards-are-a-closed-set.md)). Three things from 0.4 aren't in it:

- **Jokers.** `JokerCard` has no 1.0.0 equivalent. Jokers arrive after 1.0 with custom decks ([#39](https://github.com/SimpleProgrammingAU/deckshoes/issues/39), [#40](https://github.com/SimpleProgrammingAU/deckshoes/issues/40)).
- **The 500 deck.** 500 is played with a joker, and its six-player deck adds 11s, 12s and 13s, so `Deck.generate500Deck(players)` has no 1.0.0 equivalent either. The 500 deck arrives with custom decks too ([#40](https://github.com/SimpleProgrammingAU/deckshoes/issues/40)).
- **The Spanish deck.** 0.4's Spanish deck used French suits: it was a stripped deck, the standard 52 without the 10s. Rebuild it by taking the 10s out of `standard52()`, and the cards left stay in new deck order. The result is an ordinary array rather than a frozen one, which every function takes. 1.0 has no preset by that name, since Spanish decks with Spanish suits arrive later ([#40](https://github.com/SimpleProgrammingAU/deckshoes/issues/40)), and a French-suited deck would take the name.

```ts
import { card } from "deckshoes";
import { standard52 } from "deckshoes/presets";

// 0.4's Spanish deck: the standard 52 without the 10s.
const spanish = standard52().filter(({ rank }) => rank !== "10");
spanish.length; // => 48

// New deck order, with the jack of hearts straight after the nine.
spanish.slice(8, 10); // => [card("9", "H"), card("J", "H")]
```

## New in 1.0

Much of 1.0 is new, with nothing in 0.4's README or tests to map from. See the README's sections on [dealing](./README.md#dealing), [cutting, inserting and removing](./README.md#cutting-inserting-and-removing), [sorting and grouping](./README.md#sorting-and-grouping), [burning and discarding](./README.md#shoes), [saving and loading](./README.md#saving-and-loading), and [random sources](./README.md#random-sources), which make shuffles repeatable with a seed. The [API reference](https://simpleprogrammingau.github.io/deckshoes/) covers every function.
