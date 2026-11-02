# Cards are interned, branded objects

A card is a frozen plain object, and there's exactly one object for each distinct card: `card("A", "S") === card("A", "S")`. Equality is `===`, so `includes`, `indexOf`, `Set` and `Map` work on cards without a helper. A standard card has a `rank` and a `suit`. Ranks are `"A"`, `"2"` to `"10"`, `"J"`, `"Q"` and `"K"`, with ten written `"10"` (`"T"` is accepted only when parsing text). Suits are `"S"`, `"H"`, `"D"` and `"C"`. The card type carries a compile-time brand, so an object literal such as `{ rank: "A", suit: "S" }` can't pass for a card: it would type-check but never be `===` to the real one.

## Considered options

- **Strings** (`"AS"`). Equality and JSON come for free, but one text style becomes the data, and every operation has to parse a card to read its rank or suit.
- **Classes, as in 0.4.** They don't tree-shake, and methods invite mutation.
- **A fresh object per call.** Each copy would have its own identity, but `card("A", "S") === card("A", "S")` would be `false`, so `hand.includes(card("A", "S"))` would silently fail and every comparison would need a helper.
- **A global card table** shared by every installed copy of deckshoes, like the error brand in [ADR 0005](./0005-errors-carry-stable-codes-and-a-versioned-brand.md). Copies from different minor versions would share card objects whose shape might differ.

## Consequences

- Copies are interchangeable: the aces of spades from two decks are the same value, just as they are in play in a blackjack shoe, Pinochle or Canasta. A game that needs to tell copies apart, such as two packs with different backs, needs cards with an extra trait from a custom deck ([ADR 0003](./0003-standard-cards-are-a-closed-set.md)).
- An operation that removes or moves a card by value takes the topmost copy. Given a list, it takes one copy per entry, so removing `[aceOfSpades, aceOfSpades]` takes two.
- Cards read from JSON have to go back through `card()` or a parse function to become the real objects.
- Every entry point of one installed copy (`deckshoes` and `deckshoes/presets`) shares one card table. Two installed copies of deckshoes have separate tables, and their cards aren't `===`. This is documented rather than worked around.
