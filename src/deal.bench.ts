import { it } from "vitest";

import { deal, PacketSize } from "./deal.ts";
import { standard52 } from "./presets/standard52.ts";

const deck = standard52();

/** Six decks' worth of cards, as many blackjack games deal from. */
const sixDecks = Array.from({ length: 6 }, () => deck).flat();

// The fixture is renamed because the lint rules for Vitest's old top-level
// `bench()` would treat each `bench(...)` here as a test.
it("dealing 52 cards into 4 hands of 13", async ({ bench: benchmark }) => {
  await benchmark.compare(
    benchmark("round-robin", () => {
      deal(deck, 4, 13);
    }),
    benchmark("packets of 3", () => {
      deal(deck, 4, 13, { packetSize: 3 });
    }),
    benchmark("PacketSize.HAND", () => {
      deal(deck, 4, 13, { packetSize: PacketSize.HAND });
    }),
  );
});

it("dealing 7 hands of 2 from 312 cards", async ({ bench: benchmark }) => {
  await benchmark.compare(
    benchmark("round-robin", () => {
      deal(sixDecks, 7, 2);
    }),
    benchmark("PacketSize.HAND", () => {
      deal(sixDecks, 7, 2, { packetSize: PacketSize.HAND });
    }),
  );
});
