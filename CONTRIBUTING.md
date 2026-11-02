# Contributing to deckshoes

Thanks for helping. This guide covers setting up the project, how a change goes from issue to release, and the rules the tooling enforces. If anything here is unclear or out of date, that's a bug: please open an issue.

## Setup

You need:

- **Node.js 26** (the version in `.node-version`). The dev tooling needs at least 22.18.
- **pnpm 12.** Node no longer bundles Corepack, so [install pnpm directly](https://pnpm.io/installation). The exact version is pinned in `package.json`.

```sh
git clone https://github.com/SimpleProgrammingAU/deckshoes.git
cd deckshoes
pnpm install   # also installs the git hooks
pnpm check     # everything CI runs; should pass on a fresh clone
```

## Scripts

| Script                              | What it does                                                                                                           |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                        | Everything below, in the same order as CI. Run it before asking for review.                                            |
| `pnpm lint` / `pnpm lint:fix`       | ESLint, including the code inside `@example` blocks.                                                                   |
| `pnpm format` / `pnpm format:check` | Prettier.                                                                                                              |
| `pnpm typecheck`                    | TypeScript, including the generated doctests.                                                                          |
| `pnpm test` / `pnpm test:watch`     | Unit tests, type tests and doctests. Watch mode regenerates doctests as you edit examples.                             |
| `pnpm coverage`                     | Tests with a coverage report in `coverage/`.                                                                           |
| `pnpm docs:build`                   | Builds the API reference in `docs-site/`. Fails on undocumented exports or broken links.                               |
| `pnpm build`                        | Builds `dist/`.                                                                                                        |
| `pnpm check:package`                | Checks the published package shape (publint, Are the Types Wrong).                                                     |
| `pnpm size`                         | Checks bundle size budgets.                                                                                            |
| `pnpm smoke`                        | Installs the packed tarball in a scratch project and loads it with `import` and `require()`. Needs `pnpm build` first. |
| `pnpm knip`                         | Finds unused files, exports and dependencies.                                                                          |
| `pnpm changeset`                    | Adds a changeset describing your change for the changelog.                                                             |

The pre-commit hook formats and lints staged files, then runs `typecheck` and `test`.

## From issue to merged PR

Every change starts from a GitHub issue, so there's a record of why it was made.

1. **Issue.** Find or open an issue. For anything non-trivial, agree on the approach in the issue before writing code; the [glossary](./GLOSSARY.md) and [decision records](./docs/adr/) explain the existing design.
2. **Branch.** Name it `<issue number>-<short-slug>`, for example `12-parse-cards`.
3. **Commits.** Make as many focused commits as make sense. Each one should pass the pre-commit hook.
4. **Draft PR.** Open the PR as a draft with `Closes #<issue>` in the description, and fill in the checklist.
5. **Review.** Address review comments with new commits; don't force-push over history that's been reviewed.
6. **Ready.** Mark the PR ready when CI is green and review is done.
7. **Merge.** A maintainer rebase-merges it, which keeps your individual commits. The issue closes automatically.

The maintainer works the same way with an AI agent: the agent plans, the plan is stress-tested and approved before any code is written, and the agent's draft PR gets an automated code review before a human reads it. `CLAUDE.md` spells out those steps for the agent.

## Changesets

Any change to the published package needs a changeset: run `pnpm changeset`, pick the bump type, and write a sentence or two for users. It becomes the changelog entry. Changes that don't affect users (tests, CI, docs outside `src/`) don't need one.

- **Before 1.0.0:** the project is in prerelease mode, and every release is `1.0.0-alpha.N`. Pick `minor` for new features and `patch` for fixes; the alpha releases still go out in order.
- **From 1.0.0:** semantic versioning. `patch` for fixes, `minor` for new features and deprecations, `major` for removals and other breaking changes.

## Code rules

Most of these are enforced by ESLint or TypeScript; the rest are checked in review.

- **Pure functions over immutable data.** Operations return new values and never modify their inputs. The chainable wrapper only delegates to the functions.
- **No runtime dependencies,** and no Node.js built-ins in `src/`; the library has to run in browsers and every JS runtime.
- **Named exports only.** Everything public is exported from `src/index.ts`.
- **Imports use `.ts` extensions** (`import { x } from "./x.ts"`).
- **Helpers that aren't public API go in `src/internal/`.** They need a one-line doc comment, nothing more.

## Documentation rules

Every public export needs a complete doc comment. ESLint enforces each of these:

| Tag           | Rule                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| (description) | Says what it is or does, not just its name restated.                                                 |
| `@param`      | Every parameter, as `@param name - Description.` No `{type}`; TypeScript provides types.             |
| `@returns`    | Required unless the function returns `void`, `Promise<void>`, `never` or `undefined`.                |
| `@throws`     | One per error the function throws, as `@throws {@link InvalidArgumentError} When …`.                 |
| `@example`    | At least one per export: a fenced `ts` block that compiles, passes lint, and runs as a test.         |
| `@since`      | `@since NEXT` on anything new; the release script replaces it with the version number.               |
| `@deprecated` | When something is superseded: name the replacement with `{@link …}` and say when it will be removed. |

Two things ESLint can't fully check:

- `@throws` is only detected for `throw` written directly in the function body. Validate inputs in the public function itself, so the `throw` is visible there, and document any error that a function you call can throw.
- Deprecating something is a `minor` changeset; removing it is a `major` one.

### Writing examples

Examples are tests. Each fenced `ts` block in an `@example` tag, and in `README.md`, is turned into a test file and run. Show results with a comment at the end of the line:

```ts no-test
import { InsufficientCardsError, isDeckshoesError } from "deckshoes";

const error = new InsufficientCardsError(5, 2);
error.available; // => 2
isDeckshoesError(error, "INVALID_CARD"); // => false
someFunction(-1); // throws INVALID_ARGUMENT
```

- `expr; // => value` asserts that `expr` deeply equals `value`. `const x = …; // => value` and `console.log(x); // => value` work too. The comment goes on the last line of the statement, so statements that Prettier wraps over several lines work.
- `expr; // throws CODE` asserts the error's `code`. Use an error class name instead (`// throws InvalidArgumentError`) to check its `name`. If `expr` contains `await`, it asserts the promise rejects.
- Import from `"deckshoes"`, the way users will.
- Pass a seeded random source to every shuffle, so the results shown are the results you get.
- Add `no-test` to the fence (` ```ts no-test `) for illustrations that shouldn't run, such as the block above.

## Errors

- Throw only the classes in `src/errors.ts`; every error has a stable `code`.
- Throw where user input enters the library, and nowhere else. Internal invariants use an internal `assert()`, which isn't part of the API.
- Parsing functions get a non-throwing twin: `parseCard` throws, `tryParseCard` returns `undefined`.
- When a test checks that something throws, it asserts the error's `code`. Messages can be reworded freely; only tests of how a message is built (such as "1 card" vs "2 cards") look at message text.

## Tests

- Unit tests live next to the code: `src/thing.ts` and `src/thing.test.ts`.
- Type-level tests go in `src/thing.test-d.ts`, using `expectTypeOf`.
- Use [fast-check](https://fast-check.dev/) property tests for deck operations. For example: a shuffle keeps every card exactly once, and dealing loses no cards.
- Shuffles and anything else that takes a deckshoes random source get a seeded one, so results repeat. fast-check property tests stay unseeded: each run explores new cases, and a failure prints the seed that reproduces it.
- Coverage must stay at or above the thresholds in `vitest.config.ts`.

## Using AI agents

AI-assisted contributions are welcome and held to the same standard. `CLAUDE.md` gives agents the project's rules and workflow, and `docs/agents/` configures the shared agent skills. You're responsible for everything in your PR, whoever or whatever wrote it.

## Releasing (maintainers)

Releases are automated with [Changesets](https://github.com/changesets/changesets):

1. When PRs with changesets merge to `main`, the release workflow checks everything in a read-only job, then opens or updates a **"chore: version packages"** PR. It bumps the version, writes `CHANGELOG.md`, and replaces `@since NEXT` with the new version number.
2. Merging that PR publishes to npm with [trusted publishing](https://docs.npmjs.com/trusted-publishers) (no npm token is stored anywhere) and provenance, creates a git tag and a GitHub release, and redeploys the API docs.

While the project is in prerelease mode, releases go to the `alpha` dist-tag. To ship 1.0.0, run `pnpm changeset pre exit` in a PR, merge it, then merge the version PR that follows.

The release workflow opens the version PR with a token from a GitHub App, because PRs opened with the default `GITHUB_TOKEN` don't trigger CI. The App needs **Contents** and **Pull requests** read and write access on this repository. Its client ID goes in the `RELEASE_APP_CLIENT_ID` Actions variable and its private key in the `RELEASE_APP_PRIVATE_KEY` secret. Without them the workflow falls back to `GITHUB_TOKEN`, and CI won't run on the version PR.
