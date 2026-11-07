---
"deckshoes": minor
---

Add `draw` and `drawBottom`, which draw cards from the top or bottom of a stack and return a frozen `{ cards, remainder }`, and `peek` and `peekBottom`, which look at those cards without drawing them. The count is 1 if it's left out or `undefined`. Cards from the bottom stay in stack order, top first. Asking for more cards than the stack holds throws `InsufficientCardsError`, and a count that isn't an integer of 0 or more throws `InvalidArgumentError`.
