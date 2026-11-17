import type { Rule } from "eslint";

/** A call or `new` anywhere in a top-level variable declaration, exported or not. */
const TOP_LEVEL_CALL =
  ":matches(Program, Program > ExportNamedDeclaration) > VariableDeclaration :matches(CallExpression, NewExpression)";

/** Nodes whose bodies run later, not when the module loads. */
const DEFERRED = new Set([
  "ArrowFunctionExpression",
  "ClassExpression",
  "FunctionExpression",
]);

/** The text of a pure mark's comment. Bundlers also read `#__PURE__`, but the repo writes only this form. */
const PURE_MARK = /^\s*@__PURE__\s*$/u;

/**
 * Requires a `@__PURE__` mark on every call and `new` that a top-level
 * variable runs when the module loads, nested ones included (ADR 0010). A
 * bundler can't tell that such a call does nothing else, so without the mark
 * it keeps the variable in every bundle, imported or not. A mark covers only
 * the call it's on: in a marked `Object.freeze({ X: f() })`, `f()` still needs
 * its own.
 *
 * Left out:
 *
 * - Calls in a function or class body. They run when it's called, not when
 *   the module loads.
 * - Top-level statements that aren't declarations, such as `f();`. They have
 *   no value for a bundler to drop, so they're there to run.
 * - Class static blocks and fields. `DeckshoesError`'s static block exists to
 *   set the brand, and a mark would let a bundler drop it.
 * - Tagged templates and property reads. A bundler reads the mark only on a
 *   call or `new`, and `src/` has neither at the top level.
 */
export const pureTopLevelCalls: Rule.RuleModule = {
  create(context) {
    const { sourceCode } = context;

    /** Reports a call or `new` that runs when the module loads and has no mark. */
    function check(node: Rule.Node): void {
      const deferred = sourceCode
        .getAncestors(node)
        .some((ancestor) => DEFERRED.has(ancestor.type));
      if (deferred) return;
      const marked = sourceCode
        .getCommentsBefore(node)
        .some(
          (comment) =>
            comment.type === "Block" && PURE_MARK.test(comment.value),
        );
      if (marked) return;
      context.report({
        data: { kind: node.type === "NewExpression" ? "`new`" : "call" },
        messageId: "unmarked",
        node,
      });
    }

    return { [TOP_LEVEL_CALL]: check };
  },
  meta: {
    docs: {
      description:
        "Require /* @__PURE__ */ on every call and `new` that a top-level variable runs when the module loads.",
    },
    messages: {
      unmarked:
        "Mark this {{kind}} /* @__PURE__ */. A bundler can't tell that a top-level {{kind}} does nothing else, so without the mark it keeps the constant in every bundle, imported or not. A mark covers only its own call, so a nested one needs its own (ADR 0010).",
    },
    schema: [],
    type: "problem",
  },
};
