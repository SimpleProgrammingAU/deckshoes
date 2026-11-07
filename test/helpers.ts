import type { Card } from "../src/card.ts";

/** Returns what `run` throws, failing the test if it doesn't throw. */
export function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error("Expected a throw, but nothing was thrown");
}

/** Writes a card as its rank and suit, such as "10H", to compare whole stacks. */
export function short({ rank, suit }: Card): string {
  return `${rank}${suit}`;
}
