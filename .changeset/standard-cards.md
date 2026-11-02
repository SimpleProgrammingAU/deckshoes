---
"deckshoes": minor
---

Add the 52 standard cards. `card(rank, suit)` returns the card with that rank and suit: a frozen object with a `rank`, a `suit` and a `color`, set from the suit. There's exactly one object for each card, so cards compare with `===`. `isCard()` checks whether a value is one of those cards, and the `Card`, `Rank`, `Suit` and `Color` types describe them. A rank or suit that isn't standard throws `InvalidCardError`.
