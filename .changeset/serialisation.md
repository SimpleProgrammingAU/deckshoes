---
"deckshoes": minor
---

Add saving and loading. `JSON.stringify` already writes cards, stacks and shoes as JSON; `cardFromJSON`, `stackFromJSON` and `shoeFromJSON` load them back as the real card objects, which are `===` to the ones `card()` returns. They take the parsed value, so they also load cards cloned by `structuredClone` or `postMessage`. A card whose `color` doesn't match its suit throws `InvalidCardError`.

Add compact strings for logs and URLs. `formatStack(stack, { notation })` writes a stack's cards top first, separated by single spaces, such as `"AS 10H KD"`, in short or symbol notation or as Unicode characters. `parseStack` reads one back, reading each card as `parseCard` does, and `tryParseStack` returns `undefined` rather than throwing.
