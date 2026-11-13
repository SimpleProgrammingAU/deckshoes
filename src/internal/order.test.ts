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
    expect(placesIn([1, "1", undefined, null], "suit")).toStrictEqual(
      new Map<unknown, number>([
        [1, 0],
        ["1", 1],
        [undefined, 2],
        [null, 3],
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

  it("reads a hole as undefined, so two holes repeat an entry", () => {
    // eslint-disable-next-line no-sparse-arrays -- the holes are the point
    expect(placesIn([, "A"], "rank")).toBeInstanceOf(Map);
    // eslint-disable-next-line no-sparse-arrays -- the holes are the point
    expect(placesIn([, "A", ,], "rank")).toMatchObject({
      message:
        "Invalid rank order: it lists undefined twice, but each rank has one place",
    });
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
