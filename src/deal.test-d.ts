import { describe, expectTypeOf, it } from "vitest";

import type { CardStack } from "./stack.ts";

import {
  deal,
  type DealOptions,
  type DealResult,
  HandSize,
  PacketSize,
  RunOut,
} from "./deal.ts";
import { standard52 } from "./presets/standard52.ts";

describe("DealResult", () => {
  it("names an array of hands and a remainder, none of which can be changed", () => {
    expectTypeOf<DealResult<number>>().toEqualTypeOf<{
      readonly hands: readonly CardStack<number>[];
      readonly remainder: CardStack<number>;
    }>();
    expectTypeOf<DealResult["hands"]>().not.toHaveProperty("push");
    expectTypeOf<DealResult["hands"][number]>().not.toHaveProperty("push");
    expectTypeOf<DealResult["remainder"]>().not.toHaveProperty("push");
  });
});

describe("the named values", () => {
  it("are readonly constants holding their strings", () => {
    expectTypeOf(HandSize).toEqualTypeOf<{ readonly MAXIMIZE: "maximize" }>();
    expectTypeOf(PacketSize).toEqualTypeOf<{ readonly HAND: "hand" }>();
    expectTypeOf(RunOut).toEqualTypeOf<{
      readonly STOP: "stop";
      readonly THROW: "throw";
    }>();
  });

  it("have types of the same name covering what each parameter takes", () => {
    expectTypeOf<HandSize>().toEqualTypeOf<number | "maximize">();
    expectTypeOf<PacketSize>().toEqualTypeOf<number | "hand">();
    expectTypeOf<RunOut>().toEqualTypeOf<"stop" | "throw">();
  });
});

describe("deal", () => {
  it("deals the same kind of card", () => {
    expectTypeOf(deal(standard52(), 4, 13)).toEqualTypeOf<DealResult>();
    expectTypeOf(deal([1, 2, 3], 3, 1)).toEqualTypeOf<DealResult<number>>();
    expectTypeOf(deal(["a", "b"] as const, 2, 1)).toEqualTypeOf<
      DealResult<"a" | "b">
    >();
  });

  it("takes a hand size or HandSize.MAXIMIZE, and options or none", () => {
    expectTypeOf(deal).toBeCallableWith(standard52(), 4, 13);
    expectTypeOf(deal).toBeCallableWith(standard52(), 4, HandSize.MAXIMIZE);
    expectTypeOf(deal).toBeCallableWith(standard52(), 4, 13, undefined);
    expectTypeOf(deal).toBeCallableWith(standard52(), 4, 13, {});
    expectTypeOf(deal).toBeCallableWith([...standard52()], 4, 13);
  });

  it("takes a packet size or PacketSize.HAND, and RunOut, each or undefined", () => {
    expectTypeOf<DealOptions>().toEqualTypeOf<{
      readonly packetSize?: PacketSize | undefined;
      readonly runOut?: RunOut | undefined;
    }>();
    expectTypeOf(deal).toBeCallableWith(standard52(), 4, 5, {
      packetSize: 3,
      runOut: RunOut.STOP,
    });
    expectTypeOf(deal).toBeCallableWith(standard52(), 4, 5, {
      packetSize: PacketSize.HAND,
      runOut: RunOut.THROW,
    });
    expectTypeOf(deal).toBeCallableWith(standard52(), 4, 5, {
      packetSize: undefined,
      runOut: undefined,
    });
  });

  it("rejects a named value in the wrong place, settings that don't exist, counts in options, and a string as the deck", () => {
    // @ts-expect-error PacketSize.HAND is a packet size, not a hand size.
    expectTypeOf(deal).toBeCallableWith(standard52(), 4, PacketSize.HAND);
    expectTypeOf(deal).toBeCallableWith(standard52(), 4, 5, {
      // @ts-expect-error HandSize.MAXIMIZE is a hand size, not a packet size.
      packetSize: HandSize.MAXIMIZE,
    });
    expectTypeOf(deal).toBeCallableWith(standard52(), 4, 5, {
      // @ts-expect-error Reshuffling isn't a setting (#29).
      runOut: "reshuffle",
    });
    // @ts-expect-error Counts stay positional (ADR 0009).
    expectTypeOf(deal).toBeCallableWith(standard52(), { handCount: 4 }, 5);
    // @ts-expect-error A count is a number.
    expectTypeOf(deal).toBeCallableWith(standard52(), "4", 5);
    // @ts-expect-error A stack is an array of cards, not a string of them.
    expectTypeOf(deal).toBeCallableWith("AS KH", 1, 1);
  });
});
