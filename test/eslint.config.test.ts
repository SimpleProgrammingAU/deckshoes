import { ESLint, Linter } from "eslint";
import path from "node:path";
import tseslint from "typescript-eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({ cwd: path.join(import.meta.dirname, "..") });

/** The rules ESLint applies to a file, after every config block that matches it. */
async function rulesFor(file: string): Promise<Partial<Linter.RulesRecord>> {
  const config = (await eslint.calculateConfigForFile(file)) as Linter.Config;
  return config.rules ?? {};
}

/** The settings ESLint gives a rule for a file, which must apply it. */
async function ruleFor(file: string, rule: string): Promise<Linter.RuleEntry> {
  const entry = (await rulesFor(file))[rule];
  if (entry === undefined) {
    throw new Error(`ESLint applies no ${rule} to ${file}`);
  }
  return entry;
}

const LIBRARY_FILE = "src/operation.ts";
const ROOT_ENTRY_POINT = "src/index.ts";
const restrictions = await ruleFor(LIBRARY_FILE, "no-restricted-syntax");
const imports = await ruleFor(LIBRARY_FILE, "no-restricted-imports");
const entryPointImports = await ruleFor(
  ROOT_ENTRY_POINT,
  "no-restricted-imports",
);

const linter = new Linter();

/** The library's restricted syntax, which most of these tests check. */
const restrictedSyntax: Linter.RulesRecord = {
  "no-restricted-syntax": restrictions,
};

/** The messages some rules give for some code, including any parse error. By default, the library's restricted syntax. */
function problems(
  code: string,
  rules: Linter.RulesRecord = restrictedSyntax,
): string[] {
  return linter
    .verify(
      code,
      {
        files: ["**/*.ts"],
        languageOptions: { parser: tseslint.parser },
        rules,
      },
      { filename: LIBRARY_FILE },
    )
    .map(({ message }) => message);
}

/** What a stack read through behaviour an array can override is told. #56 asks that it names copyStack and ADR 0004. */
const UNSAFE_READ = /override.*copyStack.*\(ADR 0004\)/u;

/** What a stack parameter with a name the rule can't see is told. */
const MISNAMED = /^Name a stack parameter.*copyStack.*\(ADR 0004\)/u;

/** What a library module that imports the chain is told. #72 asks that it names ADR 0001. */
const CHAIN_IMPORT = /Only src\/index\.ts imports the chain.*\(ADR 0001\)/u;

/** What a library module that imports a Node built-in is told. */
const NODE_IMPORT = /Node built-ins/u;

/** What a module that imports an entry point is told. #74 asks that it names ADR 0001. */
const ENTRY_POINT_IMPORT = /not an entry point.*\(ADR 0001\)/u;

/** Imports of an entry point, which no library module makes, value or type (#74). */
const ENTRY_POINT_IMPORTS = [
  'import { InvalidCardError } from "deckshoes";',
  'import { standard52 } from "deckshoes/presets";',
  'import { handTotal } from "deckshoes/blackjack";',
  'import { chain } from "../index.ts";',
  'import { card } from "./index.ts";',
  'import { card } from "../index.js";',
  'import { standard52 } from "../presets/index.ts";',
  'import type { Card } from "deckshoes";',
  'import type { Card } from "../index.ts";',
  'import "deckshoes";',
  'export { card } from "../index.ts";',
  'export * from "deckshoes";',
  'export type { Card } from "deckshoes";',
];

/** The rule that flags type tests' fake cards, so #96 turns it off for them alone. */
const CLASS_INSTANCE = "@typescript-eslint/no-unsafe-class-instance-assignment";

