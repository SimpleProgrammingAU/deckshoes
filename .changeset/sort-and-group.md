---
"deckshoes": minor
---

Rank and suit orders, for comparing cards:

- `RankOrder.ACE_HIGH` and `RankOrder.ACE_LOW` are the built-in rank orders, and `SuitOrder.BRIDGE` (clubs, diamonds, hearts, spades) the built-in suit order. Each is a frozen array, lowest first, and any other order is an array you write, such as Pinochle's `["9", "J", "Q", "K", "10", "A"]`. The `RankOrder` and `SuitOrder` types are generic over the rank and suit, so they also order cards that aren't standard cards.
- `compareCards(a, b, rankOrder, options?)` returns -1, 0 or 1. Cards of the same rank tie unless you pass a `suitOrder` option. An order that lists an entry twice, or that lacks a card's rank or suit, throws `InvalidArgumentError`.
