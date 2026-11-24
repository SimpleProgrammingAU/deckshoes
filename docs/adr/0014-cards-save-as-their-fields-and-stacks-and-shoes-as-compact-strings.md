# Cards save as their fields, and stacks and shoes as compact strings

A card is saved as the JSON that `JSON.stringify` already writes for it: its `rank`, `suit` and `color`. So a stack saves as an array of those, and a shoe as its `cards`, `cutCard` and `discardPile`, and nothing in the library writes JSON. `cardFromJSON`, `stackFromJSON` and `shoeFromJSON` take the parsed value, not the text, and give back the interned cards ([ADR 0002](./0002-cards-are-interned-branded-objects.md)). A card needs its rank and suit exactly as `card()` takes them, so ten is `"10"`, never `"T"`, and the colour its suit gives it. Any other field is ignored. A shoe is checked as every shoe function checks one ([ADR 0013](./0013-a-shoe-is-a-stack-and-a-cut-card.md)).

For logs and URLs, a stack also has a compact string: its cards top first, separated by single spaces, as in `AS 10H KD` ([ADR 0004](./0004-a-stack-is-a-frozen-array-top-first.md)). Each card is written in short or symbol notation or as its Unicode character, and parsing reads each one as `parseCard` does, so notations and case can mix. A card's name can't be used, because it has spaces. A shoe's compact string is its cards, its cut card's position and its discard pile, separated by `" | "`, as in `AS 10H KD | 2 | 2C`. The position is a whole number with no sign or leading zeros, and an empty pile is left out with the bar before it, as in `AS 10H KD | 2`.

Text that isn't a string, a stack that isn't an array, and a shoe or a shoe's text of the wrong shape are `INVALID_ARGUMENT`. Anything wrong with one card is `INVALID_CARD`, including the empty piece a stray space leaves, and the message names its position. So `parseStack(42)` is `INVALID_ARGUMENT` while `parseCard(42)` is `INVALID_CARD`, on purpose: `parseCard`'s text is the card itself, but a stack's or shoe's text is the whole input, as a stack's array is. Only the functions that read text, `parseStack` and `parseShoe`, have non-throwing twins: text from a person or a URL is often wrong, but saved data that won't load is exceptional.

## Considered options

- **Loaders that take JSON text.** One call shorter in the simplest case, but a saved game usually nests its stacks and shoe in one object, and `structuredClone`, `postMessage` and IndexedDB give values, not text. Taking both would mean telling them apart by `typeof`.
- **A reviver for `JSON.parse`.** One function for any nesting, but it sees every object in the JSON, so it can't tell a malformed card from an object that was never meant to be one, and it builds unfrozen arrays and unchecked shoes.
- **A `toJSON` that writes a card as `"AS"`.** Smaller JSON, but cards are frozen plain objects with no methods, and ADR 0002 keeps the colour in the JSON so that a mismatch is caught. The compact string is the small form.
- **Looser card JSON**, such as `{ rank, suit }` without a colour, or `"T"` for ten. Easy to accept in a minor release, but impossible to stop accepting before a major ([ADR 0011](./0011-parsing-accepts-only-documented-forms.md)), so the loaders start strict.
- **Rejecting fields a card doesn't have.** A minor release can add a field to cards (ADR 0002), and JSON saved by that release would stop loading in earlier ones. It would also mean listing an object's own keys, which a Proxy can lie about.
- **Names in compact strings**, joined by commas: `Ace of Spades, Ten of Hearts`. A second separator and a second form to keep for the whole major, and names aren't compact. A list of names for people is one line of `formatCard`.
- **Commas between cards**: `AS, 10H, KD`. Spaces read better, and match ADR 0004's example.
- **The bar standing for the cut card itself**, as in `AS 10H | KD`. Closer to the real thing, but you'd have to count cards to read a 312-card shoe, the pile would need a second separator, and a reached cut card leaves a leading bar.
- **A bare `|` between a shoe's parts**, as in `AS 10H KD|2|2C`. The text would never start or end with a space, but it's cramped beside space-separated cards.
- **Always writing all three parts of a shoe.** A new shoe would end in a space, `AS 10H KD | 2 | `, which a log hides and trimming removes.
- **No compact string for shoes.** A URL could carry `formatStack(shoe.cards)`, the cut card and the pile as three parameters, but one string is simpler to log and pass around.

## Consequences

- Every form above is fixed for 1.x. Accepting more is a minor change; accepting less waits for a major.
- A shoe with no cards left is written starting with a space, ` | 0 | 2C`, so trimming the text breaks it. It's the only text either format writes with a space at one end.
- A random source isn't saved with a shoe ([ADR 0006](./0006-randomness-is-an-injected-source.md)), so a loaded shoe reshuffles with whatever source the caller passes. A fresh source with the original seed repeats that seed's first reshuffles, so a game that has to be repeatable after loading saves the seed it will use next.
- A saved shoe, in either form, gives away every card to come, and anyone who can change it can stack it, since a shoe can hold any cards (ADR 0013). Keeping it on a server, or encrypting it, is up to the app: a key in the client hides nothing, and Web Crypto is async where deckshoes is sync.
- The loaders and compact strings are typed to standard cards, as notations are ([ADR 0004](./0004-a-stack-is-a-frozen-array-top-first.md)). Custom decks ([#39](https://github.com/SimpleProgrammingAU/deckshoes/issues/39)) decide how theirs are saved.
- A chain method that writes a compact string is left to [#77](https://github.com/SimpleProgrammingAU/deckshoes/issues/77).
- A compact string can't be longer than the runtime's longest string: about 2²⁹ characters in Node.js, which is about 175 million cards. The limit differs between runtimes and nothing reports it, so formatting finds it by the runtime's `RangeError` and throws `INVALID_ARGUMENT` in its place. JSON is longer still, so it's no way around the limit.
