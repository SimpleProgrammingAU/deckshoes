---
"deckshoes": minor
---

Add `draw` and `drawBottom`, which draw cards from the top or bottom of a stack and return a frozen `{ cards, remainder }`, and `peek` and `peekBottom`, which look at those cards without drawing them. The count is 1 if it's left out or `undefined`. Cards from the bottom stay in stack order, top first. Asking for more cards than the stack holds throws `InsufficientCardsError`, and a count that isn't an integer of 0 or more throws `InvalidArgumentError`.

The chain has the same four operations, such as `chain(deck).draw(2).value()`, and each gives what its function gives. Each one ends the chain with a `TerminatedChain`, which only offers `.value()`, because a pipeline can't carry on from two stacks, or from cards that are still in the stack. To carry on after a draw, wrap the remainder again with `chain(result.remainder)`. To carry on after a peek, use the chain you peeked from, which still holds the stack.
