# A stack is a frozen array, top first

A stack is a `CardStack`: a `readonly` array of cards whose first element is the top. Every stack operation accepts any array of cards, frozen or not, because it never changes its input, and every stack it returns is frozen, whether on its own or inside a split's named object ([ADR 0001](./0001-functional-core-with-a-chain.md)). So `stack[0]` is the next card drawn, `stack.length` is its size, and a compact string such as `"AS 10H KD"` lists cards top first. Decks, hands and piles are all stacks. Those words name the role a stack plays, so there are no `Deck`, `Hand` or `Pile` types, and every stack operation works on all of them.

## Considered options

- **An opaque deck object.** It could enforce invariants, but it loses `.length`, iteration, array methods and a readable `console.log`.
- **The top at the end of the array**, like a `push` and `pop` stack. It reads backwards in logs and text forms, and every operation copies the array anyway.
- **A separate type per role** (`Deck`, `Hand`, `Pile`). Users would need conversions between them, and the API reference would show three names for one thing.
- **The name `CardCollection`.** "Collection" suggests no order, and order is the point of every operation.

## Consequences

- Stack operations are generic over the card type, so custom cards from [#39](https://github.com/SimpleProgrammingAU/deckshoes/issues/39) work with them unchanged. Most never look inside a card: shuffling, drawing, dealing, cutting, inserting, and finding cards with `===`. Sorting and grouping read only a card's rank or suit, and rank and suit orders are generic over the rank and suit types, so they work on any ranked or suited card. Only text formats and presets are typed to standard cards.
- A shoe ([#28](https://github.com/SimpleProgrammingAU/deckshoes/issues/28)) is its own type rather than a stack, because it also carries a cut card.
