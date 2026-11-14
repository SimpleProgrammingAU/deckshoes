import type { Linter } from "eslint";

import js from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import prettier from "eslint-config-prettier/flat";
import jsdoc from "eslint-plugin-jsdoc";
import { getJsdocProcessorPlugin } from "eslint-plugin-jsdoc/getJsdocProcessorPlugin.js";
import perfectionist from "eslint-plugin-perfectionist";
import unicorn from "eslint-plugin-unicorn";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import { builtinModules } from "node:module";
import tseslint from "typescript-eslint";

/** Virtual files that eslint-plugin-jsdoc's processor creates for `@example` code. */
const EXAMPLES = "**/*.ts/*.ts";
const BENCHMARKS = ["src/**/*.bench.ts"];
const TESTS = [
  "src/**/*.test.ts",
  "src/**/*.test-d.ts",
  "test/**/*.test.ts",
  ...BENCHMARKS,
];

/**
 * Declarations that make up the public API and need full documentation.
 *
 * These use `[parent.type=…]` rather than `ExportNamedDeclaration > …` because
 * some jsdoc rules match contexts without ancestry, so `>` never matches.
 */
const PUBLIC_DECLARATIONS = [
  "ClassDeclaration",
  "FunctionDeclaration",
  "TSDeclareFunction",
  "TSEnumDeclaration",
  "TSInterfaceDeclaration",
  "TSTypeAliasDeclaration",
  "VariableDeclaration",
].map((type) => `${type}[parent.type="ExportNamedDeclaration"]`);

/** Function-shaped nodes whose parameters and return values get documented. */
const FUNCTION_LIKE = [
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
  "TSDeclareFunction",
  "TSMethodSignature",
];

/** Return types that mean "returns nothing", so `@returns` is not required. */
const RETURNS_NOTHING = [
  "[returnType.typeAnnotation.type=/^TS(?:Void|Never|Undefined)Keyword$/]",
  '[returnType.typeAnnotation.typeName.name="Promise"][returnType.typeAnnotation.typeArguments.params.0.type=/^TS(?:Void|Never|Undefined)Keyword$/]',
].join(", ");

/** Everything that may carry a doc comment, public declarations and their members. */
const DOCUMENTABLE = [
  "ArrowFunctionExpression",
  "ClassDeclaration",
  "FunctionDeclaration",
  "FunctionExpression",
  "MethodDefinition",
  "PropertyDefinition",
  "TSDeclareFunction",
  "TSEnumDeclaration",
  "TSInterfaceDeclaration",
  "TSMethodSignature",
  "TSPropertySignature",
  "TSTypeAliasDeclaration",
  "VariableDeclaration",
];

/**
 * What library code calls a stack: the glossary's words for the roles a stack
 * plays, and `cards` for a stack an operation acts on. A selector has no type
 * information, so the rules below find a stack by its name.
 */
const STACK_NAME = "/^(?:cards|deck|hand|pile|remainder|stack)$/";

/** Array methods that make a new array, through `Symbol.species` or an override. */
const COPYING_METHOD =
  "/^(?:concat|filter|flat|flatMap|map|slice|splice|toReversed|toSorted|toSpliced|with)$/";

/** Array methods that return an iterator. `values` is the iterator itself. */
const ITERATOR_METHOD = "/^(?:entries|keys|values)$/";

/** `Object` functions that read an array's own keys, which skip holes. */
const OWN_KEYS_FUNCTION = "/^(?:assign|entries|values)$/";

/** Where `CardStack` sits in a parameter's annotation: alone, in a union, or in `Readonly<…>`. */
const STACK_ANNOTATION = [
  "TSTypeAnnotation > TSTypeReference",
  "TSTypeAnnotation > TSUnionType > TSTypeReference",
  'TSTypeAnnotation > TSTypeReference[typeName.name="Readonly"] > TSTypeParameterInstantiation > TSTypeReference',
].map((path) => `${path}[typeName.name="CardStack"]`);

/** The `CardStack` in the annotation of a parameter that `pattern` matches, with or without a default value. */
function stackParameter(pattern: string): string {
  return [
    `:function > ${pattern}.params`,
    `:function > AssignmentPattern.params > ${pattern}.left`,
  ]
    .flatMap((parameter) =>
      STACK_ANNOTATION.map((annotation) => `${parameter} > ${annotation}`),
    )
    .join(", ");
}

/**
 * Reading a stack through behaviour the array can override: a method that
 * makes a new array, `Symbol.isConcatSpreadable`, the iterator, or its own
 * keys (ADR 0004).
 */
