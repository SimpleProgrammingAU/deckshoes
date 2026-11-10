import fc, { type Arbitrary } from "fast-check";
import { describe, expect, it } from "vitest";

import type { CardStack } from "./stack.ts";

import {
  arraySubclasses,
  asStack,
  isPlainFrozen,
  nonArrays,
  sameValues,
  sparseStacks,
  stacks,
  stacksWithCards,
  stacksWithCounts,
  thrownBy,
} from "../test/helpers.ts";
import { type Card, card } from "./card.ts";
import { insert } from "./cut.ts";
import { standard52 } from "./presets/standard52.ts";
import { contains, count, remove } from "./remove.ts";

const ACE = card("A", "S");
const KING = card("K", "H");
const TEN = card("10", "D");
const QUEEN = card("Q", "C");
const hand = [ACE, KING, TEN];

/** A stack with cards that are sometimes all in it and sometimes not. */
function stacksWithAnyCards(): Arbitrary<{ cards: Card[]; stack: Card[] }> {
  return fc.oneof(
    stacksWithCards(),
    fc.record({ cards: stacks(), stack: stacks() }),
  );
}

/** What `run` returns, or the code of the error it throws, so a test can compare either without a branch. */
function outcomeOf(run: () => unknown): { code: unknown } | { value: unknown } {
  try {
    return { value: run() };
  } catch (error) {
    return { code: (error as { code?: unknown }).code };
  }
}

/** What `remove` should give, worked out one entry at a time with `findIndex` and `splice`: the cards left, or `undefined` when an entry has no copy. */
function removeOracle(
  stack: readonly unknown[],
  cards: readonly unknown[],
): unknown[] | undefined {
  const left = [...stack];
  for (const wanted of cards) {
    // `includes` matches with SameValueZero, as `remove` should.
    const i = left.findIndex((value) => [wanted].includes(value));
    if (i === -1) return undefined;
    left.splice(i, 1);
  }
  return left;
}

describe.each<
  readonly [
    name: string,
    operation: (
      stack: CardStack<unknown>,
      cards: CardStack<unknown>,
    ) => unknown,
  ]
