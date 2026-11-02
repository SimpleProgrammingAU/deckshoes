/**
 * Turns code examples into Vitest tests so every example in the docs is
 * type-checked and run.
 *
 * Sources:
 * - fenced `ts` blocks inside `@example` tags in `src/**\/*.ts`
 * - fenced `ts` blocks in the Markdown files listed in `MARKDOWN_FILES`
 *
 * Each block becomes one file under `.doctest/`. Imports are hoisted to the top
 * of the file and the rest of the block runs inside a `test()`. Comment
 * conventions on the end of a line turn into assertions:
 *
 * - `expr; // => value`  →  `expect(expr).toStrictEqual(value)`
 * - `const x = expr; // => value`  →  the declaration, then `expect(x)…`
 * - `console.log(expr); // => value`  →  `expect(expr)…`
 * - `expr; // throws CODE_OR_NAME`  →  asserts the thrown error's `code`
 *   (for `UPPER_SNAKE` values) or `name` (anything else)
 *
 * Add `no-test` to a fence's info string (```ts no-test) to skip a block.
 *
 * Run with `node scripts/doctest.ts`; `pnpm test` and `pnpm typecheck` do this
 * for you.
 */
import {
  globSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, ".doctest");
const SOURCE_GLOB = "src/**/*.ts";
const SOURCE_IGNORE = ["src/**/*.test.ts", "src/**/*.test-d.ts"];
const MARKDOWN_FILES = ["README.md"];

interface Example {
  /** The code inside the fence. */
  code: string;
  /** 1-based line of the opening fence in the source file. */
  line: number;
  /** Human-readable label, such as the documented symbol's name. */
  label: string;
  /** Source file, relative to the repo root, using `/` separators. */
  source: string;
}

const FENCE_OPEN = /^(?<fence>`{3,}|~{3,})\s*(?<info>.*)$/u;
const TS_LANGS = new Set(["ts", "typescript", "mts"]);

/** Pulls fenced TypeScript blocks out of Markdown-ish lines. */
function extractFences(
  lines: readonly string[],
): { code: string; index: number }[] {
  const blocks: { code: string; index: number }[] = [];
  let open: { fence: string; index: number; test: boolean } | undefined;
  let body: string[] = [];

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();
    if (open) {
      if (
        trimmed.startsWith(open.fence) &&
        trimmed.slice(open.fence.length).trim() === "" &&
        trimmed.replaceAll(open.fence.charAt(0), "") === ""
      ) {
        if (open.test)
          blocks.push({ code: body.join("\n"), index: open.index });
        open = undefined;
        body = [];
      } else {
        body.push(line);
      }
      continue;
    }
    const match = FENCE_OPEN.exec(trimmed);
    if (match?.groups) {
      const words = (match.groups["info"] ?? "").split(/\s+/u);
      const language = (words[0] ?? "").toLowerCase();
      open = {
        fence: match.groups["fence"] ?? "```",
        index,
        test: TS_LANGS.has(language) && !words.includes("no-test"),
      };
    }
  }
  return blocks;
}

const DECLARATION =
  /^\s*(?:export\s+)?(?:declare\s+)?(?:default\s+)?(?:abstract\s+)?(?:async\s+)?(?:class|function\*?|const|let|interface|type|enum)\s+(?<name>[\w$]+)/u;
