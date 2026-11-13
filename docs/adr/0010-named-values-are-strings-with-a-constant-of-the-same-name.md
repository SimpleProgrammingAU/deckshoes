# Named values are strings with a constant of the same name

When a parameter or setting takes a named value, such as a deal's `runOut`, the value is a lowercase string, and deckshoes exports a frozen constant object and a type, both named after the parameter. Each key is its value in capitals, with underscores for spaces, such as `UNICODE_CHARACTER` for `"unicode character"`. A parameter that also takes a number, such as a hand size, gets a type that includes `number`. Docs and examples always use the constant. A setting that's only ever on or off is a boolean instead, named for what it turns on and `false` by default, such as `{ lowercase: true }`.

```ts no-test
export const RunOut: { readonly STOP: "stop"; readonly THROW: "throw" } =
  /* @__PURE__ */ Object.freeze({ STOP: "stop", THROW: "throw" });
export type RunOut = (typeof RunOut)[keyof typeof RunOut]; // "stop" | "throw"

deal(deck, 4, 5, { runOut: RunOut.STOP });
deal(deck, 4, HandSize.MAXIMIZE, { packetSize: PacketSize.HAND });
```

## Considered options

- **A TypeScript `enum`.** `erasableSyntaxOnly` rules it out, because an enum generates runtime code that type stripping can't remove. A numeric enum also shows numbers in messages, logs and JSON.
- **Plain string unions** (`runOut: "stop"`), as `Rank` and `Suit` are written. No extra exports, but callers have to know the strings. With a constant, they can find the values by typing its name.
- **One shared object for a whole operation** (`Deal.MAXIMIZE`, `Deal.HAND`). One import, but its type would cover every value, so TypeScript couldn't catch `PacketSize.HAND` passed as a hand size. It also can't be called `Deal`, which differs from `deal` only in case.
- **Constants and strings documented side by side.** Two ways to write the same thing, which [ADR 0009](./0009-settings-go-in-one-options-object.md) avoids for settings.
- **Underscores or hyphens in values** (`"unicode_character"`, `"unicode-character"`). With underscores the key is exactly the value in capitals, but a message built from the value would show the underscore or hyphen.
- **Named values for on/off settings** (`{ letterCase: LetterCase.LOWER }`). Room for a third value, which most settings never need, at the cost of an import and a constant for every switch.

## Consequences

- Each parameter has its own object, so the type of each covers only what that parameter takes, and a value in the wrong place is a type error.
- The values are strings, so error messages, logs and JSON show `"stop"`. The plain string still type-checks, and nothing stops a caller writing it. The docs just never do.
- A value of several words has spaces, so it has to be encoded in a URL and can't be a CSS class name. Anyone who puts the value in one handles the space, whether they wrote the constant or the string.
- A constant is frozen like everything else deckshoes exports, so `isolatedDeclarations` needs its type written out rather than inferred.
- A bundler can't tell that a top-level `Object.freeze` call does nothing else, so it keeps every constant in every bundle, imported or not, unless the call is marked `/* @__PURE__ */`. Without the mark, deal's constants pushed the "shuffle only" bundle over its size budget.
- The constant and the type share a name. The API reference files constants and types in separate directories, so their pages don't clash.
- Adding a value to a constant is a minor change. Removing or renaming one is a major change.
- Turning a boolean setting into a named value is a major change.
- `Rank`, `Suit` and `Color` stay plain unions with no constants. `"A"`, `"S"` and `"red"` are the domain's own notation, as in `"AS"` and `"10H"`, rather than settings.
- `RankOrder` and `SuitOrder` follow the same pattern for built-in lists rather than strings: a frozen constant, such as `RankOrder.ACE_HIGH`, sharing its name with the type ([ADR 0012](./0012-rank-and-suit-orders-are-lists-passed-to-every-call.md)).
