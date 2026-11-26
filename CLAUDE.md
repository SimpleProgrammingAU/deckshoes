# deckshoes

A TypeScript library for playing cards. ESM-only, no runtime dependencies, runs in any JS runtime.

## Architecture

A pure functional core over frozen, immutable data (cards, stacks), plus `chain()`, which only delegates to those functions. The public API is exported from `src/index.ts`; presets ship from the `deckshoes/presets` subpath, and game helpers (poker, blackjack) will follow as their own subpaths. Library helpers that aren't public API live in `src/internal/`. Name things with `GLOSSARY.md`'s terms, in code, docs and issues; read the ADRs in `docs/adr/` that touch what you're changing. Prose is Australian English, identifiers US English.

## Working in src/

Read `CONTRIBUTING.md` (Code rules, Documentation rules, Errors, Tests) before writing or editing anything in `src/`. The points lint can't fully enforce:

- New public exports get `@since NEXT`; the release script stamps the real version.
- `@throws` is only detected for a `throw` in the function's own body, so public functions validate their own inputs and `throw` right there.
- Lint finds a stack only by its name, so annotate a stack parameter `CardStack` and read or copy it under that name. It can't see a stack reached through an alias, a cast, a generic bound (`<S extends CardStack<C>>`) or a collection (`hands[i]`), so read those by index or copy them with `copyStack` yourself (ADR 0004).
- Examples are doctests: `expr; // => value` and `expr; // throws CODE`. Pass a seeded random source to every shuffle.
- A failing doctest's title names the source file and line. Fix the example there; `.doctest/` is regenerated on every run.
- A test helper stays in its test file until a second test file needs it; that change moves it to `test/helpers.ts`, with a test if it has branches or state.
- Every change to the published package gets a changeset (`pnpm changeset`).

Work is done when `pnpm check` is green; it runs everything CI runs.

## Issue workflow

Every change starts from a GitHub issue, numbered N here; "Commence #N" starts it at step 1. Take the steps in order. At a **hard stop**, end your turn; the next step starts only when the user replies.

1. **Plan.** Run `gh issue view N --comments`, explore, and write the plan in plan mode, covering every acceptance point in the issue. The plan names any bundle (below) and any check beyond `pnpm check` that must pass before the PR is ready, and ends with its open questions, each with a recommended answer.
2. **Grilling.** **Hard stop:** ask the user to type `/grill-with-docs`, and end the turn there. The skill is user-only.
3. **Approval.** Fold the grilling's outcomes into the plan, including any `GLOSSARY.md` or ADR changes, and present it with ExitPlanMode, entering plan mode again first if the session has left it: auto mode never approves a plan. The repo stays untouched until the user approves.
4. **Implement.** Switch to auto mode. Comment the grilling's decisions on each issue, since plan mode blocked the write until now. Swap a `needs-triage` label for `ready-for-agent`, and assign the issue with `gh issue edit N --add-assignee @me`. Branch `N-short-slug` from `main`, and make focused commits, each passing the pre-commit hook, until `pnpm check` is green.
5. **Draft PR.** Push, then `gh pr create --draft`, with the body written using the `pr` skill. The body includes `Closes #N`.
6. **Standards and spec review.** Run `/mattpocock-skills:code-review` with `main` as its fixed point.
7. **Report.** Give the user every finding, labelled F1, F2…, with what you recommend for each. A finding outside the issue's scope becomes a new issue (`needs-triage`, naming the PR whose review raised it); name it here. **Hard stop:** the user picks which to act on.
8. **Agreed fixes.** Commit exactly the agreed changes, run `pnpm check`, and push. Where a fix reverses a grilled decision, say so on the issue.
9. **Correctness review.** Run `/code-review xhigh <branch>` in report-only mode: no `--fix`, no `--comment`.
10. **Report.** As at step 7. **Hard stop.**
11. **Agreed fixes.** As at step 8, then wait until CI is green.
12. **Ready.** Once CI is green and every check the plan names has passed, `gh pr ready <PR#>`. Then suggest the next issue: a bundle already agreed, or else the `ready-for-agent` issue that best follows this one (nearby code, an issue this one unblocks).
13. **Merge.** **Hard stop:** ask the user to rebase-merge, naming what the merge sets off (with a changeset, the release workflow's version PR), and whether to start the next issue. If they say to start it, follow `docs/agents/stacking.md`. Merge it yourself only when the user explicitly tells you to.
14. **Close.** Check `gh issue view N` shows the issue closed. If it's still open, close it with a comment linking the PR.

Some issues change the steps:

- **A bug** (labelled `bug`) has hard stops only at steps 2 and 13. At steps 7 and 10, give the findings and what you recommend, then go straight on to make and test the recommended fixes. A bundle counts as a bug only when every issue in it is one.
- **A change with no code** (docs or tests alone): the plan asks whether the reviews at steps 6 and 9 are worth running. Skipping one is the user's call each time, and the hard stops stay.
- **A change to the workflow** (this file, `CONTRIBUTING.md`, `docs/agents/`) is made in the issue whose work prompted it, in commits of its own, and raises no new issue. Name it at the next hard stop, beside the findings. One with no issue behind it, and no code, skips the issue: once the user confirms the change, raise it as a ready PR for the user to merge.
- **An issue that ends in an answer rather than a PR** (`wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`) skips the steps: claim and resolve it as `docs/agents/issue-tracker.md` says under Wayfinding.
- **A stacked issue**, started on the branch of a PR still in review: read `docs/agents/stacking.md` before step 1.

**Bundles.** At step 1, look for issues that touch the same concepts or code, or ship together, and propose bundling them; the grilling and approval settle it. A bundle shares one branch and PR, named for its first issue, with a `Closes #N` line for each issue. Each commit's body ends `Part of #N`, naming its own issue.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for SimpleProgrammingAU/deckshoes, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
