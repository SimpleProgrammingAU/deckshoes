# Presets ship from a subpath

Every preset is imported from `deckshoes/presets`, not from the root entry point:

```ts no-test
import { chain, seededRandom } from "deckshoes";
import { standard52 } from "deckshoes/presets";
```

Presets are functions named after the deck in camelCase, with the card count only when the name alone would be ambiguous: `standard52()`, `piquet()`, `euchre()`, `pinochle()`. A preset builds its stack on the first call and returns the same frozen stack after that. They're functions rather than constants because some presets will take options, such as the 500 deck's player count ([#40](https://github.com/SimpleProgrammingAU/deckshoes/issues/40)); those cache one stack for each set of options. Presets that arrive with custom decks go in the same subpath.

`standard52()` is in new deck order, the order a new Bicycle deck comes out of the box in: face down from the top, hearts and clubs from ace to king, then diamonds and spades from king to ace. As a stack, the ace of hearts is on top and the ace of spades is at the bottom. A stripped deck, such as `piquet()` or `euchre()`, keeps new deck order with its stripped ranks taken out, so the ace of hearts is still on top and the ace of spades at the bottom. A preset's order is fixed for 1.x: a seeded shuffle starts from it, so changing the order changes every seeded result.

## Considered options

- **Standalone functions in the root entry point** (`standard52()` from `"deckshoes"`). One import, but presets aren't grouped in autocomplete or the API reference.
- **A plain object** (`PresetDeck.Standard52()`). Grouped, but bundlers keep the whole object, so using one preset bundles them all. PascalCase also reads like a class with static methods.
- **A namespace export** (`presets.standard52()` from `"deckshoes"`). Grouped, and tree-shakeable with static access, but it relies on every bundler seeing through the namespace.
- **One function taking a name** (`preset("standard52")`). One entry point, but it bundles every preset.
- **Each suit from ace to king, in the order spades, hearts, diamonds, clubs** for `standard52()`. Simpler to state, but no real deck comes out of the box that way.
- **Rank first** (A♠ A♥ A♦ A♣ 2♠ …) for `standard52()`. It's the order of the library's internal card table, but it reads oddly as a deck.
- **Each suit of a stripped deck from its lowest rank up to ace**, as the games rank them (7♥ 8♥ … A♥ for Piquet). It reads like the games' rank order, but it's a second ordering rule beside new deck order, and a stripped deck's order would differ from the deck it's stripped from, so a seeded shuffle of `euchre()` wouldn't match one of the standard 52 with its 2s to 8s filtered out.

## Consequences

- The quick start needs two imports.
- The subpath needs its own exports entry, build entry, size budget and API reference entry point. [#17](https://github.com/SimpleProgrammingAU/deckshoes/issues/17) sets them up with the first preset, and the game helpers reuse the setup.
- `deckshoes` and `deckshoes/presets` must share one card table ([ADR 0002](./0002-cards-are-interned-branded-objects.md)). The build puts shared code in a common chunk, and the smoke test checks that a preset's cards are `===` to the ones `card()` returns.
