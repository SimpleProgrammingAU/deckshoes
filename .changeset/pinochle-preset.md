---
"deckshoes": minor
---

Add the Pinochle preset to `deckshoes/presets`. `pinochle()` gives the 48-card deck, two of each card from 9 to ace, and `pinochle({ size })` the 64-, 80- and 120-card decks. Each is copies of one stripped deck, one on top of the other, and a card's copies are the same object. Every call returns the same frozen stack for its size, and any other size throws `InvalidArgumentError`. The rank order examples now call Pinochle's order `pinochleOrder`, so it doesn't clash with the preset.
