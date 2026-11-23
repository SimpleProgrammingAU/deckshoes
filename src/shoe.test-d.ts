import { describe, expectTypeOf, it } from "vitest";

import type { Card } from "./card.ts";
import type { RandomSource } from "./random.ts";
import type { CardStack } from "./stack.ts";

import { HandSize, PacketSize, RunOut } from "./deal.ts";
import { pinochle } from "./presets/pinochle.ts";
import { standard52 } from "./presets/standard52.ts";
import { seededRandom } from "./random.ts";
import {
  burn,
  dealFromShoe,
  drawFromShoe,
  type Shoe,
  shoe,
  type ShoeDealResult,
  type ShoeDrawResult,
  type ShoeOptions,
} from "./shoe.ts";

describe("Shoe", () => {
  it("holds stacks that can't be changed and the cut card's position", () => {
    expectTypeOf<Shoe<number>>().toEqualTypeOf<{
      readonly cards: CardStack<number>;
      readonly cutCard: number;
      readonly discardPile: CardStack<number>;
    }>();
    expectTypeOf<Shoe["cards"]>().toEqualTypeOf<readonly Card[]>();
    expectTypeOf<Shoe["cards"]>().not.toHaveProperty("push");
    expectTypeOf<Shoe["discardPile"]>().toEqualTypeOf<readonly Card[]>();
    expectTypeOf<Shoe["discardPile"]>().not.toHaveProperty("push");
  });

  it("can be written by hand, with a discard pile", () => {
    const threeCards: Shoe = {
      cards: standard52().slice(0, 3),
      cutCard: 2,
      discardPile: [],
    };
    expectTypeOf(drawFromShoe(threeCards)).toEqualTypeOf<ShoeDrawResult>();
    // @ts-expect-error a shoe written in TypeScript needs its discard pile
    const noPile: Shoe = { cards: standard52().slice(0, 3), cutCard: 2 };
    expectTypeOf(noPile).toEqualTypeOf<Shoe>();
  });
});

describe("ShoeOptions", () => {
  it("has an optional penetration and random source, which can be undefined", () => {
    expectTypeOf<ShoeOptions>().toEqualTypeOf<{
      readonly penetration?: number | undefined;
      readonly random?: RandomSource | undefined;
    }>();
  });
});

describe("ShoeDrawResult and ShoeDealResult", () => {
  it("name stacks that can't be changed and a shoe", () => {
    expectTypeOf<ShoeDrawResult<number>>().toEqualTypeOf<{
      readonly cards: CardStack<number>;
      readonly shoe: Shoe<number>;
    }>();
    expectTypeOf<ShoeDealResult<number>>().toEqualTypeOf<{
      readonly hands: readonly CardStack<number>[];
      readonly shoe: Shoe<number>;
    }>();
    expectTypeOf<ShoeDealResult["hands"]>().not.toHaveProperty("push");
  });
});

describe("shoe", () => {
  it("holds the same kind of card as the deck", () => {
    expectTypeOf(shoe(standard52(), 6)).toEqualTypeOf<Shoe>();
    expectTypeOf(shoe(pinochle(), 2)).toEqualTypeOf<Shoe>();
    expectTypeOf(shoe([1, 2, 3], 2)).toEqualTypeOf<Shoe<number>>();
    expectTypeOf(shoe(["a", "b"] as const, 2)).toEqualTypeOf<Shoe<"a" | "b">>();
  });

  it("takes a deck count, and options that are all optional", () => {
    expectTypeOf(shoe).toBeCallableWith(standard52(), 6);
    expectTypeOf(shoe).toBeCallableWith(standard52(), 6, {});
    expectTypeOf(shoe).toBeCallableWith(standard52(), 6, { penetration: 0.5 });
    expectTypeOf(shoe).toBeCallableWith(standard52(), 6, {
      penetration: undefined,
      random: seededRandom(42),
    });
    // @ts-expect-error the deck count is required
    shoe(standard52());
    // @ts-expect-error penetration is a number
    shoe(standard52(), 6, { penetration: "0.75" });
  });
});

describe("drawFromShoe and dealFromShoe", () => {
  it("give the same kind of card as the shoe", () => {
    const sixDecks = shoe(standard52(), 6);
    expectTypeOf(drawFromShoe(sixDecks, 2)).toEqualTypeOf<ShoeDrawResult>();
    expectTypeOf(dealFromShoe(sixDecks, 4, 2)).toEqualTypeOf<ShoeDealResult>();
    const numbers = shoe([1, 2, 3], 2);
    expectTypeOf(drawFromShoe(numbers)).toEqualTypeOf<ShoeDrawResult<number>>();
    expectTypeOf(dealFromShoe(numbers, 2, 1)).toEqualTypeOf<
      ShoeDealResult<number>
    >();
  });

  it("take what draw and deal take", () => {
    const sixDecks = shoe(standard52(), 6);
    expectTypeOf(drawFromShoe).toBeCallableWith(sixDecks);
    expectTypeOf(drawFromShoe).toBeCallableWith(sixDecks, undefined);
    expectTypeOf(dealFromShoe).toBeCallableWith(sixDecks, 4, HandSize.MAXIMIZE);
    expectTypeOf(dealFromShoe).toBeCallableWith(sixDecks, 4, 2, {
      packetSize: PacketSize.HAND,
      runOut: RunOut.STOP,
    });
  });

  it("don't take a stack", () => {
    // @ts-expect-error a stack isn't a shoe
    expectTypeOf(drawFromShoe).toBeCallableWith(standard52());
    // @ts-expect-error a stack isn't a shoe
    expectTypeOf(dealFromShoe).toBeCallableWith(standard52(), 4, 2);
  });
});

describe("burn", () => {
  it("gives back a shoe of the same kind of card", () => {
    expectTypeOf(burn(shoe(standard52(), 6))).toEqualTypeOf<Shoe>();
    expectTypeOf(burn(shoe([1, 2, 3], 2), 2)).toEqualTypeOf<Shoe<number>>();
  });

  it("takes an optional count, and no stack", () => {
    const sixDecks = shoe(standard52(), 6);
    expectTypeOf(burn).toBeCallableWith(sixDecks, undefined);
    // @ts-expect-error a count is a number
    expectTypeOf(burn).toBeCallableWith(sixDecks, "1");
    // @ts-expect-error a stack isn't a shoe
    expectTypeOf(burn).toBeCallableWith(standard52());
  });
});
