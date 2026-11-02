/** Throws a plain `Error` when an internal invariant fails, which means a bug in deckshoes, not bad input. */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`deckshoes bug: ${message}`);
}
