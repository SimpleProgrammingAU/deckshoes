/**
 * The Markdown files whose fenced `ts` blocks are examples, relative to the
 * repo root. `scripts/doctest.ts` turns their examples into tests, and
 * `vitest.config.ts` regenerates those tests in watch mode when one of the
 * files changes.
 */
export const MARKDOWN_FILES: readonly string[] = ["README.md"];
