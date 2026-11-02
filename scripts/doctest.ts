/**
 * Turns code examples into Vitest tests so every example in the docs is
 * type-checked and run.
 *
 * Sources:
 * - fenced `ts` blocks inside `@example` tags in `src/**\/*.ts`
 * - fenced `ts` blocks in the Markdown files listed in `MARKDOWN_FILES`
 *
 * Each block becomes one file under `.doctest/`. Imports are hoisted to the top
 * of the file and the rest of the block runs inside a `test()`. A comment at
 * the end of a statement (which may span several lines) turns it into an
 * assertion:
 *
 * - `expr; // => value`  →  `expect(expr).toStrictEqual(value)`
 * - `const x = expr; // => value`  →  the declaration, then `expect(x)…`
 * - `console.log(expr); // => value`  →  `expect(expr)…`
 * - `expr; // throws CODE_OR_NAME`  →  asserts the thrown error's `code`
 *   (for `UPPER_SNAKE` values) or `name` (anything else). With `await` in
 *   `expr`, it asserts the rejection instead.
 *
 * Add `no-test` to a fence's info string (```ts no-test) to skip a block.
 *
 * Run with `node scripts/doctest.ts`; `pnpm test` and `pnpm typecheck` do this
 * for you, and `pnpm test:watch` reruns it when a source file changes.
 */
import {
  existsSync,
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
  /** The code inside the fence, one entry per line. */
  lines: string[];
  /** 1-based line of the opening fence in the source file. */
  line: number;
  /** Human-readable label, such as the documented symbol's name. */
  label: string;
  /** Source file, relative to the repo root, using `/` separators. */
  source: string;
}

/** A problem in an example, reported with its location. */
class ExampleError extends Error {
  override readonly name = "ExampleError";
}

// ---------------------------------------------------------------------------
// Finding examples
// ---------------------------------------------------------------------------

interface Fence {
  char: string;
  length: number;
  info: string;
}

