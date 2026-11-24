---
"deckshoes": patch
---

`insert` throws `INVALID_ARGUMENT` when the stack and the cards put into it would hold more than 2³² − 1 cards between them, instead of the runtime's `RangeError`, which has no `code` and which `isDeckshoesError` doesn't recognise.
