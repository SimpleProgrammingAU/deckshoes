---
"deckshoes": minor
---

Add `chain(stack)`. It wraps a stack so that stack operations can be written as a pipeline, such as `chain(standard52()).shuffle({ random }).value()`. Its methods have the same names as the functions and give the same results, and `.value()` returns the stack. A stack that isn't an array throws `InvalidArgumentError`. Importing `chain` brings in every stack operation, so call the functions when bundle size matters.

The docs for `InvalidArgumentError` now mention a stack that isn't an array.
