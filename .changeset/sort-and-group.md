---
"deckshoes": minor
---

Rank and suit orders, for comparing, sorting and grouping cards:

- `RankOrder.ACE_HIGH` and `RankOrder.ACE_LOW` are the built-in rank orders, and `SuitOrder.BRIDGE` (clubs, diamonds, hearts, spades) the built-in suit order. Each is a frozen array, lowest first, and any other order is an array you write, such as Pinochle's `["9", "J", "Q", "K", "10", "A"]`. The `RankOrder` and `SuitOrder` types are generic over the rank and suit, so they also order cards that aren't standard cards.
- `compareCards(a, b, rankOrder, options?)` returns -1, 0 or 1. Cards of the same rank tie unless you pass a `suitOrder` option. An order that lists an entry twice, or that lacks a card's rank or suit, throws `InvalidArgumentError`.
- `sort(stack, rankOrder, options?)` returns a new frozen stack with the lowest card on top. It's stable, so cards that tie keep their order, and the `suitOrder` option separates cards of the same rank. To sort highest first, reverse the orders.
- `groupByRank(stack, rankOrder)` and `groupBySuit(stack, suitOrder)` return a frozen array with one frozen stack for each entry of the order, lowest first, holding that rank's or suit's cards in the order they had. A rank or suit the stack doesn't hold gets an empty group, so the groups line up with the order. To lay a hand out by suit, then rank, use `groupBySuit(sort(hand, RankOrder.ACE_HIGH), SuitOrder.BRIDGE).flat()`.
