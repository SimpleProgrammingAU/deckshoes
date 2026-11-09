---
"deckshoes": minor
---

Add `parseCard(text)`, `tryParseCard(text)` and `formatCard(card, options)`, which read and write cards as text. Parsing reads short notation (`"AS"`, `"10h"`, `"Th"`), symbol notation (`"A♠"`) and names (`"Ace of Spades"`), in any case. Unrecognised text makes `parseCard` throw `InvalidCardError`, and `tryParseCard` return `undefined`. `formatCard` writes short notation, or pass `{ notation: Notation.SYMBOL }` or `{ notation: Notation.NAME }`.
