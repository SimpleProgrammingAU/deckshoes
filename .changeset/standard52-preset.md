---
"deckshoes": minor
---

Add presets, imported from the new `deckshoes/presets` entry point. The first is `standard52()`, which returns the 52 standard cards in new deck order, the order a new deck comes out of the box in: hearts and clubs from ace to king, then diamonds and spades from king to ace. The ace of hearts is on top and the ace of spades at the bottom. Every call returns the same frozen stack, holding the same card objects that `card()` returns.
