---
"deckshoes": minor
---

Five new stack operations, each with a chain method of the same name:

- `cut(stack, position?, options?)` moves the cards above a position from the top to the bottom. Leave the position out, or pass `Position.RANDOM`, to cut at random with the `random` option.
- `insert(stack, cards, position?, options?)` puts cards into a stack at a position, keeping their order: 0 for the top, `Position.BOTTOM` for the bottom, or `Position.RANDOM`.
- `remove(stack, cards)` takes the topmost copy of each card out of a stack, and throws `InvalidArgumentError` if one has no copy left.
- `contains(stack, cards)` tells whether `remove` would find every card, counting copies.
- `count(stack, match)` counts the cards a function accepts.
