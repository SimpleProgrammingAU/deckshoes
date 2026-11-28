import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(import.meta.dirname, "..");

/** A file in the repo, as text. */
function read(file: string): string {
  return readFileSync(path.join(ROOT, file), "utf8");
}

/** The code in the first `ts` block of the README's "Quick start" section. */
function quickStart(readme: string): string {
  const section = readme
    .split(/^## /mu)
    .find((part) => part.startsWith("Quick start\n"));
  const code =
    section === undefined
      ? undefined
      : /^```ts\n(?<code>[\s\S]*?)^```$/mu.exec(section)?.groups?.["code"];
  if (code === undefined) {
    throw new Error('README.md has no ts block under "## Quick start"');
  }
  return code;
}

describe("the playground", () => {
  it("runs the README's quick start", () => {
    expect(read("playground/index.ts")).toContain(
      quickStart(read("README.md")),
    );
  });

  it("installs the latest release", () => {
    const manifest = JSON.parse(read("playground/package.json")) as {
      dependencies?: Record<string, string>;
    };
    expect(manifest.dependencies?.["deckshoes"]).toBe("latest");
  });
});
