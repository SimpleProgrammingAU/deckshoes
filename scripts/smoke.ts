/**
 * Installs the packed tarball into a throwaway project and loads every entry
 * point with `import` and `require()`, the way users will. Then type-checks a
 * file that uses them all, against the published types. Run `pnpm build`
 * first.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const shell = process.platform === "win32";

const CHECK = `
// Throws unless each call throws the root entry point's error class, with
// its code, so a subpath can't have its own copies of the classes.
function throwsRootErrors(subpath, calls) {
  for (const [call, ErrorClass, code] of calls) {
    let thrown;
    try {
      call();
    } catch (error) {
      thrown = error;
    }
    if (!(thrown instanceof ErrorClass) || !isDeckshoesError(thrown, code)) {
      throw new Error(subpath + " throws its own error classes, not the ones deckshoes exports");
    }
  }
}
// Throws if the root entry point exports any of a subpath's names.
function notInRoot(subpath, names) {
  for (const name of names) {
    if (name in root) {
      throw new Error("the deckshoes entry point exports " + name + ", from " + subpath);
    }
  }
}
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
for (const [call, preset, size] of [["piquet()", piquet(), 32], ["euchre()", euchre(), 24], ["pinochle()", pinochle(), 48], ["pinochle({ size: 80 })", pinochle({ size: 80 }), 80]]) {
  if (preset.length !== size || preset[0] !== card("A", "H")) {
    throw new Error("deckshoes/presets loaded but " + call + " misbehaved");
  }
  if (!preset.every((c) => c === card(c.rank, c.suit))) {
    throw new Error("deckshoes/presets " + call + " has its own card objects, not the ones card() returns");
  }
}
throwsRootErrors("deckshoes/presets", [[() => pinochle({ size: 72 }), InvalidArgumentError, "INVALID_ARGUMENT"]]);
notInRoot("deckshoes/presets", ["standard52", "piquet", "euchre", "pinochle"]);
const softSeventeen = [card("A", "S"), card("6", "H")];
if (handTotal(softSeventeen) !== 17 || !isSoft(softSeventeen) || isBust(softSeventeen) || !isBlackjack([card("A", "S"), card("K", "H")])) {
  throw new Error("deckshoes/blackjack loaded but its hand functions misbehaved");
}
throwsRootErrors("deckshoes/blackjack", [
  [() => handTotal([null]), InvalidCardError, "INVALID_CARD"],
  [() => handTotal("AS"), InvalidArgumentError, "INVALID_ARGUMENT"],
]);
if (runningCount(deck) !== 0 || runningCount([card("2", "S"), card("K", "H"), card("5", "D")]) !== 1 || trueCount(6, deck.slice(0, 26), deck) !== 12) {
  throw new Error("deckshoes/blackjack loaded but its counts misbehaved");
}
notInRoot("deckshoes/blackjack", ["handTotal", "isSoft", "isBlackjack", "isBust", "runningCount", "trueCount"]);
const seven = [card("K", "S"), card("K", "H"), card("K", "D"), card("4", "C"), card("4", "S"), card("9", "H"), card("2", "D")];
if (handCategory(seven) !== Category.FULL_HOUSE || bestHand(seven).length !== 5 || bestHand(seven)[3] !== card("4", "C") || compareHands(seven, deck.slice(0, 5)) !== -1 || !Object.isFrozen(Category)) {
  throw new Error("deckshoes/poker loaded but its functions misbehaved");
}
throwsRootErrors("deckshoes/poker", [
  [() => handCategory([null]), InvalidCardError, "INVALID_CARD"],
  [() => handCategory("AS"), InvalidArgumentError, "INVALID_ARGUMENT"],
  [() => handCategory([]), InsufficientCardsError, "INSUFFICIENT_CARDS"],
]);
notInRoot("deckshoes/poker", ["Category", "bestHand", "compareHands", "handCategory"]);
const shuffled = shuffle(deck, { random: seededRandom(42) });
if (shuffled.length !== 52 || shuffled[0] !== card("7", "H")) {
  throw new Error("shuffle() with seededRandom(42) gave the wrong order");
}
if (deck[0] !== card("A", "H")) {
  throw new Error("shuffle() changed its input");
}
const chained = chain(deck).shuffle({ random: seededRandom(42) }).value();
if (chained.length !== 52 || chained[0] !== card("7", "H")) {
  throw new Error("chain().shuffle() with seededRandom(42) gave a different order from shuffle()");
}
if (chain(deck).value() !== deck || deck[0] !== card("A", "H")) {
  throw new Error("chain() didn't give back the stack it was given, unchanged");
}
const drawn = draw(deck, 2);
if (drawn.cards[0] !== card("A", "H") || drawn.remainder.length !== 50 || deck.length !== 52) {
  throw new Error("draw() gave the wrong cards or remainder, or changed its input");
}
const chainedDraw = chain(deck).draw(2).value();
if (chainedDraw.cards[0] !== drawn.cards[0] || chainedDraw.remainder[0] !== drawn.remainder[0]) {
  throw new Error("chain().draw() gave a different result from draw()");
}
`;

/**
 * Uses every entry point together. If the build gave each entry point its own
 * copy of the branded Card type, they wouldn't be assignable or comparable.
 */
