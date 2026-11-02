# deckshoes

## 1.0.0-alpha.0

### Major Changes

- [#1](https://github.com/SimpleProgrammingAU/deckshoes/pull/1) [`766b774`](https://github.com/SimpleProgrammingAU/deckshoes/commit/766b77428801455d0474cf06b387f757f01361da) Thanks [@SimpleProgrammingAU](https://github.com/SimpleProgrammingAU)! - Start the deckshoes 1.0 rewrite. This is a breaking change from 0.4: the package is now ESM-only TypeScript, requires Node 22.12 or later (or any modern browser), and replaces the 0.x classes with a new API that arrives over the 1.0 alpha releases.
  
  This first piece adds the error types every later feature uses: `DeckshoesError` and its subclasses `InvalidArgumentError`, `InvalidCardError` and `InsufficientCardsError`, each with a stable `code`, plus the `isDeckshoesError()` type guard.