const UNSAFE_STACK_READS = [
  `CallExpression[callee.object.name=${STACK_NAME}][callee.property.name=${COPYING_METHOD}]`,
  `CallExpression[callee.property.name="concat"] > Identifier.arguments[name=${STACK_NAME}]`,
  `CallExpression[callee.object.name=${STACK_NAME}][callee.property.name=${ITERATOR_METHOD}]`,
  `SpreadElement[argument.name=${STACK_NAME}]`,
  `CallExpression[callee.object.name="Array"][callee.property.name="from"] > Identifier.arguments[name=${STACK_NAME}]`,
  `NewExpression[callee.name="Set"] > Identifier.arguments[name=${STACK_NAME}]`,
  `ForOfStatement[right.name=${STACK_NAME}]`,
  `VariableDeclarator[init.name=${STACK_NAME}] > ArrayPattern`,
  `AssignmentExpression[right.name=${STACK_NAME}] > ArrayPattern`,
  stackParameter("ArrayPattern"),
  `CallExpression[callee.object.name="Object"][callee.property.name=${OWN_KEYS_FUNCTION}] > Identifier.arguments[name=${STACK_NAME}]`,
];

/** A `CardStack` parameter with a name the rules above can't see. */
const MISNAMED_STACK = stackParameter(`Identifier:not([name=${STACK_NAME}])`);

const importSorting: Linter.RulesRecord = {
  "perfectionist/sort-exports": ["error", { type: "natural" }],
  "perfectionist/sort-imports": ["error", { type: "natural" }],
  "perfectionist/sort-named-exports": ["error", { type: "natural" }],
  "perfectionist/sort-named-imports": ["error", { type: "natural" }],
};