/** Returns the fence a line opens, if it opens one. */
function openingFence(line: string): Fence | undefined {
  const match = /^\s*(?<fence>`{3,}|~{3,})\s*(?<info>.*)$/u.exec(line);
  const fence = match?.groups?.["fence"];
  if (fence === undefined) return undefined;
  return {
    char: fence.charAt(0),
    info: match?.groups?.["info"] ?? "",
    length: fence.length,
  };
}

/** Whether a line closes `fence`: the same character, at least as many, nothing else. */
function closesFence(line: string, fence: Fence): boolean {
  const trimmed = line.trim();
  return (
    trimmed.length >= fence.length && trimmed.replaceAll(fence.char, "") === ""
  );
}

const TS_LANGS = new Set(["mts", "ts", "typescript"]);

/**
 * Pulls fenced blocks out of Markdown-ish lines. Returns the TypeScript blocks
 * to test, and how many fences there were in total.
 */
function extractFences(
  lines: readonly string[],
  where: (index: number) => string,
): { blocks: { code: string[]; index: number }[]; fences: number } {
  const blocks: { code: string[]; index: number }[] = [];
  let fences = 0;
  let open: (Fence & { index: number; test: boolean }) | undefined;
  let body: string[] = [];

  for (const [index, line] of lines.entries()) {
    if (open) {
      if (closesFence(line, open)) {
        if (open.test) blocks.push({ code: body, index: open.index });
        open = undefined;
        body = [];
      } else {
        body.push(line);
      }
      continue;
    }
    const fence = openingFence(line);
    if (fence) {
      fences += 1;
      const words = fence.info.split(/\s+/u);
      open = {
        ...fence,
        index,
        test:
          TS_LANGS.has((words[0] ?? "").toLowerCase()) &&
          !words.includes("no-test"),
      };
    }
  }
  if (open) {
    throw new ExampleError(`${where(open.index)}: code fence is never closed`);
  }
  return { blocks, fences };
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

    // Group the lines of each @example tag, skipping tag-like lines in fences.
    const tags: { lines: string[]; numbers: number[] }[] = [];
    let current: { lines: string[]; numbers: number[] } | undefined;
    let fence: Fence | undefined;
    for (const [offset, line] of lines.entries()) {
      if (fence) {
        if (closesFence(line, fence)) fence = undefined;
      } else {
        fence = openingFence(line);
        if (!fence && /^@\w/u.test(line)) {
          current = line.startsWith("@example")
            ? { lines: [], numbers: [] }
            : undefined;
          if (current) tags.push(current);
          continue;
        }
      }
      current?.lines.push(line);
      current?.numbers.push(startLine + offset);
    }
    if (tags.length === 0) continue;

    const after = text.slice(comment.index + comment[0].length);
    const nextLine = after.split("\n").find((line) => line.trim() !== "") ?? "";
    const label =
      DECLARATION.exec(nextLine)?.groups?.["name"] ??
      MEMBER.exec(nextLine)?.groups?.["name"] ??
      "example";

    for (const tag of tags) {
      const where = (index: number): string =>
        `${file}:${String(tag.numbers[index] ?? startLine)}`;
      const { blocks, fences } = extractFences(tag.lines, where);
      if (fences === 0) {
        throw new ExampleError(
          `${where(0)}: @example for ${label} has no fenced code block`,
        );
      }
      for (const block of blocks) {
        examples.push({
          label,
          line: tag.numbers[block.index] ?? startLine,
          lines: block.code,
          source: file,
        });
      }
    }
  }
  return examples;
}

/** Finds fenced TypeScript blocks in a Markdown file. */
function examplesFromMarkdown(file: string): Example[] {
  const lines = readFileSync(path.join(ROOT, file), "utf8").split("\n");
  const where = (index: number): string => `${file}:${String(index + 1)}`;
  return extractFences(lines, where).blocks.map((block) => ({
    label: "example",
    line: block.index + 1,
    lines: block.code,
    source: file,
  }));
}

// ---------------------------------------------------------------------------
// Turning an example into a test
// ---------------------------------------------------------------------------

/** Splits `import` statements from the rest of a block, keeping line positions. */
function splitImports(lines: readonly string[]): {
  body: { index: number; text: string }[];
  imports: string[];
} {
  const imports: string[] = [];
  const body: { index: number; text: string }[] = [];
  let pending: string[] = [];
  const ends = /\bfrom\s+["'][^"']+["'];?\s*$|^import\s+["'][^"']+["'];?\s*$/u;

  for (const [index, line] of lines.entries()) {
    if (pending.length > 0 || /^import\s/u.test(line)) {
      pending.push(line);
      if (ends.test(line)) {
        imports.push(pending.join("\n"));
        pending = [];
      }
    } else {
      body.push({ index, text: line });
    }
  }
  if (pending.length > 0) {
    throw new ExampleError(
      `Unterminated import statement:\n${pending.join("\n")}`,
    );
  }
  return { body, imports };
}

interface ScanState {
  blockComment: boolean;
  depth: number;
  quote: string | undefined;
}

/**
 * Scans one line of code, updating bracket depth and string/comment state.
 * Returns where a `//` comment starts, or -1.
 */
function scanLine(line: string, state: ScanState): number {
  for (let index = 0; index < line.length; index += 1) {
    const char = line.charAt(index);
    const next = line.charAt(index + 1);
    if (state.blockComment) {
      if (char === "*" && next === "/") {
        state.blockComment = false;
        index += 1;
      }
    } else if (state.quote !== undefined) {
      if (char === "\\") index += 1;
      else if (char === state.quote) state.quote = undefined;
    } else if (char === "/" && next === "/") {
      return index;
    } else if (char === "/" && next === "*") {
      state.blockComment = true;
      index += 1;
    } else if (char === "'" || char === '"' || char === "`") {
      state.quote = char;
    } else if ("([{".includes(char)) {
      state.depth += 1;
    } else if (")]}".includes(char)) {
      state.depth -= 1;
    }
  }
  // Only template literals can span lines.
  if (state.quote !== "`") state.quote = undefined;
  return -1;
}

/** Code ending like this continues on the next line. */
const CONTINUES_AFTER = /(?:=>|&&|\|\||\?\?|(?<![+-])[+-]|[=,?:([{.*%&|])\s*$/u;
/** Code starting like this continues the previous line. */
const CONTINUES_BEFORE = /^\s*(?:\.(?!\.\.)|\?\.|\?\?|\|\||&&|=>|[?:)\]}])/u;

type Assertion =
  { expected: string; kind: "result" } | { expected: string; kind: "throws" };

function parseAssertion(comment: string): Assertion | undefined {
  const result = /^\/\/\s*=>\s*(?<expected>.*)$/u.exec(comment);
  if (result) {
    return {
      expected: result.groups?.["expected"]?.trim() ?? "",
      kind: "result",
    };
  }
  const throws = /^\/\/\s*throws\b\s*(?<expected>.*)$/u.exec(comment);
  return throws
    ? { expected: throws.groups?.["expected"]?.trim() ?? "", kind: "throws" }
    : undefined;
}

function stripSemicolon(code: string): string {
  return code.endsWith(";") ? code.slice(0, -1).trimEnd() : code;
}

const HELPERS = {
  rejectionOf: `
async function rejectionOf(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error("Expected the example to reject, but it resolved");
}`,
  thrownBy: `
function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error("Expected the example to throw, but it did not");
}`,
} as const;

type Helper = keyof typeof HELPERS;

/** Writes the assertion for one statement. */
function renderAssertion(
  statement: string,
  assertion: Assertion,
  where: string,
  helpers: Set<Helper>,
): string {
  const marker = assertion.kind === "result" ? "// =>" : "// throws";
  if (statement === "" || assertion.expected === "") {
    throw new ExampleError(
      `${where}: "${marker}" needs code before it and an expected value after it`,
    );
  }
  const declaration =
    /^(?:const|let|var)\s+(?<name>[\w$]+)\s*(?::[^=]+)?=/u.exec(statement)
      ?.groups?.["name"];

  if (assertion.kind === "result") {
    if (declaration !== undefined) {
      return `${statement};\nexpect(${declaration}).toStrictEqual(${assertion.expected});`;
    }
    const logged = /^console\.log\((?<inner>[\s\S]*)\)$/u.exec(statement)
      ?.groups?.["inner"];
    return `expect(${logged ?? statement}).toStrictEqual(${assertion.expected});`;
  }

  if (declaration !== undefined) {
    throw new ExampleError(
      `${where}: "// throws" goes on an expression, not a declaration`,
    );
  }
  const key = /^[A-Z][A-Z0-9_]*$/u.test(assertion.expected) ? "code" : "name";
  const match = `{ ${key}: ${JSON.stringify(assertion.expected)} }`;
  if (/\bawait\b/u.test(statement)) {
    helpers.add("rejectionOf");
    return `expect(await rejectionOf(async () => (${statement}))).toMatchObject(${match});`;
  }
  helpers.add("thrownBy");
  return `expect(thrownBy(() => (${statement}))).toMatchObject(${match});`;
}

/** Rewrites `// =>` and `// throws` comments into assertions. */
function transformBody(
  body: readonly { index: number; text: string }[],
  where: (index: number) => string,
  helpers: Set<Helper>,
): string[] {
  const out: string[] = [];
  const state: ScanState = { blockComment: false, depth: 0, quote: undefined };
  let statement: string[] = [];

  const nextCode = (from: number): string =>
    body
      .slice(from + 1)
      .map((line) => line.text)
      .find(
        (text) => text.trim() !== "" && !text.trimStart().startsWith("//"),
      ) ?? "";

  for (const [position, { index, text }] of body.entries()) {
    const commentAt = scanLine(text, state);
    const code = commentAt === -1 ? text : text.slice(0, commentAt);
    const assertion =
      commentAt === -1 ? undefined : parseAssertion(text.slice(commentAt));

    if (assertion) {
      if (
        state.depth !== 0 ||
        state.quote !== undefined ||
        state.blockComment
      ) {
        throw new ExampleError(
          `${where(index)}: put "// =>" or "// throws" on the last line of a statement`,
        );
      }
      const full = stripSemicolon([...statement, code].join("\n").trim());
      out.push(renderAssertion(full, assertion, where(index), helpers));
      statement = [];
      continue;
    }

    statement.push(text);
    const continues =
      state.depth > 0 ||
      state.quote !== undefined ||
      state.blockComment ||
      (code.trim() !== "" && CONTINUES_AFTER.test(code)) ||
      CONTINUES_BEFORE.test(nextCode(position));
    if (!continues) {
      out.push(...statement);
      statement = [];
    }
  }
  out.push(...statement);
  return out;
}

/** Builds the test file for one example. */
function render(example: Example): string {
  const { body, imports } = splitImports(example.lines);
  const where = (index: number): string =>
    `${example.source}:${String(example.line + 1 + index)}`;
  const helpers = new Set<Helper>();
  const code = transformBody(body, where, helpers).join("\n").trim();
  const title = `${example.source}:${String(example.line)} ${example.label}`;

  return [
    `// Generated by scripts/doctest.ts from ${example.source}:${String(example.line)}. Do not edit.`,
    `import { expect, test } from "vitest";`,
    ...imports,
    ...[...helpers]
      .toSorted((a, b) => a.localeCompare(b))
      .map((helper) => HELPERS[helper]),
    "",
    `test(${JSON.stringify(title)}, ${/\bawait\b/u.test(code) ? "async " : ""}() => {`,
    code,
    `});`,
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Writing the tests
// ---------------------------------------------------------------------------

function main(): void {
  const sources = globSync(SOURCE_GLOB, { cwd: ROOT, exclude: SOURCE_IGNORE })
    .map((file) => file.split(path.sep).join("/"))
    .toSorted((a, b) => a.localeCompare(b));

  const examples = [
    ...sources.flatMap((file) => examplesFromSource(file)),
    ...MARKDOWN_FILES.flatMap((file) => examplesFromMarkdown(file)),
  ];

  // Numbered case-insensitively, so `Card` and `card` don't share a file on
  // case-insensitive file systems (macOS, Windows).
  const wanted = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const example of examples) {
    const base = path.join(
      example.source.replace(/\.(?:ts|md)$/u, ""),
      example.label,
    );
    const count = (counts.get(base.toLowerCase()) ?? 0) + 1;
    counts.set(base.toLowerCase(), count);
    wanted.set(
      path.join(OUT_DIR, `${base}.${String(count)}.test.ts`),
      render(example),
    );
  }

  // Only touch files that changed, so watch mode reruns just those tests.
  let removed = 0;
  let written = 0;
  if (existsSync(OUT_DIR)) {
    for (const file of globSync("**/*.test.ts", { cwd: OUT_DIR })) {
      const full = path.join(OUT_DIR, file);
      if (!wanted.has(full)) {
        rmSync(full);
        removed += 1;
      }
    }
  }
  for (const [file, content] of wanted) {
    if (existsSync(file) && readFileSync(file, "utf8") === content) continue;
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
    written += 1;
  }

  console.log(
    `doctest: ${String(examples.length)} examples (${String(written)} written, ${String(removed)} removed)`,
  );
}

try {
  main();
} catch (error) {
  if (!(error instanceof ExampleError)) throw error;
  console.error(`doctest: ${error.message}`);
  process.exitCode = 1;
}
