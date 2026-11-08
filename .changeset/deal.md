---
"deckshoes": minor
---

Add `deal(deck, handCount, handSize, options)`, which deals cards from the top of a deck into hands and returns a frozen `{ hands, remainder }`. Cards go round-robin by default, or in packets with `packetSize`, such as `{ packetSize: 3 }` for 3 then 2, or `PacketSize.HAND` for each hand's cards at once. `HandSize.MAXIMIZE` deals out the whole deck as evenly as possible, and `runOut: RunOut.STOP` gives short hands instead of throwing when the deck runs out. The first card dealt to a hand is its top card.
