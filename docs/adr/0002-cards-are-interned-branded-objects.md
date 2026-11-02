# Cards are interned, branded objects

A card is a frozen plain object, and there's exactly one object for each distinct card: `card("A", "S") === card("A", "S")`. Equality is `===`, so `includes`, `indexOf`, `Set` and `Map` work on cards without a helper. A standard card has a `rank`, a `suit` and a `color`. Ranks are `"A"`, `"2"` to `"10"`, `"J"`, `"Q"` and `"K"`, with ten written `"10"` (`"T"` is accepted only when parsing text). Suits are `"S"`, `"H"`, `"D"` and `"C"`. The colour is `"red"` or `"black"`, set from the suit when the card is created. The card type carries a compile-time brand, so an object literal such as `{ rank: "A", suit: "S", color: "black" }` can't pass for a card: it would type-check but never be `===` to the real one.

## Considered options

- **Strings** (`"AS"`). Equality and JSON come for free, but one text style becomes the data, and every operation has to parse a card to read its rank or suit.
- **Classes, as in 0.4.** They don't tree-shake, and methods invite mutation.
- **A fresh object per call.** Each copy would have its own identity, but `card("A", "S") === card("A", "S")` would be `false`, so `hand.includes(card("A", "S"))` would silently fail and every comparison would need a helper.
- **Colour looked up from the suit** (`colorOf(card)`). One field fewer, but a custom deck's colours would need its suit table passed in, and cards without a suit, such as jokers, would have to store a colour anyway.
- **A global card table** shared by every install of deckshoes in an app, like the error brand in [ADR 0005](./0005-errors-carry-stable-codes-and-a-versioned-brand.md). Two installs can be different minor versions, and a minor version can add a field to cards, so one install would hand out card objects shaped for the other. Keying the table by major version, as the error brand does, doesn't help, because those installs share a major.

## Consequences

- Copies are interchangeable, as they are in play in a blackjack shoe, Pinochle or Canasta: the aces of spades from two decks are the same object. A game that needs to tell copies apart, such as two packs with different backs, needs cards with an extra trait from a custom deck ([ADR 0003](./0003-standard-cards-are-a-closed-set.md)).
- An operation that removes or moves a card by identity (`===`) takes the topmost copy. Given a list, it takes one copy per entry, so removing `[aceOfSpades, aceOfSpades]` takes two.
- Every trait is a property: a ranked card has `rank`, a suited card `suit` and a coloured card `color`, so code can read a trait without knowing which deck a card came from. A custom deck sets `color` the same way, from its own suits or directly ([ADR 0003](./0003-standard-cards-are-a-closed-set.md)).
- Cards read from JSON have to go back through `card()` or a parse function to become the real objects. JSON carries the colour too, so a colour that doesn't match the suit is rejected.
- Every entry point of one install (`deckshoes` and `deckshoes/presets`) shares one card table. Two installs of deckshoes have separate tables, and their cards aren't `===`. This is documented rather than worked around.
