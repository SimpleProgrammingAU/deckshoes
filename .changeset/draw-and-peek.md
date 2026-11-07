---
"deckshoes": minor
---

Add `draw` and `drawBottom`, which draw cards from the top or bottom of a stack and return a frozen `{ cards, remainder }`, and `peek` and `peekBottom`, which look at those cards without drawing them. The chain has the same operations, and each ends it with a `TerminatedChain`, which only offers `.value()`.
