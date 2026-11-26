---
"deckshoes": minor
---

Add burning, discarding and reshuffling to shoes, with a `discardPile` that starts empty:

- `burn(shoe, count)` moves cards from the top to the discard pile without using them, moving the cut card up as well.
- `discard(shoe, cards)` puts cards that are finished with, such as a round's hands, on the discard pile.
- `reshuffle(shoe, { penetration, random })` shuffles the discard pile back in with the cards left in the shoe and puts the cut card back in. A shoe doesn't remember its penetration, so pass the options you built it with.

A shoe without a `discardPile`, such as one written in JavaScript, is read as having an empty one.
