---
"deckshoes": minor
---

Add poker helpers, imported from the new `deckshoes/poker` entry point. `handCategory()` names a poker hand's category, such as `Category.FULL_HOUSE`, `bestHand()` gives its cards, most significant first, and `compareHands()` says which of two poker hands wins, or that they tie, and works as a sort comparator. Each judges the best five of the cards it's given, such as hold'em's hole cards with the community cards, or all of them while there are fewer than five, so a pair before the flop is one pair. They read cards by rank and suit, so cloned cards work, and a card given twice throws.
