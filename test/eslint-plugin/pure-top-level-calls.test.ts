import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";

import { pureTopLevelCalls } from "../../eslint-plugin/pure-top-level-calls.ts";

// RuleTester turns each case into a test through these.
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser: tseslint.parser },
});

/** Cases that each give one error, with the message and the kind of call it names. */
function cases(messageId: string, kind: string, codes: string[]) {
  return codes.map((code) => ({
    code,
    errors: [{ data: { kind }, messageId }],
  }));
}

ruleTester.run("deckshoes/pure-top-level-calls", pureTopLevelCalls, {
  invalid: [
    ...cases("unmarked", "call", [
      'const RunOut = Object.freeze({ STOP: "stop" });',
      'export const RunOut = Object.freeze({ STOP: "stop" });',
      'const RANK_NAMES = lookup<Rank, string>({ A: "Ace" });',
      "const CARD_TABLE = createTable();",
      'const BRAND = Symbol.for("deckshoes.error.v1");',
      "let deck = createTable();",
      'const RankOrder = /* @__PURE__ */ Object.freeze({ ACE_HIGH: Object.freeze(["2", "A"]) });',
      "const CARDS = /* @__PURE__ */ collectCards(createTable());",
      'const KEYED = { [Symbol.for("deckshoes")]: 1 };',
      "const TABLE = wide ? /* @__PURE__ */ createWideTable() : createTable();",
      "const CARD_TABLE = /* builds the table */ createTable();",
      "const CARD_TABLE = /*#__PURE__*/ createTable();",
      "const CARD_TABLE = // @__PURE__\n  createTable();",
      "const CARD_TABLE = createTable(), CARDS = /* @__PURE__ */ collectCards();",
      "export class Defaults { static ROWS = createTable(); }",
      "const Table = class { static rows = createTable(); };",
      "export class Table extends mixin(Base) {}",
      "export const Table = class extends mixin(Base) {};",
      "export class Table { [key()]() {} }",
      "export class Table { static [key()] = 1; }",
    ]),
    ...cases("unmarked", "`new`", [
      "const frozenPlaces = new WeakMap<object, number>();",
      "const decks = new Map();",
      "export class Defaults { static decks = new Map(); }",
    ]),
    ...cases("resultRead", "call", [
      "const { rows } = createTable();",
      "export const { rows } = /* @__PURE__ */ createTable();",
      "const [first] = /* @__PURE__ */ createTable();",
      "const ROWS = /* @__PURE__ */ createTable().rows;",
      "const FIRST = /* @__PURE__ */ createTable()[0];",
      "const ROWS = /* @__PURE__ */ createTable()?.rows;",
      "const ROWS = (/* @__PURE__ */ createTable() as Table).rows;",
      "const ROWS = /* @__PURE__ */ createTable()!.rows;",
      "const ALL = [.../* @__PURE__ */ createTable()];",
      "const MERGED = { .../* @__PURE__ */ createTable() };",
      "const NEXT = /* @__PURE__ */ count() + 1;",
      "const NEGATED = -/* @__PURE__ */ count();",
      "const LABEL = `${/* @__PURE__ */ name()}`;",
      "export class Defaults { static ROWS = /* @__PURE__ */ createTable().rows; }",
      "const TABLE = /* @__PURE__ */ Object.freeze({ rows: /* @__PURE__ */ createTable().rows });",
    ]),
    ...cases("resultRead", "`new`", [
      "const SIZE = /* @__PURE__ */ new Map().size;",
    ]),
  ],
  valid: [
    'const RunOut = /* @__PURE__ */ Object.freeze({ STOP: "stop" });',
    'export const RunOut: { readonly STOP: "stop" } =\n  /* @__PURE__ */ Object.freeze({ STOP: "stop" });',
    'export const RankOrder = /* @__PURE__ */ Object.freeze({ ACE_HIGH: /* @__PURE__ */ Object.freeze(["2", "A"]) });',
    "const frozenPlaces = /* @__PURE__ */ new WeakMap<object, number>();",
    'const RANK_NAMES = /*@__PURE__*/ lookup({ A: "Ace" });',
    "const CARD_TABLE = /* @__PURE__ */ createTable() as Table;",
    "const CARD_TABLE = /* @__PURE__ */ createTable() satisfies Table;",
    "const TABLE = wide ? /* @__PURE__ */ createWideTable() : /* @__PURE__ */ createTable();",
    "const TABLE = OVERRIDE ?? /* @__PURE__ */ createTable();",
    "const PAIR = [/* @__PURE__ */ createTable(), /* @__PURE__ */ createTable()];",
    "const CARDS = /* @__PURE__ */ new Set(/* @__PURE__ */ collectCards());",
    "const BUILT = /* @__PURE__ */ (/* @__PURE__ */ builder())();",
    "const EMPTY = !/* @__PURE__ */ createTable();",
    "const SAME = /* @__PURE__ */ createTable() === TABLE;",
    'const RANKS = ["A", "2", "3"];',
    "const MAX_HANDS = 2 ** 32 - 1;",
    "const SIZE = TABLE.size;",
    "const build = () => createTable();",
    "const lazy = { get table() { return createTable(); } };",
    "function op() { const table = createTable(); return table; }",
    "let deck;",
    "registerAll();",
    "for (const card of createTable()) use(card);",
    "export class Defaults { static ROWS = /* @__PURE__ */ createTable(); }",
    "export class Table extends /* @__PURE__ */ mixin(Base) {}",
    "export class Table { [/* @__PURE__ */ key()]() {} }",
    "class Table { rows = createTable(); }",
    "class Table { constructor() { this.rows = createTable(); } }",
    "class Table { static build() { return createTable(); } }",
    'class InsufficientCardsError extends DeckshoesError { override readonly name = "InsufficientCardsError"; }',
    "export abstract class DeckshoesError extends Error { static { Object.defineProperty(this.prototype, BRAND, { value: true }); } }",
    "const Branded = class { static { Object.defineProperty(this.prototype, BRAND, { value: true }); } };",
  ],
});
