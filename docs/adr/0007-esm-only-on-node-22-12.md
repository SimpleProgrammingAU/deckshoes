# ESM only, on Node.js 22.12 and later

deckshoes ships a single ES module build with types, and no CommonJS build. Node.js 22.12 and later can `require()` an ES module, so CommonJS users are still covered, and `engines` says `>=22.12`. The library has no runtime dependencies and uses no Node.js built-ins (lint bans them in `src/`), so the same build runs in Node.js, Deno, Bun and browsers.

## Considered options

- **A dual ESM and CommonJS build.** Doubles what has to be built and tested, and brings the dual-package hazard: an app can load both builds, leaving two copies of the module state and failing `instanceof` checks.
- **Supporting Node.js 20.** It reached end of life in April 2026, so supporting it would mean testing on a runtime that no longer gets security fixes.

## Consequences

- CommonJS users on Node.js older than 22.12 can't use 1.x. They can stay on 0.4.
- `pnpm check:package` checks the package with the `esm-only` profile, and the smoke test loads it with both `import` and `require()`.
