import { describe, expect, it } from "vitest";

import { placesIn, suitPlacesIn } from "./order.ts";

describe("placesIn", () => {
  it("places each entry, lowest first, whatever the entries are", () => {
    expect(placesIn([], "rank")).toStrictEqual(new Map());
    expect(placesIn(["A", "K"], "rank")).toStrictEqual(
      new Map([
        ["A", 0],
        ["K", 1],
      ]),
    );
    expect(placesIn([1, "1", null, false], "suit")).toStrictEqual(
      new Map<unknown, number>([
        [1, 0],
        ["1", 1],
        [null, 2],
        [false, 3],
      ]),
    );
  });

  it("names the order and shows its built-in when it isn't an array", () => {
    expect(placesIn("AKQ", "rank")).toMatchObject({
      code: "INVALID_ARGUMENT",
      message:
        'Invalid rank order "AKQ": expected an array of ranks from lowest to highest, such as RankOrder.ACE_HIGH',
    });
    expect(placesIn(null, "suit")).toMatchObject({
      message:
        "Invalid suit order null: expected an array of suits from lowest to highest, such as SuitOrder.BRIDGE",
    });
  });

  it("names an entry listed twice, matching as SameValueZero does", () => {
    expect(placesIn(["A", "K", "A"], "rank")).toMatchObject({
      code: "INVALID_ARGUMENT",
      message:
        'Invalid rank order: it lists "A" twice, but each rank has one place',
    });
    expect(placesIn([NaN, NaN], "suit")).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
    expect(placesIn([0, -0], "suit")).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });

  it("names where a hole or undefined is, since it's what a card with no rank or suit reads as", () => {
    // eslint-disable-next-line no-sparse-arrays -- the hole is the point
    expect(placesIn(["2", , "A"], "rank")).toMatchObject({
      code: "INVALID_ARGUMENT",
      message:
        "Invalid rank order: it has a hole or undefined at index 1, but each place needs a rank",
    });
    expect(placesIn(["C", "D", undefined], "suit")).toMatchObject({
      code: "INVALID_ARGUMENT",
      message:
        "Invalid suit order: it has a hole or undefined at index 2, but each place needs a suit",
    });
  });
  it("keeps a frozen order's places, but reads any other order every time", () => {
    const frozen = Object.freeze(["A", "K"]);
    expect(placesIn(frozen, "rank")).toBe(placesIn(frozen, "suit"));
    const unfrozen = ["A", "K"];
    expect(placesIn(unfrozen, "rank")).not.toBe(placesIn(unfrozen, "rank"));
  });

  it("doesn't keep a frozen order it rejects", () => {
    const twice = Object.freeze(["A", "A"]);
    expect(placesIn(twice, "rank")).toMatchObject({ code: "INVALID_ARGUMENT" });
    expect(placesIn(twice, "rank")).toMatchObject({ code: "INVALID_ARGUMENT" });
  });
});

describe("suitPlacesIn", () => {
  it("places the suit order, or gives undefined when it's left out", () => {
    expect(suitPlacesIn({ suitOrder: ["C", "D"] })).toStrictEqual(
      new Map([
        ["C", 0],
        ["D", 1],
      ]),
    );
    expect(suitPlacesIn({})).toBeUndefined();
    expect(suitPlacesIn({ suitOrder: undefined })).toBeUndefined();
  });

  it("shows options with a suit order when the options aren't an object", () => {
    expect(suitPlacesIn(null as unknown as object)).toMatchObject({
      code: "INVALID_ARGUMENT",
      message:
        "Invalid options null: expected an object, such as { suitOrder: SuitOrder.BRIDGE }",
    });
  });

  it("reads the suit order once", () => {
    let reads = 0;
    const options = {
      get suitOrder() {
        reads += 1;
        return ["C"];
      },
    };
    suitPlacesIn(options);
    expect(reads).toBe(1);
  });
});
