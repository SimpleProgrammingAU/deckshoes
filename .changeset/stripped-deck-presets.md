---
"deckshoes": minor
---

Add the Piquet and Euchre presets to `deckshoes/presets`. `piquet()` gives the 32 cards from 7 to ace, and `euchre()` the 24 cards from 9 to ace. Each is the standard 52 without its low ranks, still in new deck order, and returns the same frozen stack on every call.
