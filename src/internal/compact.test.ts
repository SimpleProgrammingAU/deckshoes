import { describe, expect, it } from "vitest";

import { card } from "../card.ts";
import { writeShoe, writeStack } from "./compact.ts";

const ACE = card("A", "S");

/**
 * The longest string that doubling "x" gives before the runtime refuses the
 * next doubling: half the runtime's longest string or more, so two of them
 * never fit. Doubling makes a rope rather than a copy, so it costs next to no
 * memory, whatever the runtime's limit.
 */
function halfTheLimit(): string {
  let text = "x";
  for (;;) {
    try {
      text += text;
    } catch {
      return text;
    }
  }
}

const LONG = halfTheLimit();

/** Writes every card as {@link LONG}, so a few cards are too long for a string. */
const writeLong = (): string => LONG;

describe("writeStack", () => {
  it("writes cards that fit", () => {
    const text = writeStack([ACE], writeLong, "the stack", {
      name: "stack",
      value: [ACE],
    });
    expect(typeof text === "string" && text.length).toBe(LONG.length);
  });

  it("names the owner when the cards are too long for a string side by side", () => {
    expect(
      writeStack([ACE, ACE], writeLong, "the stack", {
        name: "stack",
        value: [ACE, ACE],
      }),
    ).toMatchObject({
      code: "INVALID_ARGUMENT",
      message:
        "Invalid stack (array): its compact string would be longer than this runtime allows",
    });
  });
});

describe("writeShoe", () => {
  it("writes a shoe whose parts fit together", () => {
    const text = writeShoe(
      { cards: [ACE], cutCard: 0, discardPile: [] },
      writeLong,
    );
    expect(typeof text === "string" && text.length).toBe(LONG.length + 4);
  });

  it("names the shoe when its cards are too long for a string", () => {
    expect(
      writeShoe({ cards: [ACE, ACE], cutCard: 0, discardPile: [] }, writeLong),
    ).toMatchObject({
      code: "INVALID_ARGUMENT",
      message:
        "Invalid shoe (object): its compact string would be longer than this runtime allows",
    });
  });

  it("names the shoe when its discard pile is too long for a string", () => {
    expect(
      writeShoe({ cards: [], cutCard: 0, discardPile: [ACE, ACE] }, writeLong),
    ).toMatchObject({
      code: "INVALID_ARGUMENT",
      message:
        "Invalid shoe (object): its compact string would be longer than this runtime allows",
    });
  });

  it("names the shoe when its cards and discard pile fit apart but not together", () => {
    expect(
      writeShoe({ cards: [ACE], cutCard: 0, discardPile: [ACE] }, writeLong),
    ).toMatchObject({
      code: "INVALID_ARGUMENT",
      message:
        "Invalid shoe (object): its compact string would be longer than this runtime allows",
    });
  });
});
