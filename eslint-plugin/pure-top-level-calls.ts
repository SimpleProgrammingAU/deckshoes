import type { Rule, SourceCode } from "eslint";

/** A syntax node, as ESLint's ancestor lists type it. */
type Node = ReturnType<SourceCode["getAncestors"]>[number];

/** A call or `new` anywhere in a top-level variable or class declaration, exported or not. */
const TOP_LEVEL_CALL =
  ":matches(Program, Program > ExportNamedDeclaration) > :matches(VariableDeclaration, ClassDeclaration) :matches(CallExpression, NewExpression)";

/** TypeScript syntax that only adds a type, so a call inside it is still the value. */
const TYPE_WRAPPERS = new Set([
  "TSAsExpression",
  "TSNonNullExpression",
  "TSSatisfiesExpression",
  "TSTypeAssertion",
]);

/** Where a call is left out: in a function, which runs later, or a static block. */
const LEFT_OUT = new Set([
  "ArrowFunctionExpression",
  "FunctionExpression",
  "StaticBlock",
]);

/** Operators that convert their operand to a number, which can run the operand's own code. */
const CONVERTING_UNARY = new Set(["+", "-", "~"]);

/** The text of a pure mark's comment. Bundlers also read `#__PURE__`, but the repo writes only this form. */
const PURE_MARK = /^\s*@__PURE__\s*$/u;

/**
 * Whether the rule leaves a call out: one in a function or an instance
 * field, which runs later, or one in a static block.
 */
function leftOut(node: Rule.Node, ancestors: Node[]): boolean {
  let child: Node = node;
  for (const ancestor of ancestors.toReversed()) {
    if (LEFT_OUT.has(ancestor.type)) return true;
    if (
      ancestor.type === "PropertyDefinition" &&
      ancestor.value === child &&
      !ancestor.static
    ) {
      return true;
    }
    child = ancestor;
  }
  return false;
}

/**
 * Whether a call's result is read where it's made: by a property access,
 * destructuring, spreading, or conversion to a string or number. A bundler
 * keeps such a call even when it's marked.
 */
function resultRead(node: Rule.Node, ancestors: Node[]): boolean {
  let child: Node = node;
  for (const parent of ancestors.toReversed()) {
    if (TYPE_WRAPPERS.has(parent.type)) {
      child = parent;
      continue;
    }
    if (parent.type === "MemberExpression") return parent.object === child;
    if (parent.type === "VariableDeclarator") {
      return parent.id.type !== "Identifier";
    }
    if (parent.type === "BinaryExpression") {
      return parent.operator !== "===" && parent.operator !== "!==";
    }
    if (parent.type === "UnaryExpression") {
      return CONVERTING_UNARY.has(parent.operator);
    }
    return parent.type === "SpreadElement" || parent.type === "TemplateLiteral";
  }
  return false;
}

/**
 * Keeps a bundler able to drop a top-level variable or class nobody imports
 * (ADR 0010). A bundler can't tell that a call does nothing else, so it keeps
 * one that runs when the module loads unless the call is marked `@__PURE__`.
 * For every call and `new` in a top-level variable or class declaration, the
 * rule requires that:
 *
 * - It has its own mark. A mark covers only the call it's on, so in a marked
 *   `Object.freeze({ X: f() })`, `f()` still needs one.
 * - Its result isn't read where it's made, by a property access,
 *   destructuring, spreading, or conversion to a string or number. A bundler
 *   keeps such a call even when it's marked, so the rule asks for the result
 *   to be stored whole and read where it's used.
 *
 * Left out:
 *
 * - Calls in a function, or in an instance field's value. They run later, not
 *   when the module loads.
 * - Class static blocks. `DeckshoesError`'s exists to set the brand, and a
 *   mark would let a bundler drop it.
 * - Top-level statements that aren't declarations, such as `f();`. They have
 *   no value for a bundler to drop, so they're there to run.
 * - Tagged templates, and property reads on anything but a call. A bundler
 *   reads the mark only on a call or `new`, and `src/` has neither at the top
 *   level outside a static block.
 */
export const pureTopLevelCalls: Rule.RuleModule = {
  create(context) {
    const { sourceCode } = context;

    /** Reports a call or `new` that runs when the module loads and that a bundler would keep. */
    function check(node: Rule.Node): void {
      const ancestors = sourceCode.getAncestors(node);
      if (leftOut(node, ancestors)) return;
      const data = { kind: node.type === "NewExpression" ? "`new`" : "call" };
      if (resultRead(node, ancestors)) {
        context.report({ data, messageId: "resultRead", node });
        return;
      }
      const marked = sourceCode
        .getCommentsBefore(node)
        .some(
          (comment) =>
            comment.type === "Block" && PURE_MARK.test(comment.value),
        );
      if (!marked) context.report({ data, messageId: "unmarked", node });
    }

    return { [TOP_LEVEL_CALL]: check };
  },
  meta: {
    docs: {
      description:
        "Require /* @__PURE__ */ on every call and `new` that a top-level variable or class runs when the module loads, and keep their results whole.",
    },
    messages: {
      resultRead:
        "A bundler keeps a top-level {{kind}} whose result is read where it's made, even when it's marked /* @__PURE__ */, so the constant ships in every bundle, imported or not. Store the whole result, and read it inside the function that needs it (ADR 0010).",
      unmarked:
        "Mark this {{kind}} /* @__PURE__ */. A bundler can't tell that a top-level {{kind}} does nothing else, so without the mark it keeps the constant in every bundle, imported or not. A mark covers only its own call, so a nested one needs its own (ADR 0010).",
    },
    schema: [],
    type: "problem",
  },
};