describe("the rules ESLint applies to library code", () => {
  it.each([
    LIBRARY_FILE,
    "src/internal/operation.ts",
    "src/presets/operation.ts",
    "src/presets/index.ts",
    "src/blackjack/operation.ts",
    "src/poker/operation.ts",
  ])(
    "restrict reading a stack and imports in %s, allow an index loop, and require pure marks",
    async (file) => {
      const rules = await rulesFor(file);
      expect(rules["no-restricted-syntax"]).toEqual(restrictions);
      expect(rules["no-restricted-imports"]).toEqual(imports);
      expect(rules["@typescript-eslint/prefer-for-of"]).toEqual([0]);
      expect(rules["deckshoes/pure-top-level-calls"]).toEqual([2]);
    },
  );

  it("leave pure marks and imports alone in tests", async () => {
    const rules = await rulesFor("src/chain.test.ts");
    expect(rules["deckshoes/pure-top-level-calls"]).toBeUndefined();
    expect(rules["no-restricted-imports"]).toBeUndefined();
  });
});

describe("the class-instance rule", () => {
  it.each(["src/operation.test-d.ts", "src/presets/operation.test-d.ts"])(
    "is off in the type test %s",
    async (file) => {
      expect((await rulesFor(file))[CLASS_INSTANCE]).toEqual([0]);
    },
  );

  it.each([
    LIBRARY_FILE,
    "src/operation.test.ts",
    "test/operation.test.ts",
    "src/operation.bench.ts",
  ])("isn't turned off in %s", async (file) => {
    expect((await rulesFor(file))[CLASS_INSTANCE]).not.toEqual([0]);
  });
});

describe("importing in library code", () => {
  const libraryImports = { "no-restricted-imports": imports };

  it.each([
    'import { chain } from "./chain.ts";',
    'import { chain } from "../chain.ts";',
    'import { chain } from "./chain.js";',
    'import { chain } from "./../chain.ts";',
    'import { chain } from "../internal/../chain.ts";',
    'import { chain, type Chain } from "./chain.ts";',
    'import "./chain.ts";',
    'export { chain } from "./chain.ts";',
    'export * from "./chain.ts";',
  ])("rejects %s", (code) => {
    const found = problems(code, libraryImports);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(CHAIN_IMPORT);
  });

  it.each([
    'import type { Chain } from "./chain.ts";',
    'export type { Chain } from "./chain.ts";',
    'import { cut } from "./cut.ts";',
    'import { copyStack } from "../internal/stack.ts";',
    'import { chainable } from "./chainable.ts";',
  ])("allows %s", (code) => {
    expect(problems(code, libraryImports)).toEqual([]);
  });

  it("rejects a Node built-in", () => {
    const found = problems('import fs from "node:fs";', libraryImports);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(NODE_IMPORT);
  });

  it.each(ENTRY_POINT_IMPORTS)("rejects %s", (code) => {
    const found = problems(code, libraryImports);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(ENTRY_POINT_IMPORT);
  });

  it.each([
    'import { card } from "../card.ts";',
    'import { lookup } from "../internal/lookup.ts";',
    'import { reindex } from "./reindex.ts";',
    'import { table } from "./index-table.ts";',
    'import { deckshoes } from "./deckshoes.ts";',
  ])("allows %s", (code) => {
    expect(problems(code, libraryImports)).toEqual([]);
  });
});

describe("importing in the root entry point", () => {
  const entryPoint = { "no-restricted-imports": entryPointImports };

  it("allows the chain", () => {
    expect(
      problems(
        'export { chain, type Chain, type TerminatedChain } from "./chain.ts";',
        entryPoint,
      ),
    ).toEqual([]);
  });

  it("rejects a Node built-in", () => {
    const found = problems('import fs from "node:fs";', entryPoint);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(NODE_IMPORT);
  });

  it.each([
    ...ENTRY_POINT_IMPORTS,
    'export { standard52 } from "./presets/index.ts";',
  ])("rejects %s", (code) => {
    const found = problems(code, entryPoint);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(ENTRY_POINT_IMPORT);
  });
});