const TYPES = `
import { type Card, card, type CardStack, chain, type Chain, draw, type DrawResult, seededRandom, shuffle, type TerminatedChain } from "deckshoes";
import { handTotal, isBlackjack, isBust, isSoft, runningCount, type RunningCountOptions, trueCount } from "deckshoes/blackjack";
import { bestHand, Category, compareHands, handCategory } from "deckshoes/poker";
import { euchre, pinochle, type PinochleOptions, piquet, standard52 } from "deckshoes/presets";

const options: PinochleOptions = { size: 80 };
export const presets: CardStack<Card>[] = [piquet(), euchre(), pinochle(), pinochle(options)];
const deck: CardStack<Card> = shuffle(standard52(), { random: seededRandom(1) });
const top: Card | undefined = deck[0];
export const same: boolean = top === card("A", "H");
const chained: Chain<Card> = chain(standard52()).shuffle({ random: seededRandom(1) });
export const unwrapped: CardStack<Card> = chained.value();
const drawn: DrawResult<Card> = draw(standard52(), 2);
export const remainder: CardStack<Card> = drawn.remainder;
const terminated: TerminatedChain<DrawResult<Card>> = chain(standard52()).draw(2);
export const drawnCards: CardStack<Card> = terminated.value().cards;
const blackjackHand: Card[] = [card("A", "S"), card("K", "H")];
export const total: number = handTotal(blackjackHand);
export const soft: boolean = isSoft(standard52());
export const blackjack: boolean = isBlackjack(blackjackHand) && !isBust(drawnCards);
const tagOptions: RunningCountOptions = { tag: (c: Card) => (c.rank === "A" ? 1 : 0) };
export const count: number = trueCount(runningCount(drawnCards, tagOptions), deck, standard52());
const category: Category = handCategory(drawnCards);
export const fullHouse: boolean = category === Category.FULL_HOUSE;
export const pokerHand: CardStack<Card> = bestHand(deck);
export const winner: -1 | 0 | 1 = compareHands(pokerHand, deck);
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
      `import { card, chain, draw, InsufficientCardsError, InvalidArgumentError, InvalidCardError, isDeckshoesError, seededRandom, shuffle } from "deckshoes";`,
      `import { handTotal, isBlackjack, isBust, isSoft, runningCount, trueCount } from "deckshoes/blackjack";`,
      `import { bestHand, Category, compareHands, handCategory } from "deckshoes/poker";`,
      `import { euchre, pinochle, piquet, standard52 } from "deckshoes/presets";`,
      CHECK,
    ].join("\n"),
  );
  writeFileSync(
    path.join(dir, "cjs.cjs"),
    [
      `const root = require("deckshoes");`,
      `const { card, chain, draw, InsufficientCardsError, InvalidArgumentError, InvalidCardError, isDeckshoesError, seededRandom, shuffle } = root;`,
      `const { handTotal, isBlackjack, isBust, isSoft, runningCount, trueCount } = require("deckshoes/blackjack");`,
      `const { bestHand, Category, compareHands, handCategory } = require("deckshoes/poker");`,
      `const { euchre, pinochle, piquet, standard52 } = require("deckshoes/presets");`,
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
