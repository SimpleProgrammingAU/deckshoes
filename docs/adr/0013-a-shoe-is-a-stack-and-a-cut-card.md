# A shoe is a stack and a cut card, dealt from by its own functions

A shoe is a frozen plain object holding two things: `cards`, the stack still in the shoe, top first, and `cutCard`, the cut card's position in it, the number of cards above it. `shoe(deck, deckCount, { penetration, random })` stacks `deckCount` copies of the deck one on top of another, shuffles them, and puts the cut card at the penetration: a proportion from 0 to 1, 0.75 by default, of the shoe's cards, rounded to the nearest card. Cards come out through `drawFromShoe` and `dealFromShoe`, which call `draw` and `deal` on the shoe's cards, move the cut card up by the number of cards taken, and return a frozen object naming each part, as the stack operations do ([ADR 0001](./0001-functional-core-with-a-chain.md)). Anything that only reads a shoe's cards, such as peeking or counting, is a stack operation on `shoe.cards`.

```ts no-test
const sixDecks = shoe(standard52(), 6, { random: seededRandom(42) });
sixDecks.cutCard; // 234: three quarters of 312 cards
const { hands, shoe: next } = dealFromShoe(sixDecks, 3, 2);
next.cutCard; // 228
peek(next.cards, 1);
```

## Considered options

- **`draw` and `deal` accepting a shoe as well as a stack.** One verb for both, but the result would change shape with the input, since a shoe has to come back where a remainder would. Every other stack operation would face the same question, and most of them, such as cutting, sorting or drawing from the bottom, would break the cut card. Every `draw` user would bundle and read about shoe code they don't use.
- **The cut card as a marker inside the stack.** Closer to the real thing, but the marker isn't a card, so every stack operation would have to skip it, and a stack typed to custom cards couldn't hold it.
- **A class, or a type with a compile-time brand.** A class loses its methods through `structuredClone`, `postMessage` and JSON, as [ADR 0004](./0004-a-stack-is-a-frozen-array-top-first.md) found for stacks. A brand keeps hand-written shoes out, but a hand-written shoe has no trap like a hand-written card, which type-checks and then never matches `===` ([ADR 0002](./0002-cards-are-interned-branded-objects.md)).
- **A `cutCardReached` field.** It reads best, but it's the same fact as `cutCard === 0` stored twice, so every shoe passed in, and every shoe loaded from JSON, would have to be checked for the two agreeing. A field or helper can still be added later in a minor release.
- **`chain(shoe)` now.** Drawing and dealing split a shoe in two, so every method of a shoe chain would end it straight away, and `chain(s).deal(3, 2).value()` would only be a longer `dealFromShoe(s, 3, 2)`.

## Consequences

- The cut card is reached once as many cards have been dealt as sat above it, and `cutCard` stays at 0 from then on. Dealing can go on past it, as a dealer finishes the round in play; only running out of cards stops a draw. A penetration of 0 makes every round the last before a reshuffle, and 1 deals the whole shoe.
- A shoe of one deck, and a shoe from an empty deck, are allowed. An empty shoe has reached its cut card.
- How the copies are stacked before the shuffle, and how penetration is rounded, are fixed for 1.x, so a seeded shoe gives the same cards and cut card in every 1.x release ([ADR 0006](./0006-randomness-is-an-injected-source.md)). The cut card's position is `Math.round(penetration × cards)`: a tie, such as half of 3 cards, goes to the later card, and a penetration rounds as the number JavaScript holds, so 0.58 of 25 cards gives 14, because 0.58 is held as a little less than 0.58.
- Until [#29](https://github.com/SimpleProgrammingAU/deckshoes/issues/29) adds a discard pile, a reshuffle is a new `shoe()`, which is what a casino does: every card goes back in.
- No stack operation takes a shoe, and `chain(shoe)` throws, because a shoe isn't an array. Shoes are meant to get a chain once they have operations that return a shoe, such as burning and reshuffling ([#77](https://github.com/SimpleProgrammingAU/deckshoes/issues/77)). Until then, `chain(shoe.cards)` works for reading.
- A shoe is checked by its shape wherever it enters the library: `cards` must be an array and `cutCard` an integer from 0 to the number of cards. So a shoe written by hand, or loaded from JSON ([#30](https://github.com/SimpleProgrammingAU/deckshoes/issues/30)), works the same as one from `shoe()`.
- A new field, such as #29's discard pile, has to be optional, read as empty when it's missing, because shoes written by hand and shoes loaded from JSON won't have it. Added that way, it breaks no one.