describe("reading a stack in library code", () => {
  it.each([
    "stack.slice();",
    "stack.slice(1, 2);",
    "stack?.slice();",
    "stack.concat([card]);",
    "stack.filter(Boolean);",
    "stack.flat();",
    "stack.flatMap((card) => [card]);",
    "stack.map((card) => card);",
    "stack.splice(0, 1);",
    "stack.toReversed();",
    "stack.toSorted();",
    "stack.toSpliced(0, 1);",
    "stack.with(0, card);",
    "[card].concat(stack);",
    "[...stack];",
    "f(...stack);",
    "Array.from(stack);",
    "new Set(stack);",
    "for (const card of stack) f(card);",
    "stack.entries();",
    "stack.keys();",
    "stack.values();",
    "for (const [, card] of stack.entries()) f(card);",
    "const [top] = stack;",
    "const [top, ...rest] = stack;",
    "[top] = stack;",
    "function op<C>([top]: CardStack<C>) {}",
    "const op = <C>([top, ...rest]: Readonly<CardStack<C>>) => top;",
    "function op<C>([top]: CardStack<C> | undefined = []) {}",
    "Object.values(stack);",
    "Object.entries(stack);",
    "Object.assign([], stack);",
    "deck.slice();",
    "[...hand];",
    "pile.map((card) => card);",
    "Array.from(remainder);",
    "cards.slice();",
    "[...otherCards];",
    "discardPile.map((card) => card);",
    "for (const card of spanishDeck) f(card);",
  ])("rejects %s", (code) => {
    const found = problems(code);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(UNSAFE_READ);
  });

  it.each([
    "value.slice(0, 30); // a string, as in display.ts",
    "RANKS.map((rank) => rank);",
    "[...RANKS.map((rank) => rank)];",
    "RANKS.toReversed();",
    "f(stack[0], stack.length);",
    "for (let i = 0; i < stack.length; i++) f(stack[i]);",
    "copyStack(stack).map((card) => card);",
    "for (const card of copyStack(stack)) f(card);",
    "f(stack.includes(card), stack.indexOf(card), stack.at(-1));",
    "stack.reduce((count) => count + 1, 0);",
    "standard52().filter(Boolean);",
    "Object.freeze({ cards: copyStack(stack, 0, count) });",
    "Object.entries(options);",
    "const given: unknown = stack;",
    "function op([rank, suit]: readonly [Rank, Suit]) {}",
  ])("allows %s", (code) => {
    expect(problems(code)).toEqual([]);
  });
});

describe("naming a stack parameter in library code", () => {
  it.each([
    "function op<C>(from: CardStack<C>) {}",
    "const op = <C>(from: CardStack<C>) => from;",
    "class Op { run(from: CardStack) {} }",
    "function op<C>(from?: CardStack<C>) {}",
    "function op<C>(from: CardStack<C> = []) {}",
    "function op<C>(from: CardStack<C> | undefined) {}",
    "function op<C>(from: undefined | CardStack<C>) {}",
    "function op<C>(from: Readonly<CardStack<C>>) {}",
    "function op<C>(Cards: CardStack<C>) {}",
    "function op<C>(cardsOther: CardStack<C>) {}",
    "function op<C>(other_cards: CardStack<C>) {}",
    "function op<C>(otherCard: CardStack<C>) {}",
  ])("rejects %s", (code) => {
    const found = problems(code);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(MISNAMED);
  });

  it.each([
    "function op<C>(stack: CardStack<C>, cards: CardStack<C>) {}",
    "function op<C>(deck: CardStack<C>, hand: CardStack<C>) {}",
    "function op<C>(pile: CardStack<C>, remainder: CardStack<C>) {}",
    "function op<C>(cards: CardStack<C>, otherCards: CardStack<C>) {}",
    "function op<C>(discardPile: CardStack<C>, spanishDeck: CardStack<C>) {}",
    "function op<C>(firstHand: CardStack<C>, hand2Stack: CardStack<C>) {}",
    "function op<C>(stack: CardStack<C> | undefined, cards: Readonly<CardStack<C>> = []) {}",
    "function op(order: readonly Rank[], count = 1) {}",
    "function op<C>(hands: readonly CardStack<C>[]) {}",
  ])("allows %s", (code) => {
    expect(problems(code)).toEqual([]);
  });
});

it("still rejects a default export", () => {
  const found = problems("export default 1;");
  expect(found).toHaveLength(1);
  expect(found[0]).toMatch(/named exports/u);
});
