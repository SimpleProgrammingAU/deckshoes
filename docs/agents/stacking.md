# Stacked issues

A stacked issue starts on the branch of a PR that's still in review, so work goes on while the user reviews and merges the parent.

## Starting one

When the user says at step 13 to start the next issue, from the repo root:

1. `git worktree add ../worktrees/deckshoes/<N> -b <N>-<slug> <this branch>`, then `pnpm install` in the worktree: a worktree starts with no `node_modules`, and the install sets up the husky hooks. This session's checkout stays as it is.
2. From the worktree: `claude --bg --name deckshoes-<N> "Commence #<N>. It is stacked on <this branch>, PR #<n>, which is in review."`
3. Give the user the session's name: `claude attach deckshoes-<N>` opens it, and `claude agents` lists them all.

If the parent has merged by then, branch from `origin/main` with `--no-track`, so the new branch doesn't take `main` as its upstream, and leave the stacking out of the message: the issue starts in a worktree, but nothing is stacked.

## Working on one

- **Reviews** cover only the issue's own commits: step 6's fixed point is the parent branch, and step 9 runs `/code-review xhigh <parent-branch>..<branch>`.
- **The draft PR** targets `main`, and its body opens with "Builds on #<parent PR>", so the user merges the parent first.
- **Keeping up with the parent.** `main`'s history is linear, so rebase rather than merge, after a `git fetch`:
  - when the parent gains commits: `git rebase <parent-branch>`;
  - once the parent merges: `git rebase --onto origin/main <parent-branch>`. Rebase-merging gave the parent's commits new hashes in `main`, so a plain rebase onto `main` would replay them.

  Then `git push --force-with-lease`. This is the one force-push the workflow makes: it moves the branch's base and leaves its own changes as they were.

- **Once its own PR merges**, remove the worktree from the repo root: `git worktree remove ../worktrees/deckshoes/<N>`.
