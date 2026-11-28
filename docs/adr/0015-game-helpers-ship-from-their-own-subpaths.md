# Game helpers ship from their own subpaths

Each game's helpers ship from a subpath named after the game, as presets do ([ADR 0008](./0008-presets-ship-from-a-subpath.md)), starting with `deckshoes/blackjack`. They're plain functions with no chain methods. Their parameters are typed to standard cards (`CardStack`), as notations and presets are, rather than generic as stack operations are ([ADR 0004](./0004-a-stack-is-a-frozen-array-top-first.md)), but they read each card by its rank, and by its suit where the game needs it, as poker's flushes do, so a cloned card, such as one sent with `postMessage`, gives the same answer as the real one. A card without a standard rank, or without a standard suit where the suit is read, throws `INVALID_CARD`, naming its position. They throw the root entry point's error classes, and import the library's modules directly, never an entry point.

```ts no-test
import { card } from "deckshoes";
import {
  handTotal,
  isSoft,
  runningCount,
  trueCount,
} from "deckshoes/blackjack";
import { standard52 } from "deckshoes/presets";

const hand = [card("A", "S"), card("6", "H")];
handTotal(hand); // 17
isSoft(hand); // true
trueCount(runningCount(seen), shoe.cards, standard52());
```

## Considered options

- **Chain methods** (`chain(hand).handTotal()`). Only the root imports the chain ([ADR 0001](./0001-functional-core-with-a-chain.md)), so the root would have to import every helper, and every chain user would bundle every game.
- **Only this install's cards,** checked with `isCard` as `formatStack` does. A cloned card gives the same total, so turning it away helps nobody, and the check would put the card table in every helper's bundle.
- **One `deckshoes/games` subpath** for every game. Bundlers would still drop the games that aren't imported, but each game's API reference would be mixed in with every other game's.
- **Helpers in the root entry point.** The root's API and reference would grow with every game, for users who play none of them.

## Consequences

- Each game has its own exports entry, build entry, size budget, API reference entry point and smoke test, as `deckshoes/presets` does.
- A game helper can't be part of a pipeline. It reads a stack and answers with a number, a flag, a named value, a list of numbers such as bridge's distribution, or a stack such as poker's best hand, so a chain user unwraps with `.value()` first.
- A helper that counts, such as blackjack's totals and bridge's high-card points and distribution, counts the cards it's given, copies included. Only a helper whose answer a copy would make impossible, such as poker's category, rejects them ([ADR 0016](./0016-poker-hands-are-judged-by-their-best-five-cards.md)). Rejecting copies later would break calls that work, so each helper settles it when it's added.
- Lint stops any library module, entry points included, from importing `deckshoes`, `deckshoes/*` or an `index.ts`, value or type (#74), so a helper can't reach the root's chain through its errors.
- A helper may default a setting to its game's dominant convention, such as Hi-Lo for `runningCount`'s tags. A rank order has no default ([ADR 0012](./0012-rank-and-suit-orders-are-lists-passed-to-every-call.md)), because the right one depends on the game, but a game helper's subpath already names the game.
- An input that gives a wrong number with no error when left at a default is required and positional instead, such as the deck `trueCount` divides by: Spanish 21 is dealt from 48-card decks ([ADR 0009](./0009-settings-go-in-one-options-object.md)).
- Whether game helpers take a custom deck's cards, such as the 500 deck's 11s, is for custom decks to settle ([#39](https://github.com/SimpleProgrammingAU/deckshoes/issues/39)). Until then, they're typed to standard cards, and a card without a standard rank throws `INVALID_CARD`.
