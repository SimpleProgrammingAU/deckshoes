import { it } from "vitest";

import { standard52 } from "./presets/standard52.ts";
import { seededRandom } from "./random.ts";
import { shuffle } from "./shuffle.ts";

const deck = standard52();

/** Six decks' worth of cards, as many blackjack games deal from. */
const sixDecks = Array.from({ length: 6 }, () => deck).flat();

// The fixture is renamed because the lint rules for Vitest's old top-level
// `bench()` would treat each `bench(...)` here as a test.
it("shuffling 52 cards", async ({ bench: benchmark }) => {
  const seeded = seededRandom(42);
  await benchmark.compare(
    benchmark("secure default", () => {
      shuffle(deck);
    }),
    benchmark("seededRandom", () => {
      shuffle(deck, { random: seeded });
    }),
    benchmark("Math.random", () => {
      shuffle(deck, { random: Math.random });
    }),
  );
});

it("shuffling 312 cards", async ({ bench: benchmark }) => {
  const seeded = seededRandom(42);
  await benchmark.compare(
    benchmark("secure default", () => {
      shuffle(sixDecks);
    }),
    benchmark("seededRandom", () => {
      shuffle(sixDecks, { random: seeded });
    }),
  );
});
