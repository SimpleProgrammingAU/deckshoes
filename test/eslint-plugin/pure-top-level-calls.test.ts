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

const UNMARKED_CALL = { data: { kind: "call" }, messageId: "unmarked" };
const UNMARKED_NEW = { data: { kind: "`new`" }, messageId: "unmarked" };

ruleTester.run("deckshoes/pure-top-level-calls", pureTopLevelCalls, {
  invalid: [
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
    "const { rows } = createTable();",
    "const CARD_TABLE = /* builds the table */ createTable();",
    "const CARD_TABLE = /*#__PURE__*/ createTable();",
    "const CARD_TABLE = // @__PURE__\n  createTable();",
    "const CARD_TABLE = createTable(), CARDS = /* @__PURE__ */ collectCards();",
  ]
    .map((code) => ({ code, errors: [UNMARKED_CALL] }))
    .concat(
      [
        "const frozenPlaces = new WeakMap<object, number>();",
        "const decks = new Map();",
      ].map((code) => ({ code, errors: [UNMARKED_NEW] })),
    ),
  valid: [
    'const RunOut = /* @__PURE__ */ Object.freeze({ STOP: "stop" });',
    'export const RunOut: { readonly STOP: "stop" } =\n  /* @__PURE__ */ Object.freeze({ STOP: "stop" });',
    'export const RankOrder = /* @__PURE__ */ Object.freeze({ ACE_HIGH: /* @__PURE__ */ Object.freeze(["2", "A"]) });',
    "const frozenPlaces = /* @__PURE__ */ new WeakMap<object, number>();",
    'const RANK_NAMES = /*@__PURE__*/ lookup({ A: "Ace" });',
    "const CARD_TABLE = /* @__PURE__ */ createTable() as Table;",
    'const RANKS = ["A", "2", "3"];',
    "const MAX_HANDS = 2 ** 32 - 1;",
    "const build = () => createTable();",
    "const lazy = { get table() { return createTable(); } };",
    "function op() { const table = createTable(); return table; }",
    "let deck;",
    "registerAll();",
    "for (const card of createTable()) use(card);",
    "class DeckshoesError extends Error { static { Object.defineProperty(this.prototype, BRAND, { value: true }); } }",
    "const Table = class { static rows = createTable(); };",
  ],
});
