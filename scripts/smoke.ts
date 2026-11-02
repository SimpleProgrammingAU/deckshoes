/**
 * Installs the packed tarball into a throwaway project and loads it with both
 * `import` and `require()`, the way users will. Run `pnpm build` first.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const shell = process.platform === "win32";

const CHECK = `
if (!isDeckshoesError(new InvalidCardError("x"), "INVALID_CARD")) {
  throw new Error("deckshoes loaded but isDeckshoesError() misbehaved");
}
`;

const dir = mkdtempSync(path.join(tmpdir(), "deckshoes-smoke-"));
try {
  execFileSync("pnpm", ["pack", "--pack-destination", dir], {
    cwd: ROOT,
    shell,
    stdio: "ignore",
  });
  const tarball = readdirSync(dir).find((file) => file.endsWith(".tgz"));
  if (tarball === undefined) throw new Error("pnpm pack produced no tarball");

  writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "deckshoes-smoke", private: true }),
  );
  execFileSync(
    "npm",
    ["install", "--no-audit", "--no-fund", "--no-package-lock", `./${tarball}`],
    { cwd: dir, shell, stdio: "ignore" },
  );

  writeFileSync(
    path.join(dir, "esm.mjs"),
    `import { InvalidCardError, isDeckshoesError } from "deckshoes";\n${CHECK}`,
  );
  writeFileSync(
    path.join(dir, "cjs.cjs"),
    `const { InvalidCardError, isDeckshoesError } = require("deckshoes");\n${CHECK}`,
  );
  for (const file of ["esm.mjs", "cjs.cjs"]) {
    execFileSync(process.execPath, [file], { cwd: dir, stdio: "inherit" });
  }
  console.log(
    `smoke: ${tarball} loads with import and require() on Node ${process.version}`,
  );
} finally {
  rmSync(dir, { force: true, recursive: true });
}