const MEMBER =
  /^\s*(?:(?:public|protected|static|readonly|override|abstract|async|get|set)\s+)*(?<name>#?[\w$]+)\s*[(<:=]/u;

/** Finds `@example` blocks in the JSDoc comments of a TypeScript file. */
function examplesFromSource(file: string): Example[] {
  const text = readFileSync(path.join(ROOT, file), "utf8");
  const examples: Example[] = [];

  for (const comment of text.matchAll(/\/\*\*[\s\S]*?\*\//gu)) {
    const startLine = text.slice(0, comment.index).split("\n").length;
    const lines = comment[0].split("\n").map((line) =>
      line
        .replace(/^\s*\/\*\*\s?/u, "")
        .replace(/\s*\*\/$/u, "")
        .replace(/^\s*\* ?/u, "")
        .replaceAll(String.raw`*\/`, "*/"),
    );

    // Keep only lines that belong to @example tags.
    const exampleLines: string[] = [];
    const lineNumbers: number[] = [];
    let inExample = false;
    let inFence = false;
    for (const [offset, line] of lines.entries()) {
      if (/^\s*(?:`{3,}|~{3,})/u.test(line)) inFence = !inFence;
      if (!inFence && /^@\w/u.test(line)) {
        inExample = line.startsWith("@example");
        continue;
      }
      if (inExample) {
        exampleLines.push(line);
        lineNumbers.push(startLine + offset);
      }
    }
    if (exampleLines.length === 0) continue;

    const after = text.slice(comment.index + comment[0].length);
    const nextLine = after.split("\n").find((line) => line.trim() !== "") ?? "";
    const name =
      DECLARATION.exec(nextLine)?.groups?.["name"] ??
      MEMBER.exec(nextLine)?.groups?.["name"] ??
      "example";

    for (const block of extractFences(exampleLines)) {
      examples.push({
        code: block.code,
        label: name,
        line: lineNumbers[block.index] ?? startLine,
        source: file,
      });
    }
  }
  return examples;
}

/** Finds fenced TypeScript blocks in a Markdown file. */
function examplesFromMarkdown(file: string): Example[] {
  const lines = readFileSync(path.join(ROOT, file), "utf8").split("\n");
  return extractFences(lines).map((block) => ({
    code: block.code,
    label: "example",
    line: block.index + 1,
    source: file,
  }));
}

/** Splits leading `import` statements from the rest of a block. */
function splitImports(code: string): { body: string[]; imports: string[] } {
  const imports: string[] = [];
  const body: string[] = [];
  let pending: string[] = [];

  for (const line of code.split("\n")) {
    if (pending.length > 0) {
      pending.push(line);
      if (/\bfrom\s+["'][^"']+["'];?\s*$/u.test(line)) {
        imports.push(pending.join("\n"));
        pending = [];
      }
    } else if (/^import\s/u.test(line)) {
      if (
        /\bfrom\s+["'][^"']+["'];?\s*$|^import\s+["'][^"']+["'];?\s*$/u.test(
          line,
        )
      ) {
        imports.push(line);
      } else {
        pending.push(line);
      }
    } else {
      body.push(line);
    }
  }
  if (pending.length > 0) {
    throw new Error(`Unterminated import statement:\n${pending.join("\n")}`);
  }
  return { body, imports };
}

const RESULT_MARKER = /\/\/\s*=>\s*/u;
const THROWS_MARKER = /\/\/\s*throws\s+/u;

/** Rewrites `// =>` and `// throws` comments into assertions. */
function transformLine(line: string): { usesThrown: boolean; text: string } {
  const indent = /^\s*/u.exec(line)?.[0] ?? "";

  const resultIndex = line.search(RESULT_MARKER);
  if (resultIndex !== -1) {
    const expected = line.slice(resultIndex).replace(RESULT_MARKER, "").trim();
    const left = stripSemicolon(line.slice(0, resultIndex).trim());
    if (expected === "" || left === "") {
      throw new Error(`Malformed "// =>" assertion: ${line.trim()}`);
    }
    const declaration =
      /^(?:const|let|var)\s+(?<name>[\w$]+)\s*(?::[^=]+)?=/u.exec(left);
    if (declaration?.groups) {
      return {
        text: `${indent}${left};\n${indent}expect(${declaration.groups["name"] ?? ""}).toStrictEqual(${expected});`,
        usesThrown: false,
      };
    }
    const logged = /^console\.log\((?<inner>.*)\)$/u.exec(left)?.groups?.[
      "inner"
    ];
    return {
      text: `${indent}expect(${logged ?? left}).toStrictEqual(${expected});`,
      usesThrown: false,
    };
  }

  const throwsIndex = line.search(THROWS_MARKER);
  if (throwsIndex !== -1) {
    const expected = line.slice(throwsIndex).replace(THROWS_MARKER, "").trim();
    const left = stripSemicolon(line.slice(0, throwsIndex).trim());
    const key = /^[A-Z][A-Z0-9_]*$/u.test(expected) ? "code" : "name";
    return {
      text: `${indent}expect(thrownBy(() => ${left})).toMatchObject({ ${key}: ${JSON.stringify(expected)} });`,
      usesThrown: true,
    };
  }

  return { text: line, usesThrown: false };
}

function stripSemicolon(code: string): string {
  return code.endsWith(";") ? code.slice(0, -1).trimEnd() : code;
}

const THROWN_BY_HELPER = `
function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error("Expected the example to throw, but it did not");
}
`;

/** Builds the test file for one example. */
function render(example: Example): string {
  const { body, imports } = splitImports(example.code);
  const transformed = body.map((line) => transformLine(line));
  const usesThrown = transformed.some((result) => result.usesThrown);
  const lines = transformed.map((result) => result.text);
  const isAsync = /\bawait\b/u.test(example.code);
  const title = `${example.source}:${String(example.line)} ${example.label}`;
  const indented = lines
    .join("\n")
    .trim()
    .split("\n")
    .map((line) => (line === "" ? "" : `  ${line}`))
    .join("\n");

  return [
    `// Generated by scripts/doctest.ts from ${example.source}:${String(example.line)}. Do not edit.`,
    `import { expect, test } from "vitest";`,
    ...imports,
    usesThrown ? THROWN_BY_HELPER : "",
    `test(${JSON.stringify(title)}, ${isAsync ? "async " : ""}() => {`,
    indented,
    `});`,
    "",
  ].join("\n");
}

function main(): void {
  const sources = globSync(SOURCE_GLOB, { cwd: ROOT, exclude: SOURCE_IGNORE })
    .map((file) => file.split(path.sep).join("/"))
    .toSorted((a, b) => a.localeCompare(b));

  const examples = [
    ...sources.flatMap((file) => examplesFromSource(file)),
    ...MARKDOWN_FILES.flatMap((file) => examplesFromMarkdown(file)),
  ];

  rmSync(OUT_DIR, { force: true, recursive: true });
  const seen = new Map<string, number>();
  for (const example of examples) {
    const base = path.join(
      example.source.replace(/\.(?:ts|md)$/u, ""),
      example.label,
    );
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    const outFile = path.join(OUT_DIR, `${base}.${String(count)}.test.ts`);
    mkdirSync(path.dirname(outFile), { recursive: true });
    writeFileSync(outFile, render(example));
  }

  console.log(
    `doctest: generated ${String(examples.length)} example tests in .doctest/`,
  );
}

main();
