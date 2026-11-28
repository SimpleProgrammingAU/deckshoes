---
"deckshoes": minor
---

Add bridge helpers, imported from the new `deckshoes/bridge` entry point. `highCardPoints()` counts a hand's high-card points, 4 for an ace, 3 for a king, 2 for a queen and 1 for a jack, and `distribution()` gives its suit lengths, longest first, such as `[4, 3, 3, 3]`. Both take any cards, such as a hand in mid-play or a partnership's two hands. Both read each card's rank, and `distribution()` its suit too, so cloned cards work.
