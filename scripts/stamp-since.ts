/**
 * Replaces `@since NEXT` in the library source with the version being released.
 *
 * Runs as part of `pnpm version-packages`, right after `changeset version` has
 * bumped `package.json`, so the "Version Packages" PR shows the real numbers.
 * Prerelease suffixes are dropped: during the 1.0 alpha, `1.0.0-alpha.3`
 * stamps `@since 1.0.0`.
 */
import { globSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const pkg = JSON.parse(
  readFileSync(path.join(ROOT, "package.json"), "utf8"),
) as { version?: unknown };

if (typeof pkg.version !== "string") {
  throw new TypeError("package.json has no version");
}

const release = /^\d+\.\d+\.\d+/u.exec(pkg.version)?.[0];
if (release === undefined) {
  throw new Error(`package.json version "${pkg.version}" is not semver`);
}

let stamped = 0;
for (const file of globSync("src/**/*.ts", { cwd: ROOT })) {
  const fullPath = path.join(ROOT, file);
  const before = readFileSync(fullPath, "utf8");
  const after = before.replaceAll(/@since NEXT\b/gu, () => {
    stamped += 1;
    return `@since ${release}`;
  });
  if (after !== before) writeFileSync(fullPath, after);
}

console.log(
  `stamp-since: replaced ${String(stamped)} "@since NEXT" with ${release}`,
);
