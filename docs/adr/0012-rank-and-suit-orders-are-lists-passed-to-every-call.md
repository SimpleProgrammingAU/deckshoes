# Rank and suit orders are lists passed to every call

A rank order is a frozen list of ranks, lowest first, and a suit order is the same for suits, as the glossary defines them. Every call that compares, sorts or groups by rank takes its rank order as a required positional parameter, with no default: `sort(hand, RankOrder.ACE_HIGH)`, never `sort(hand)`. Cards compare by rank first, and a suit order, passed as an option, only separates cards of the same rank; without one they tie, and a sort keeps them in their order. Grouping takes an order too, and returns one frozen stack for each of its entries, in the order's order, with an empty stack for a rank or suit the stack doesn't hold.

```ts no-test
sort(hand, RankOrder.ACE_HIGH, { suitOrder: SuitOrder.BRIDGE });
groupBySuit(hand, SuitOrder.BRIDGE); // [clubs, diamonds, hearts, spades]
```

## Considered options

- **Comparator functions** (`sort(hand, (a, b) => …)`). They can express anything, including trumps, but every game would write the same index lookups, and a function can't be read back as a list, such as to find the rank above a king for a straight.
- **A number for each rank** (`{ A: 14, K: 13, … }`). Numbers invite ties, which a rank order rules out: ranks a game counts as equal share a value, and values are the game helpers' business.
- **Ace high by default.** It suits poker and bridge, but it's wrong for cribbage, rummy and Pinochle, and a default typed to the standard ranks would compile for a custom deck's cards and then throw.
- **A suit-first mode, or a descending option.** Sorting by suit first is grouping by suit and flattening, and reversing the orders sorts highest first while keeping ties in their order, as reversing the sorted stack wouldn't.
- **Groups in a `Map` or a record, keyed by rank or suit,** as `Map.groupBy` and `Object.groupBy` give them. A `Map` can't be frozen, a record iterates `"2"` to `"10"` before `"A"`, `"J"`, `"Q"` and `"K"`, and neither shows a rank or suit the stack doesn't hold, such as a void in bridge.
- **One `groupBy`,** taking a trait (`groupBy(hand, Trait.SUIT, order)`) or a function that picks each card's key. A rank order and a suit order can't be told apart at runtime for custom cards, so a trait would only repeat the order, and a key function can't take an order at all.
- **The built-in orders as functions** (`aceHigh()`), like presets, or as top-level constants (`ACE_HIGH`). Functions look like presets without being decks, and top-level constants aren't grouped where autocomplete can find them.

## Consequences

- `RankOrder.ACE_HIGH`, `RankOrder.ACE_LOW` and `SuitOrder.BRIDGE` are frozen lists on frozen constants that share their names with the `RankOrder` and `SuitOrder` types, as [ADR 0010](./0010-named-values-are-strings-with-a-constant-of-the-same-name.md)'s named values do, though they hold lists rather than strings.
- The rank order is positional, though it changes how the call works, because [ADR 0009](./0009-settings-go-in-one-options-object.md)'s options are always optional; `count`'s `match` is the precedent. Giving it a default later would be a minor change.
- An order that lists an entry twice, or that lacks a card's rank, or its suit when a suit order is given, throws `INVALID_ARGUMENT`, so the wrong order for a deck, such as Pinochle's on a full deck, can't sort quietly. A stripped order can't be used as a filter.
- `compareCards` returns exactly -1, 0 or 1, and says nothing about how far apart two ranks are.
- Grouping returns a bare frozen array, since every group has the same role ([ADR 0001](./0001-functional-core-with-a-chain.md)). Looking up one suit's group takes the order: `groups[order.indexOf("S")]`.
- Trumps, the led suit and Euchre's bowers aren't orders, so they're left to the game helpers.
