# Errors carry stable codes and a versioned brand

Every error deckshoes throws is a subclass of `DeckshoesError` with a machine-readable `code`, one class per code. Users branch on the code, not the message: messages can be reworded in any release, but codes only change in a major. `isDeckshoesError(error, code?)` recognises deckshoes errors by a brand on the prototype, keyed with `Symbol.for("deckshoes.error.v1")`, so it still works when an app ends up with two installs of the package, where `instanceof` fails. The key names the major version, so errors from another major, whose codes and fields may differ, aren't narrowed to this one's types. Errors are thrown only where user input enters the library; internal invariants use an internal `assert()`.

## Considered options

- **`instanceof` only.** Breaks as soon as a bundler or package manager loads two installs of deckshoes.
- **Checking `error.name`.** Any error can claim the name, and it says nothing about which major the error's fields belong to.
- **An unversioned brand.** Would narrow an error from 2.x to 1.x's types, even if its codes or fields had changed.

## Consequences

- Each major release bumps the brand's suffix (`v1` → `v2`).
- `INSUFFICIENT_CARDS` means a stack ran short of the cards an operation was asked to take, as when `draw(deck, 60)` asks a 52-card deck for 60. A position that has to fall within the stack but doesn't, as in `cut(deck, 60)`, and a card to remove that isn't in the stack, are `INVALID_ARGUMENT`. So `draw` and `cut` throw different codes for the same number. Using `INSUFFICIENT_CARDS` for all three would have grouped them by symptom, but its `requested` and `available` fields are stack totals, which say nothing useful about a position or a missing card, and a catch that reshuffles when the deck runs out would also catch a caller's mistake.
