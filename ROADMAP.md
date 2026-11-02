# Roadmap

deckshoes 1.0 is a ground-up rewrite of the 0.x package. Each milestone below has a matching [GitHub milestone](https://github.com/SimpleProgrammingAU/deckshoes/milestones), whose issues track the detailed work. Plans can change; the issues are the source of truth.

## M0: Foundation

Tooling, CI, release pipeline, documentation rules and contributor workflow. No public API beyond the error types.

## M1: Core (`1.0.0-alpha.N`)

- `Card`, `Rank`, `Suit` and `Color` types for the 52 standard cards. Cards are frozen and interned, so identical cards are `===`.
- Parse and format cards: `"AS"`, `"10h"`, `"Th"`, `"A♠"`, `"Ace of Spades"`, and Unicode playing-card characters.
- Rank orders (ace high or low) and suit orders, for sorting and comparing.
- Stack operations, which never change their input: `shuffle`, `draw`, `drawBottom`, `peek`, `deal`, `cut`, `insert`, `remove`, `contains`, `count`, `sort`, `groupBy`.
- Random sources: a secure default built on `crypto.getRandomValues`, and `seededRandom(seed)` for reproducible shuffles.
- The chain: `chain(stack).shuffle({ random }).deal(4, 5).value()`.
- Presets, imported from `deckshoes/presets`: standard 52, Piquet (32), Euchre (24) and Pinochle (48).
- Property-based tests for every stack operation, plus benchmarks.

## M2: Stable (`1.0.0`)

- `Shoe`: several decks dealt together, with a cut card or penetration, burn cards, a discard pile and a reshuffle trigger.
- Serialisation to JSON and to a compact string.
- Published API reference site.
- Migration guide from 0.4, naming what 1.0.0 doesn't cover: jokers, the 500 deck, and 0.4's French-suited Spanish deck, which is the standard 52 without the 10s.
- Leave prerelease mode, publish 1.0.0 as `latest`, and deprecate 0.x with a pointer to the guide.

## M3: Game helpers (1.x, optional subpath imports)

Each helper is its own entry point with its own size budget, so you only download what you import.

- `deckshoes/poker`: rank and compare 5- and 7-card hands.
- `deckshoes/blackjack`: hard and soft hand totals, Hi-Lo running count.
- `deckshoes/bridge`: high-card points and hand distribution.

## M4: Realistic shuffles (1.x)

Riffle (Gilbert–Shannon–Reeds model), overhand, pile and wash shuffles, and imperfect cuts, with a statistical test harness to check their distributions.

## M5: Custom and other decks (1.x or 2.0)

- `defineDeck()`, so your own ranks and suits are fully type-checked, including jokers and the 500 deck's 11, 12 and 13.
- Jokers, and the 500 (63 cards), Spanish (40 and 48, with Spanish suits), Tarot (78 cards), German- and Italian-suited decks.

## Ongoing

Bundle size budgets, dependency updates, more examples in the docs, and an online playground.
