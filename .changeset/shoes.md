---
"deckshoes": minor
---

Add shoes. `shoe(deck, deckCount, { penetration, random })` shuffles copies of a deck together and puts a cut card at the penetration, three quarters of the way in by default. `drawFromShoe` and `dealFromShoe` take cards out as `draw` and `deal` do, and move the cut card up by the cards taken. A shoe is a frozen `{ cards, cutCard }`: once `cutCard` is 0, the cut card has been reached and the shoe is due for a reshuffle. Read a shoe's cards with any stack operation on `shoe.cards`.