const config: ReturnType<typeof defineConfig> = defineConfig([
  globalIgnores([
    "coverage/",
    "dist/",
    "docs-site/",
    ".doctest/",
    "CHANGELOG.md",
  ]),

  {
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      unicorn.configs.unopinionated,
    ],
    files: ["**/*.ts"],
    ignores: [EXAMPLES],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    name: "deckshoes/typescript",
    plugins: { perfectionist },
    rules: {
      ...importSorting,
      "@typescript-eslint/consistent-type-exports": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/no-deprecated": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      eqeqeq: ["error", "always"],
      "no-console": "error",
    },
  },

  {
    files: ["src/**/*.ts"],
    ignores: [EXAMPLES, ...TESTS],
    name: "deckshoes/library",
    rules: {
      // A stack is read by index, not through its iterator (ADR 0004), so an
      // index loop that only reads is the right loop for one.
      "@typescript-eslint/prefer-for-of": "off",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "node:*",
                ...builtinModules,
                ...builtinModules.map((name) => `${name}/*`),
              ],
              message:
                "The library must run in browsers and every JS runtime; don't import Node built-ins.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          message:
            "Use named exports so the API is consistent and tree-shakeable.",
          selector: "ExportDefaultDeclaration",
        },
        ...UNSAFE_STACK_READS.map((selector) => ({
          message:
            "This goes through behaviour an array can override, so the array can throw, lose cards or change their order. Read a stack by index, or copy it with copyStack from src/internal/stack.ts (ADR 0004).",
          selector,
        })),
        {
          message:
            "Name a stack parameter stack, deck, hand, pile, remainder or cards: lint finds a stack by its name, to keep copies going through copyStack (ADR 0004).",
          selector: MISNAMED_STACK,
        },
      ],
    },
  },

  {
    extends: [jsdoc.configs["flat/recommended-typescript-error"]],
    files: ["src/**/*.ts"],
    ignores: [EXAMPLES, ...TESTS, "src/internal/**"],
    name: "deckshoes/doc-comments",
    rules: {
      "jsdoc/check-tag-names": [
        "error",
        {
          definedTags: [
            "alpha",
            "beta",
            "category",
            "defaultValue",
            "experimental",
            "inheritDoc",
            "packageDocumentation",
            "privateRemarks",
            "remarks",
            "typeParam",
          ],
          typed: true,
        },
      ],
      // `@since` is checked by the rules below so that `@since NEXT` is allowed.
      "jsdoc/check-values": "off",
      "jsdoc/informative-docs": "error",
      "jsdoc/no-restricted-syntax": [
        "error",
        {
          contexts: [
            {
              comment:
                'JsdocBlock:has(JsdocTag[tag="since"]:not([description=/^(?:NEXT|\\d+\\.\\d+\\.\\d+)$/]))',
              context: "any",
              message:
                "`@since` must be `NEXT` (for unreleased code) or a version such as `1.2.0`.",
            },
            {
              // The link may name its text, as `{@link deckshoes!X | X}`
              // does, so a link to another entry point reads as the class.
              comment:
                'JsdocBlock:has(JsdocTag[tag="throws"]:not([rawType=/^@link\\s+\\S+(?:\\s+\\|\\s+\\S+)?$/]))',
              context: "any",
              message:
                "Write `@throws {@link ErrorClass} When …`, so the docs link to the error.",
            },
            {
              comment:
                'JsdocBlock:has(JsdocTag[tag="deprecated"]:not([description=/\\{@link/]))',
              context: "any",
              message:
                "`@deprecated` must name the replacement with {@link …} and say when it will be removed.",
            },
          ],
        },
      ],
      "jsdoc/require-description": ["error", { contexts: DOCUMENTABLE }],
      "jsdoc/require-example": [
        "error",
        { contexts: PUBLIC_DECLARATIONS, exemptNoArguments: false },
      ],
      "jsdoc/require-hyphen-before-param-description": ["error", "always"],
      "jsdoc/require-jsdoc": [
        "error",
        {
          checkConstructors: true,
          checkGetters: true,
          checkSetters: true,
          contexts: DOCUMENTABLE,
          publicOnly: true,
          require: {
            ArrowFunctionExpression: true,
            ClassDeclaration: true,
            ClassExpression: true,
            FunctionDeclaration: true,
            FunctionExpression: true,
            MethodDefinition: true,
          },
        },
      ],
      "jsdoc/require-param": [
        "error",
        { checkDestructured: true, contexts: FUNCTION_LIKE },
      ],
      "jsdoc/require-returns": [
        "error",
        {
          contexts: FUNCTION_LIKE.map(
            (type) => `${type}:not(${RETURNS_NOTHING})`,
          ),
          forceReturnsWithAsync: false,
        },
      ],
      "jsdoc/require-tags": [
        "error",
        {
          tags: PUBLIC_DECLARATIONS.map((context) => ({
            context,
            tag: "since",
          })),
        },
      ],
      "jsdoc/require-throws": "error",
      "jsdoc/require-throws-description": "error",
      // `@throws {@link X}` (TSDoc) is checked by no-restricted-syntax instead.
      "jsdoc/require-throws-type": "off",
      "jsdoc/tag-lines": ["error", "any", { startLines: 1 }],
    },
    settings: {
      jsdoc: {
        mode: "typescript",
        tagNamePreference: {
          returns: "returns",
          // TSDoc's name for it, which TypeDoc documents; jsdoc calls it @template.
          template: "typeParam",
          throws: "throws",
        },
      },
    },
  },

  {
    files: ["src/internal/**/*.ts"],
    ignores: [EXAMPLES, ...TESTS],
    name: "deckshoes/internal-doc-comments",
    plugins: { jsdoc },
    rules: {
      "jsdoc/require-description": "error",
      "jsdoc/require-jsdoc": [
        "error",
        { require: { ClassDeclaration: true, FunctionDeclaration: true } },
      ],
    },
  },

  {
    files: ["src/**/*.ts"],
    ignores: [EXAMPLES, ...TESTS],
    name: "deckshoes/examples-processor",
    plugins: {
      examples: getJsdocProcessorPlugin({
        exampleCodeRegex: /```(?:ts|typescript)[^\n]*\n([\s\S]*?)```/gu,
        matchingFileName: "example.ts",
        parser: tseslint.parser,
      }),
    },
    processor: "examples/examples",
  },

  {
    extends: [
      js.configs.recommended,
      tseslint.configs.strict,
      tseslint.configs.stylistic,
      unicorn.configs.unopinionated,
    ],
    files: [EXAMPLES],
    name: "deckshoes/examples",
    plugins: { perfectionist },
    rules: {
      ...importSorting,
      // `value; // => result` lines are how examples show results.
      "@typescript-eslint/no-unused-expressions": "off",
      "no-console": "off",
      // The rule can't tell `chain(stack).sort(rankOrder)`, which returns a new
      // chain, from Array#sort, which sorts in place.
      "unicorn/no-array-sort": "off",
    },
  },

  {
    extends: [vitest.configs.recommended],
    files: TESTS,
    name: "deckshoes/tests",
    rules: {
      "vitest/consistent-test-it": ["error", { fn: "it" }],
      "vitest/expect-expect": [
        "error",
        { assertFunctionNames: ["expect", "expectTypeOf", "assertType"] },
      ],
      "vitest/no-disabled-tests": "error",
      "vitest/no-focused-tests": "error",
    },
  },

  {
    files: BENCHMARKS,
    name: "deckshoes/benchmarks",
    rules: {
      // Benchmarks measure; they don't assert.
      "vitest/expect-expect": "off",
    },
  },

  {
    files: ["scripts/**/*.ts", "*.ts"],
    languageOptions: { globals: globals.node },
    name: "deckshoes/tooling",
    rules: {
      "no-console": "off",
    },
  },

  prettier,
]);

export default config;
