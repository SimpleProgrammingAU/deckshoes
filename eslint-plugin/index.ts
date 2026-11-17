import type { ESLint } from "eslint";

import { pureTopLevelCalls } from "./pure-top-level-calls.ts";

/** deckshoes's own lint rules: the ones a selector in `eslint.config.ts` can't express. */
const plugin: ESLint.Plugin = {
  meta: { name: "deckshoes" },
  rules: { "pure-top-level-calls": pureTopLevelCalls },
};

export default plugin;