>([
  ["remove", remove],
  ["contains", contains],
])("%s", (_name, operation) => {
  it("leaves the stack and cards unchanged, frozen or not", () => {
    fc.assert(
      fc.property(
        stacksWithAnyCards(),
        fc.boolean(),
        ({ cards: originalCards, stack: original }, frozen) => {
          const stack = frozen ? Object.freeze([...original]) : [...original];
          const cards = frozen
            ? Object.freeze([...originalCards])
            : [...originalCards];
          outcomeOf(() => operation(stack, cards));
          expect(sameValues(stack, original)).toBe(true);
          expect(sameValues(cards, originalCards)).toBe(true);
          expect(Object.isFrozen(stack)).toBe(frozen);
          expect(Object.isFrozen(cards)).toBe(frozen);
        },
      ),
    );
  });

  it.each(arraySubclasses())(
    "gives what a plain array gives for %s as the stack or the cards, frozen or not",
    (_label, make) => {
      fc.assert(
        fc.property(
          stacksWithCards(),
          fc.boolean(),
          ({ cards, stack }, frozen) => {
            const expected = operation(stack, cards);
            const given = (from: CardStack): CardStack =>
              frozen ? Object.freeze(make(from)) : make(from);
            expect(operation(given(stack), cards)).toStrictEqual(expected);
            expect(operation(stack, given(cards))).toStrictEqual(expected);
          },
        ),
      );
    },
  );

  it("reads a hole in the stack or the cards as undefined", () => {
    fc.assert(
      fc.property(sparseStacks(), sparseStacks(), (stack, cards) => {
        // Spreading turns each hole into undefined, and toStrictEqual tells them apart.
        expect(outcomeOf(() => operation(stack, cards))).toStrictEqual(
          outcomeOf(() => operation([...stack], [...cards])),
        );
      }),
    );
  });

  it("matches NaN with NaN and -0 with 0, as includes does", () => {
    expect(operation([NaN], [NaN])).toBeTruthy();
    expect(operation([0], [-0])).toBeTruthy();
    expect(operation([-0], [0])).toBeTruthy();
  });

  it.each(nonArrays())("rejects %s as the stack", (_label, stack) => {
    expect(thrownBy(() => operation(asStack(stack), []))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });

  it.each(nonArrays())("rejects %s as the cards", (_label, cards) => {
    expect(thrownBy(() => operation(hand, asStack(cards)))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });
});

describe("remove", () => {
  it("removes the topmost copy for each entry, as the oracle does", () => {
    fc.assert(
      fc.property(stacksWithCards(), ({ cards, stack }) => {
        const expected = removeOracle(stack, cards);
        expect(expected).toBeDefined();
        expect(sameValues(remove(stack, cards), expected ?? [])).toBe(true);
      }),
    );
  });

  it("removes from a stack of anything as the oracle does", () => {
    fc.assert(
      fc.property(
        stacksWithCards(fc.array(fc.anything())),
        ({ cards, stack }) => {
          expect(
            sameValues(remove(stack, cards), removeOracle(stack, cards) ?? []),
          ).toBe(true);
        },
      ),
    );
  });

  it("throws exactly when the oracle finds an entry with no copy", () => {
    fc.assert(
      fc.property(stacksWithAnyCards(), ({ cards, stack }) => {
        const expected = removeOracle(stack, cards);
        expect(outcomeOf(() => remove(stack, cards))).toStrictEqual(
          expected === undefined
            ? { code: "INVALID_ARGUMENT" }
            : { value: expected },
        );
      }),
    );
  });

  it("gives back the stack after removing what was put on top", () => {
    fc.assert(
      fc.property(stacks(), stacks(), (stack, cards) => {
        expect(remove(insert(stack, cards, 0), cards)).toStrictEqual(stack);
      }),
    );
  });

  it("removes one copy for each entry, so two aces from two decks", () => {
    const twoDecks = [...standard52(), ...standard52()];
    const left = remove(twoDecks, [ACE, ACE]);
    expect(left).toHaveLength(102);
    expect(left).not.toContain(ACE);
    expect(remove(twoDecks, [ACE])).toHaveLength(103);
  });

  it("takes the topmost copy and keeps the order of what's left", () => {
    expect(remove([KING, ACE, TEN, ACE], [ACE])).toStrictEqual([
      KING,
      TEN,
      ACE,
    ]);
    expect(remove([ACE, KING, ACE, TEN], [TEN, ACE])).toStrictEqual([
      KING,
      ACE,
    ]);
  });

  it("returns a new frozen stack, even with no cards to remove", () => {
    const stack = Object.freeze([ACE, KING]);
    for (const cards of [[], [ACE], [ACE, KING]]) {
      const left = remove(stack, cards);
      expect(isPlainFrozen(left)).toBe(true);
      expect(left).not.toBe(stack);
    }
  });

  it.each(arraySubclasses())(
    "gives a plain frozen stack for %s",
    (_label, make) => {
      expect(isPlainFrozen(remove(make(hand), make([KING])))).toBe(true);
    },
  );

  it("names the first entry with no copy left by its index in the cards", () => {
    expect(thrownBy(() => remove(hand, [KING, QUEEN]))).toMatchObject({
      code: "INVALID_ARGUMENT",
      message: "Can't remove cards[1]: the stack has no copy of it left",
    });
    // Copies are interchangeable, so it's the second ace that has no copy.
    expect(
      (thrownBy(() => remove([ACE, KING], [ACE, KING, ACE, QUEEN])) as Error)
        .message,
    ).toBe("Can't remove cards[2]: the stack has no copy of it left");
    expect((thrownBy(() => remove([], [TEN, ACE])) as Error).message).toBe(
      "Can't remove cards[0]: the stack has no copy of it left",
    );
  });

  it("matches a hole on either side with a hole or undefined on the other", () => {
    // eslint-disable-next-line no-sparse-arrays -- a hole reads as undefined
    expect(remove([ACE, , KING], [undefined])).toStrictEqual([ACE, KING]);
    // eslint-disable-next-line no-sparse-arrays -- a hole reads as undefined
    expect(remove([ACE, undefined], [, ACE])).toStrictEqual([]);
  });

  it("throws for one copy too few, even when the other entries are there", () => {
    expect(thrownBy(() => remove([ACE, KING], [KING, ACE, ACE]))).toMatchObject(
      { code: "INVALID_ARGUMENT" },
    );
  });
});

describe("contains", () => {
  it("is true exactly when remove doesn't throw", () => {
    fc.assert(
      fc.property(stacksWithAnyCards(), ({ cards, stack }) => {
        const removable = "value" in outcomeOf(() => remove(stack, cards));
        expect(contains(stack, cards)).toBe(removable);
      }),
    );
  });

  it("is true for no cards, even in an empty stack", () => {
    fc.assert(
      fc.property(stacks(), (stack) => {
        expect(contains(stack, [])).toBe(true);
      }),
    );
  });

  it("finds whatever was put in", () => {
    fc.assert(
      fc.property(stacksWithCounts(), stacks(), ({ count, stack }, cards) => {
        expect(contains(insert(stack, cards, count), cards)).toBe(true);
      }),
    );
  });

  it("counts copies, one for each entry", () => {
    const jack = card("J", "D");
    const queen = card("Q", "S");
    const pinochle = [jack, queen, ACE, jack, queen];
    expect(contains(pinochle, [jack, jack, queen, queen])).toBe(true);
    expect(contains(pinochle, [ACE])).toBe(true);
    expect(contains(pinochle, [ACE, ACE])).toBe(false);
    expect(contains(pinochle, [QUEEN])).toBe(false);
  });
});

describe("count", () => {
  it("counts the cards that match accepts", () => {
    fc.assert(
      fc.property(stacks(), fc.func(fc.boolean()), (stack, match) => {
        const accepted = stack.filter((each) => match(each));
        expect(count(stack, (each) => match(each))).toBe(accepted.length);
      }),
    );
  });

  it("calls match once for each card, top first, with the card alone", () => {
    fc.assert(
      fc.property(stacks(), (stack) => {
        const calls: unknown[][] = [];
        count(stack, (...args: unknown[]) => {
          calls.push(args);
          return true;
        });
        expect(calls).toStrictEqual(stack.map((each) => [each]));
      }),
    );
  });

  it("counts a truthy return, as filter does", () => {
    const loose = (value: unknown): boolean => value as boolean;
    expect(count(hand, () => loose(1))).toBe(3);
    expect(count(hand, (each) => loose(each === KING && each))).toBe(1);
    expect(count(hand, () => loose(""))).toBe(0);
    expect(count(hand, () => loose(NaN))).toBe(0);
  });

  it("counts copies, holes and values of any kind", () => {
    expect(count([ACE, KING, ACE], (each) => each === ACE)).toBe(2);
    // eslint-disable-next-line no-sparse-arrays -- a hole reads as undefined
    expect(count([1, , 3], (each) => each === undefined)).toBe(1);
    expect(count([], () => true)).toBe(0);
  });

  it.each(arraySubclasses())(
    "gives what a plain array gives for %s",
    (_label, make) => {
      fc.assert(
        fc.property(stacks(), fc.func(fc.boolean()), (stack, match) => {
          expect(count(make(stack), (each) => match(each))).toBe(
            count(stack, (each) => match(each)),
          );
        }),
      );
    },
  );

  it("leaves the stack unchanged", () => {
    fc.assert(
      fc.property(stacks(), (original) => {
        const stack = [...original];
        count(stack, () => true);
        expect(stack).toStrictEqual(original);
      }),
    );
  });

  it("passes on whatever match throws, unchanged", () => {
    const thrown = new Error("Not a card I know");
    expect(
      thrownBy(() =>
        count(hand, () => {
          throw thrown;
        }),
      ),
    ).toBe(thrown);
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["true", true],
    ["a suit", "H"],
    ["an object", {}],
    ["an array of cards", [ACE]],
  ])("rejects %s as match, even on an empty stack", (_label, match) => {
    for (const stack of [hand, []]) {
      expect(
        thrownBy(() => count(stack, match as (each: Card) => boolean)),
      ).toMatchObject({ code: "INVALID_ARGUMENT" });
    }
  });

  it.each(nonArrays())(
    "rejects %s as the stack without calling match",
    (_label, stack) => {
      let calls = 0;
      expect(
        thrownBy(() =>
          count(asStack(stack), () => {
            calls += 1;
            return true;
          }),
        ),
      ).toMatchObject({ code: "INVALID_ARGUMENT" });
      expect(calls).toBe(0);
    },
  );
});
