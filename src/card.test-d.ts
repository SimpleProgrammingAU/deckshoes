import { describe, expectTypeOf, it } from "vitest";

import {
  type Card,
  card,
  type Color,
  isCard,
  type Rank,
  type Suit,
} from "./card.ts";

describe("Rank, Suit and Color", () => {
  it("are exactly the standard ranks, suits and colours", () => {
    expectTypeOf<Rank>().toEqualTypeOf<
      | "A"
      | "2"
      | "3"
      | "4"
      | "5"
      | "6"
      | "7"
      | "8"
      | "9"
      | "10"
      | "J"
      | "Q"
      | "K"
    >();
    expectTypeOf<Suit>().toEqualTypeOf<"S" | "H" | "D" | "C">();
    expectTypeOf<Color>().toEqualTypeOf<"red" | "black">();
  });
});

describe("card", () => {
  it("takes a rank and a suit and returns a Card", () => {
    expectTypeOf(card).parameters.toEqualTypeOf<[Rank, Suit]>();
    expectTypeOf(card).returns.toEqualTypeOf<Card>();
  });

  it("rejects ranks and suits that aren't standard", () => {
    expectTypeOf(card).toBeCallableWith("10", "S");
    // @ts-expect-error "11" is not a Rank
    expectTypeOf(card).toBeCallableWith("11", "S");
    // @ts-expect-error "T" is only accepted when parsing text
    expectTypeOf(card).toBeCallableWith("T", "S");
    // @ts-expect-error a rank is a string, not a number
    expectTypeOf(card).toBeCallableWith(10, "S");
    // @ts-expect-error "X" is not a Suit
    expectTypeOf(card).toBeCallableWith("A", "X");
    // @ts-expect-error suits are upper case
    expectTypeOf(card).toBeCallableWith("A", "s");
  });
});

describe("Card", () => {
  it("is branded, so a look-alike object isn't a Card", () => {
    expectTypeOf<{
      readonly color: "black";
      readonly rank: "A";
      readonly suit: "S";
    }>().not.toExtend<Card>();
    // @ts-expect-error an object literal can't pass for a card
    const fake: Card = { color: "black", rank: "A", suit: "S" };
    expectTypeOf(fake).toEqualTypeOf<Card>();
  });

  it("isn't kept by object spread", () => {
    const ace = {} as Card;
    // @ts-expect-error a spread card with another suit can't pass for a card
    const moved: Card = { ...ace, suit: "H" };
    expectTypeOf({ ...ace }).not.toExtend<Card>();
    expectTypeOf(moved).toEqualTypeOf<Card>();
  });

  it("has only rank, suit and color as keys", () => {
    expectTypeOf<keyof Card>().toEqualTypeOf<"color" | "rank" | "suit">();
  });

  it("can still be read as a rank, a suit and a colour", () => {
    expectTypeOf<Card>().toExtend<{
      readonly color: Color;
      readonly rank: Rank;
      readonly suit: Suit;
    }>();
  });

  it("has readonly fields", () => {
    const ace = {} as Card;
    // @ts-expect-error rank is readonly
    ace.rank = "K";
    // @ts-expect-error suit is readonly
    ace.suit = "H";
    // @ts-expect-error color is readonly
    ace.color = "red";
    expectTypeOf(ace).toEqualTypeOf<Card>();
  });
});

describe("isCard", () => {
  it("narrows an unknown value to a Card", () => {
    const value: unknown = undefined;
    if (!isCard(value)) return;
    expectTypeOf(value).toEqualTypeOf<Card>();
  });
});
