import { Linter } from "eslint";
import tseslint from "typescript-eslint";
import { describe, expect, it } from "vitest";

import config from "../eslint.config.ts";

/** The `no-restricted-syntax` setting of the config block for library code, read from the real config so the test can't drift from it. */
function libraryRestrictions(): Linter.RuleEntry {
  const rule = config.find(({ name }) => name === "deckshoes/library")?.rules?.[
    "no-restricted-syntax"
  ];
  if (rule === undefined) {
    throw new Error("The deckshoes/library block has no no-restricted-syntax");
  }
  return rule;
}

const linter = new Linter();
const restrictions = libraryRestrictions();

/** The messages the library's restricted syntax gives for some code, including any parse error. */
function problems(code: string): string[] {
  return linter
    .verify(
      code,
      {
        files: ["**/*.ts"],
        languageOptions: { parser: tseslint.parser },
        rules: { "no-restricted-syntax": restrictions },
      },
      { filename: "src/operation.ts" },
    )
    .map(({ message }) => message);
}

/** What a stack read through behaviour an array can override is told. #56 asks that it names copyStack and ADR 0004. */
const UNSAFE_READ = /override.*copyStack.*\(ADR 0004\)/u;

/** What a stack parameter with a name the rule can't see is told. */
const MISNAMED = /^Name a stack parameter.*copyStack.*\(ADR 0004\)/u;

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
    "const [top] = stack;",
    "const [top, ...rest] = stack;",
    "deck.slice();",
    "[...hand];",
    "pile.map((card) => card);",
    "Array.from(remainder);",
    "cards.slice();",
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
    "const given: unknown = stack;",
  ])("allows %s", (code) => {
    expect(problems(code)).toEqual([]);
  });
});

describe("naming a stack parameter in library code", () => {
  it.each([
    "function op<C>(from: CardStack<C>) {}",
    "const op = <C>(from: CardStack<C>) => from;",
    "class Op { run(from: CardStack) {} }",
  ])("rejects %s", (code) => {
    const found = problems(code);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(MISNAMED);
  });

  it.each([
    "function op<C>(stack: CardStack<C>, cards: CardStack<C>) {}",
    "function op<C>(deck: CardStack<C>, hand: CardStack<C>) {}",
    "function op<C>(pile: CardStack<C>, remainder: CardStack<C>) {}",
    "function op(order: readonly Rank[], count = 1) {}",
  ])("allows %s", (code) => {
    expect(problems(code)).toEqual([]);
  });
});

it("still rejects a default export", () => {
  const found = problems("export default 1;");
  expect(found).toHaveLength(1);
  expect(found[0]).toMatch(/named exports/u);
});
