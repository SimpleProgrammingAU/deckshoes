# Named values are strings with a constant of the same name

When a parameter or setting takes a named value, such as a deal's `runOut`, the value is a lowercase string, and deckshoes exports a frozen constant object and a type, both named after the parameter. Each key is its value in capitals. A parameter that also takes a number, such as a hand size, gets a type that includes `number`. Docs and examples always use the constant.

```ts no-test
export const RunOut: { readonly STOP: "stop"; readonly THROW: "throw" } =
  Object.freeze({ STOP: "stop", THROW: "throw" });
export type RunOut = (typeof RunOut)[keyof typeof RunOut]; // "stop" | "throw"

deal(deck, 4, 5, { runOut: RunOut.STOP });
deal(deck, 4, HandSize.MAXIMIZE, { packetSize: PacketSize.HAND });
```

## Considered options

- **A TypeScript `enum`.** `erasableSyntaxOnly` rules it out, because an enum generates runtime code that type stripping can't remove. A numeric enum also shows numbers in messages, logs and JSON.
- **Plain string unions** (`runOut: "stop"`), as `Rank` and `Suit` are written. No extra exports, but callers have to know the strings. With a constant, they can find the values by typing its name.
- **One shared object for a whole operation** (`Deal.MAXIMIZE`, `Deal.HAND`). One import, but its type would cover every value, so TypeScript couldn't catch `PacketSize.HAND` passed as a hand size. It also can't be called `Deal`, which differs from `deal` only in case.
- **Constants and strings documented side by side.** Two ways to write the same thing, which [ADR 0009](./0009-settings-go-in-one-options-object.md) avoids for settings.

## Consequences

- Each parameter has its own object, so the type of each covers only what that parameter takes, and a value in the wrong place is a type error.
- The values are strings, so error messages, logs and JSON show `"stop"`. The plain string still type-checks, and nothing stops a caller writing it. The docs just never do.
- A constant is frozen like everything else deckshoes exports, so `isolatedDeclarations` needs its type written out rather than inferred.
- The constant and the type share a name. The API reference files constants and types in separate directories, so their pages don't clash.
- Adding a value to a constant is a minor change. Removing or renaming one is a major change.
- `Rank`, `Suit` and `Color` stay plain unions with no constants. `"A"`, `"S"` and `"red"` are the domain's own notation, as in `"AS"` and `"10H"`, rather than settings.
