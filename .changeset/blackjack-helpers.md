---
"deckshoes": minor
---

Add blackjack helpers, imported from the new `deckshoes/blackjack` entry point: `handTotal()` gives a hand's total, counting an ace as 11 when that keeps the total at 21 or under, and `isSoft()`, `isBlackjack()` and `isBust()` say whether a hand is soft, a blackjack or bust. They read cards by rank, so cloned cards count the same as real ones.
