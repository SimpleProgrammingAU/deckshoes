---
"deckshoes": minor
---

Add blackjack helpers, imported from the new `deckshoes/blackjack` entry point. `handTotal()` gives a hand's total, counting an ace as 11 when that keeps the total at 21 or under, and `isSoft()`, `isBlackjack()` and `isBust()` say whether a hand is soft, a blackjack or bust. `runningCount()` sums the cards' tags in Hi-Lo, or in a counting system of your own through its `tag` option, and `trueCount()` divides a running count by the decks left to deal, measured by the deck the shoe was built from, so Spanish 21's 48-card decks count correctly. They read cards by rank, so cloned cards count the same as real ones.
