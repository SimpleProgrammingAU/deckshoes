# deckshoes

A TypeScript library for playing cards, partway through a rewrite to 1.0 (Changesets prerelease mode, `alpha` tag). ESM-only, no runtime dependencies, runs in any JS runtime.

## Architecture

A pure functional core over frozen, immutable data (cards, decks), plus a thin `chain()` wrapper that only delegates to those functions. The public API is exported from `src/index.ts`. Helpers that aren't public API live in `src/internal/`. Game helpers (poker, blackjack) will ship later as subpath entry points. Domain names and past decisions: `GLOSSARY.md` and `docs/adr/`.

## Working in src/

Read `CONTRIBUTING.md` (Code rules, Documentation rules, Errors, Tests) before writing or editing anything in `src/`. The points lint can't fully enforce:

- New public exports get `@since NEXT`; the release script stamps the real version.
- `@throws` is only detected for a `throw` in the function's own body, so public functions validate their own inputs and `throw` right there.
- Examples are doctests: `expr; // => value` and `expr; // throws CODE`. Pass a seeded random source to every shuffle.
- A failing doctest's title names the source file and line. Fix the example there; `.doctest/` is regenerated on every run.
- Every change to the published package gets a changeset (`pnpm changeset`).

Work is done when `pnpm check` is green; it runs everything CI runs.

## Issue workflow

Every change starts from a GitHub issue, numbered N here. Take the steps in order. At a **hard stop**, end your turn; the next step starts only when the user replies.

1. **Plan.** Run `gh issue view N --comments`, explore, and write the plan in plan mode, covering every acceptance point in the issue. **Hard stop:** the user grills the plan with `/grill-with-docs`.
2. **Approval.** Fold the grilling's outcomes into the plan, including any `GLOSSARY.md` or ADR changes, and present it with ExitPlanMode. The repo stays untouched until the user approves.
3. **Implement.** Branch `N-short-slug` from `main`. Make focused commits, each passing the pre-commit hook, until `pnpm check` is green.
4. **Draft PR.** `gh pr create --draft`, with the body written using the `pr` skill. The body includes `Closes #N`.
5. **Review.** Run `/code-review xhigh <PR#>` in report-only mode: no `--fix`, no `--comment`.
6. **Report.** Give the user every finding. **Hard stop:** the user picks which to act on.
7. **Agreed fixes.** Commit exactly the agreed changes, push, and wait until CI is green.
8. **Ready.** `gh pr ready <PR#>`.
9. **Merge.** The user rebase-merges. **Hard stop.** Merge it yourself only when the user explicitly tells you to.
10. **Close.** Check `gh issue view N` shows the issue closed. If it's still open, close it with a comment linking the PR.
