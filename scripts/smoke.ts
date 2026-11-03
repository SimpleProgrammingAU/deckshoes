/**
 * Installs the packed tarball into a throwaway project and loads both entry
 * points with `import` and `require()`, the way users will. Then type-checks a
 * file that uses both, against the published types. Run `pnpm build` first.
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
const deck = standard52();
if (deck.length !== 52 || deck[0] !== card("A", "H")) {
  throw new Error("deckshoes/presets loaded but standard52() misbehaved");
}
if (!deck.every((c) => c === card(c.rank, c.suit))) {
  throw new Error("deckshoes/presets has its own card objects, not the ones card() returns");
}
if ("standard52" in root) {
  throw new Error("the deckshoes entry point exports a preset");
}
const shuffled = shuffle(deck, { random: seededRandom(42) });
if (shuffled.length !== 52 || shuffled[0] !== card("7", "H")) {
  throw new Error("shuffle() with seededRandom(42) gave the wrong order");
}
if (deck[0] !== card("A", "H")) {
  throw new Error("shuffle() changed its input");
}
`;

/**
 * Uses both entry points together. If the build gave each entry point its own
 * copy of the branded Card type, the two wouldn't be assignable or comparable.
 */
const TYPES = `
import { type Card, card, type CardStack, seededRandom, shuffle } from "deckshoes";
import { standard52 } from "deckshoes/presets";

const deck: CardStack<Card> = shuffle(standard52(), { random: seededRandom(1) });
const top: Card | undefined = deck[0];
export const same: boolean = top === card("A", "H");
`;

/** Strict settings for TYPES, checking the published .d.ts files too. */
const TSCONFIG = {
  compilerOptions: {
    lib: ["es2023"],
    module: "nodenext",
    moduleResolution: "nodenext",
    noEmit: true,
    skipLibCheck: false,
    strict: true,
    target: "es2023",
    types: [],
  },
  files: ["types.mts"],
};

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
    [
      `import * as root from "deckshoes";`,
      `import { card, InvalidCardError, isDeckshoesError, seededRandom, shuffle } from "deckshoes";`,
      `import { standard52 } from "deckshoes/presets";`,
      CHECK,
    ].join("\n"),
  );
  writeFileSync(
    path.join(dir, "cjs.cjs"),
    [
      `const root = require("deckshoes");`,
      `const { card, InvalidCardError, isDeckshoesError, seededRandom, shuffle } = root;`,
      `const { standard52 } = require("deckshoes/presets");`,
      CHECK,
    ].join("\n"),
  );
  for (const file of ["esm.mjs", "cjs.cjs"]) {
    execFileSync(process.execPath, [file], { cwd: dir, stdio: "inherit" });
  }

  writeFileSync(path.join(dir, "types.mts"), TYPES);
  writeFileSync(path.join(dir, "tsconfig.json"), JSON.stringify(TSCONFIG));
  execFileSync(
    process.execPath,
    [path.join(ROOT, "node_modules", "typescript", "bin", "tsc")],
    { cwd: dir, stdio: "inherit" },
  );

  console.log(
    `smoke: ${tarball} loads with import and require() on Node ${process.version}, and its types check`,
  );
} finally {
  rmSync(dir, { force: true, recursive: true });
}
