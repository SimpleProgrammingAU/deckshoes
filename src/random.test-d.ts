import { describe, expectTypeOf, it } from "vitest";

import { type RandomSource, seededRandom } from "./random.ts";

describe("RandomSource", () => {
  it("is a function returning a number, the shape of Math.random", () => {
    expectTypeOf<RandomSource>().toEqualTypeOf<() => number>();
    expectTypeOf(Math.random).toExtend<RandomSource>();
    expectTypeOf(seededRandom(1)).toExtend<RandomSource>();
  });

  it("isn't a function returning anything else", () => {
    expectTypeOf<() => string>().not.toExtend<RandomSource>();
    expectTypeOf<() => bigint>().not.toExtend<RandomSource>();
  });
});

describe("seededRandom", () => {
  it("takes a number and returns a random source", () => {
    expectTypeOf(seededRandom).parameters.toEqualTypeOf<[number]>();
    expectTypeOf(seededRandom).returns.toEqualTypeOf<RandomSource>();
  });
});
