# Errors carry stable codes and a versioned brand

Every error deckshoes throws is a subclass of `DeckshoesError` with a machine-readable `code`, one class per code. Users branch on the code, not the message: messages can be reworded in any release, but codes only change in a major. `isDeckshoesError(error, code?)` recognises deckshoes errors by a brand on the prototype, keyed with `Symbol.for("deckshoes.error.v1")`, so it still works when an app ends up with two installs of the package, where `instanceof` fails. The key names the major version, so errors from another major, whose codes and fields may differ, aren't narrowed to this one's types. Errors are thrown only where user input enters the library; internal invariants use an internal `assert()`.

## Considered options

- **`instanceof` only.** Breaks as soon as a bundler or package manager loads two installs of deckshoes.
- **Checking `error.name`.** Any error can claim the name, and it says nothing about which major the error's fields belong to.
- **An unversioned brand.** Would narrow an error from 2.x to 1.x's types, even if its codes or fields had changed.

## Consequences

- Each major release bumps the brand's suffix (`v1` → `v2`).
