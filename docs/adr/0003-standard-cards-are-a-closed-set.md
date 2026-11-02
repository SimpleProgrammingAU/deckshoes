# Standard cards are a closed set

deckshoes 1.0 models the 52 standard cards: the four French suits and the ranks A to K, with no jokers. The rank and suit types are closed unions, and they stay that way through 1.x, because adding a member would break users' exhaustive `switch` statements in a minor release. Every other card comes through custom decks ([#39](https://github.com/SimpleProgrammingAU/deckshoes/issues/39), [#40](https://github.com/SimpleProgrammingAU/deckshoes/issues/40)), which give their cards their own types instead of widening the standard ones. That covers jokers, the 500 deck's 11, 12 and 13, and the Spanish, German, Italian and Tarot suits.

The glossary leaves room for them. Ranked, suited and coloured are overlapping traits rather than kinds of card: a standard card has all three, a joker is only coloured, and a Uno-style "green 7" would be ranked and coloured but not suited. A standard card's colour comes from its suit. Whether that holds for a custom deck is up to the deck.

## Considered options

- **Adding jokers and ranks 11–13 to the standard types in 1.0**, to cover 0.4's jokers and 500 deck. Every user would handle cards that most games never use, and the next addition would still be a breaking change.
- **French-suited Spanish presets, as in 0.4.** A deck called "Spanish" would have hearts and spades, and the name would be taken when native Spanish suits arrive.

## Consequences

- 1.0.0 doesn't have 0.4's jokers, 500 deck or Spanish deck. The migration guide ([#31](https://github.com/SimpleProgrammingAU/deckshoes/issues/31)) names the gaps. 0.4's French-suited Spanish deck is the standard 52 without the 10s.
- Stack operations, sorting included, are generic over the card type ([ADR 0004](./0004-a-stack-is-a-frozen-array-top-first.md)), so custom decks can arrive in 1.x without changing them.
- The `Card`, `Rank`, `Suit` and `Color` types are the standard ones. A custom deck's cards have their own types, so `Card` names a standard card, not every card the glossary calls a card.
