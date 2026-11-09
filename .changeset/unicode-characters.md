---
"deckshoes": minor
---

`parseCard` and `tryParseCard` read a card's Unicode character from Unicode's Playing Cards block, such as `"🂡"` for the ace of spades, and `formatCard` writes it with `{ notation: Notation.UNICODE_CHARACTER }`. The block's other characters, such as the knights, the jokers and the card back, aren't standard cards, so `parseCard` throws `InvalidCardError` for them.
