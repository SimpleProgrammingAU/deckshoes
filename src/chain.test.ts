import fc from "fast-check";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CardStack } from "./stack.ts";

import {
  asShuffleOptions,
  asStack,
  counted,
  deals,
  nonArrays,
  seeds,
  stacks,
  stacksWithCards,
  stacksWithCounts,
  thrownBy,
} from "../test/helpers.ts";
import { type Card, card } from "./card.ts";
import { chain, type Chain, type TerminatedChain } from "./chain.ts";
import { cut, type CutOptions, insert, Position } from "./cut.ts";
import { deal, HandSize, PacketSize, RunOut } from "./deal.ts";
import { draw, drawBottom, peek, peekBottom } from "./draw.ts";
import {
  groupByRank,
  groupBySuit,
  RankOrder,
  sort,
  SuitOrder,
} from "./order.ts";
import { standard52 } from "./presets/standard52.ts";
import { seededRandom } from "./random.ts";
import { contains, count, remove } from "./remove.ts";
import { shuffle } from "./shuffle.ts";

/** Every method a chain holding a stack has, which a terminated chain mustn't. */
const STACK_METHODS = [
  "contains",
  "count",
  "cut",
  "deal",
  "draw",
  "drawBottom",
  "groupByRank",
  "groupBySuit",
  "insert",
  "peek",
  "peekBottom",
  "remove",
  "shuffle",
  "sort",
];

/** Cards that {@link standard52} holds once each, to insert, remove or look for. */
const SOME_CARDS = [card("Q", "S"), card("2", "C")];

describe("chain", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("value", () => {
    it("returns the stack itself, frozen or not, and leaves it unchanged", () => {
      fc.assert(
        fc.property(stacks(), fc.boolean(), (original, frozen) => {
          const stack = frozen ? Object.freeze([...original]) : [...original];
          expect(chain(stack).value()).toBe(stack);
          expect(stack).toStrictEqual(original);
          expect(Object.isFrozen(stack)).toBe(frozen);
        }),
      );
    });
  });

  describe("shuffle", () => {
    it("gives what the shuffle function gives", () => {
      fc.assert(
        fc.property(stacks(), seeds, (stack, seed) => {
          expect(
            chain(stack)
              .shuffle({ random: seededRandom(seed) })
              .value(),
          ).toStrictEqual(shuffle(stack, { random: seededRandom(seed) }));
        }),
      );
    });

    it("passes the same random source on to each shuffle", () => {
      fc.assert(
        fc.property(stacks(), seeds, (stack, seed) => {
          const chained = seededRandom(seed);
          const called = seededRandom(seed);
          expect(
            chain(stack)
              .shuffle({ random: chained })
              .shuffle({ random: chained })
              .value(),
          ).toStrictEqual(
            shuffle(shuffle(stack, { random: called }), { random: called }),
          );
        }),
      );
    });

    it("returns a new chain and leaves the old one holding its stack", () => {
      const deck = standard52();
      const before = chain(deck);
      const after = before.shuffle({ random: seededRandom(42) });
      expect(after).not.toBe(before);
      expect(before.value()).toBe(deck);
      expect(after.value()[0]).toBe(card("7", "H"));
    });

    it("uses the secure source when there are no options, or random is undefined", () => {
      const spy = vi.spyOn(crypto, "getRandomValues");
      chain(standard52()).shuffle();
      expect(spy).toHaveBeenCalledOnce();
      chain(standard52()).shuffle({ random: undefined });
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it.each([
      ["a random source that returns 1", { random: () => 1 }],
      ["a random source as the options", asShuffleOptions(seededRandom(42))],
    ])("throws what the shuffle function throws for %s", (_label, options) => {
      const chained = chain(standard52());
      expect(thrownBy(() => chained.shuffle(options))).toStrictEqual(
        thrownBy(() => shuffle(standard52(), options)),
      );
      expect(chained.value()).toBe(standard52());
    });
  });

  describe.each<
    readonly [
      name: "cut" | "insert",
      operation: (
        stack: CardStack,
        position?: Position,
        options?: CutOptions,
      ) => CardStack,
      method: (
        chained: Chain,
        position?: Position,
        options?: CutOptions,
      ) => Chain,
    ]
  >([
    [
      "cut",
      cut,
      (chained, position, options) => chained.cut(position, options),
    ],
    [
      "insert",
      (stack, position, options) =>
        insert(stack, SOME_CARDS, position, options),
      (chained, position, options) =>
        chained.insert(SOME_CARDS, position, options),
    ],
  ])("%s", (_name, operation, method) => {
    it("gives what the function gives, at a given or random position", () => {
      fc.assert(
        fc.property(stacksWithCounts(), seeds, ({ count, stack }, seed) => {
          for (const position of [count, Position.BOTTOM, Position.RANDOM]) {
            expect(
              method(chain(stack), position, {
                random: seededRandom(seed),
              }).value(),
            ).toStrictEqual(
              operation(stack, position, { random: seededRandom(seed) }),
            );
          }
        }),
      );
    });

    it("passes the random source on, so a shuffle after it carries on from the same source", () => {
      fc.assert(
        fc.property(stacks(), seeds, (stack, seed) => {
          const chained = seededRandom(seed);
          const called = seededRandom(seed);
          expect(
            method(chain(stack), Position.RANDOM, { random: chained })
              .shuffle({ random: chained })
              .value(),
          ).toStrictEqual(
            shuffle(operation(stack, Position.RANDOM, { random: called }), {
              random: called,
            }),
          );
        }),
      );
    });

    it("uses a secure source when the position and options are left out", () => {
      const spy = vi.spyOn(crypto, "getRandomValues");
      method(chain(standard52()));
      method(chain(standard52()), undefined, undefined);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it.each([
      ["a position past the bottom", 53, undefined],
      ["a negative position", -1, undefined],
      ["a random source that returns 1", Position.RANDOM, { random: () => 1 }],
    ])(
      "throws what the function throws for %s",
      (_label, position, options) => {
        const chained = chain(standard52());
        expect(
          thrownBy(() => method(chained, position, options)),
        ).toStrictEqual(
          thrownBy(() => operation(standard52(), position, options)),
        );
        expect(chained.value()).toBe(standard52());
      },
    );

    it("returns a new frozen chain, leaving the old one holding its stack", () => {
      const deck = standard52();
      const before = chain(deck);
      const after = method(before, 26);
      expect(after).not.toBe(before);
      expect(Object.isFrozen(after)).toBe(true);
      expect(before.value()).toBe(deck);
      expect(after.value()).toStrictEqual(operation(deck, 26));
    });

    it("never calls the source at a given position", () => {
      const random = counted(() => 0);
      method(chain(standard52()), 26, { random });
      method(chain(standard52()), Position.BOTTOM, { random });
      expect(random.calls).toBe(0);
    });
  });

  describe("remove", () => {
    it("gives what the function gives", () => {
      fc.assert(
        fc.property(stacksWithCards(), ({ cards, stack }) => {
          expect(chain(stack).remove(cards).value()).toStrictEqual(
            remove(stack, cards),
          );
        }),
      );
    });

    it("throws what the function throws for a card that isn't there", () => {
      const chained = chain(standard52());
      const twice = [card("A", "S"), card("A", "S")];
      expect(thrownBy(() => chained.remove(twice))).toStrictEqual(
        thrownBy(() => remove(standard52(), twice)),
      );
      expect(chained.value()).toBe(standard52());
    });

    it("returns a new frozen chain, leaving the old one holding its stack", () => {
      const deck = standard52();
      const before = chain(deck);
      const after = before.remove(SOME_CARDS);
      expect(after).not.toBe(before);
      expect(Object.isFrozen(after)).toBe(true);
      expect(before.value()).toBe(deck);
      expect(after.value()).toHaveLength(50);
    });

    it("carries on, so cards can be taken out and put back", () => {
      const deck = standard52();
      expect(
        chain(deck)
          .remove(SOME_CARDS)
          .insert(SOME_CARDS, Position.BOTTOM)
          .value(),
      ).toStrictEqual(insert(remove(deck, SOME_CARDS), SOME_CARDS, 52 - 2));
    });
  });

  describe.each<
    readonly [
      name: "contains" | "count",
      method: (chained: Chain) => TerminatedChain<unknown>,
      operation: (stack: CardStack) => unknown,
    ]
  >([
    [
      "contains",
      (chained) => chained.contains(SOME_CARDS),
      (stack) => contains(stack, SOME_CARDS),
    ],
    [
      "count",
      (chained) => chained.count(({ suit }) => suit === "S"),
      (stack) => count(stack, ({ suit }) => suit === "S"),
    ],
  ])("%s", (_name, method, operation) => {
    it("gives what the function gives", () => {
      fc.assert(
        fc.property(stacks(), (stack) => {
          expect(method(chain(stack)).value()).toBe(operation(stack));
        }),
      );
    });

    it("leaves the chain it's called on holding its stack", () => {
      const deck = standard52();
      const before = chain(deck);
      method(before);
      expect(before.value()).toBe(deck);
    });

    it("returns a frozen chain that can only be unwrapped", () => {
      const terminated = method(chain(standard52()));
      expect(Object.isFrozen(terminated)).toBe(true);
      for (const name of STACK_METHODS) {
        expect(terminated).not.toHaveProperty(name);
      }
    });
  });

  it("throws what the function throws for contains and count", () => {
    const chained = chain(standard52());
    expect(thrownBy(() => chained.contains(asStack("QS 2C")))).toStrictEqual(
      thrownBy(() => contains(standard52(), asStack("QS 2C"))),
    );
    const match = "S" as unknown as (card: Card) => unknown;
    expect(thrownBy(() => chained.count(match))).toStrictEqual(
      thrownBy(() => count(standard52(), match)),
    );
  });

  describe.each<
    readonly [
      name: "draw" | "drawBottom" | "peek" | "peekBottom",
      operation: (stack: CardStack, count?: number) => unknown,
    ]
  >([
    ["draw", draw],
    ["drawBottom", drawBottom],
    ["peek", peek],
    ["peekBottom", peekBottom],
  ])("%s", (name, operation) => {
    it("gives what the function gives", () => {
      fc.assert(
        fc.property(stacksWithCounts(), ({ count, stack }) => {
          expect(chain(stack)[name](count).value()).toStrictEqual(
            operation(stack, count),
          );
        }),
      );
    });

    it("uses the function's default when the count is left out or undefined", () => {
      const deck = standard52();
      expect(chain(deck)[name]().value()).toStrictEqual(operation(deck));
      expect(chain(deck)[name](undefined).value()).toStrictEqual(
        operation(deck),
      );
    });

    it.each([
      ["more cards than the stack holds", 53],
      ["a negative count", -1],
      ["a fraction", 1.5],
    ])("throws what the function throws for %s", (_label, count) => {
      const chained = chain(standard52());
      expect(thrownBy(() => chained[name](count))).toStrictEqual(
        thrownBy(() => operation(standard52(), count)),
      );
      expect(chained.value()).toBe(standard52());
    });

    it("leaves the chain it's called on holding its stack", () => {
      const deck = standard52();
      const before = chain(deck);
      before[name](2);
      expect(before.value()).toBe(deck);
    });

    it("returns a frozen chain that can only be unwrapped", () => {
      const terminated = chain(standard52())[name](2);
      expect(Object.isFrozen(terminated)).toBe(true);
      expect(terminated.value()).toBe(terminated.value());
      for (const method of STACK_METHODS) {
        expect(terminated).not.toHaveProperty(method);
      }
    });
  });

  describe("sort", () => {
    it("gives what the function gives, with or without a suit order", () => {
      fc.assert(
        fc.property(
          stacks(),
          fc.constantFrom(RankOrder.ACE_HIGH, RankOrder.ACE_LOW),
          fc.option(fc.constant(SuitOrder.BRIDGE), { nil: undefined }),
          (stack, rankOrder, suitOrder) => {
            expect(
              chain(stack).sort(rankOrder, { suitOrder }).value(),
            ).toStrictEqual(sort(stack, rankOrder, { suitOrder }));
          },
        ),
      );
    });

    it("uses the function's default when the options are left out or undefined", () => {
      const deck = standard52();
      const expected = sort(deck, RankOrder.ACE_HIGH);
      expect(chain(deck).sort(RankOrder.ACE_HIGH).value()).toStrictEqual(
        expected,
      );
      expect(
        chain(deck).sort(RankOrder.ACE_HIGH, undefined).value(),
      ).toStrictEqual(expected);
    });

    it.each<readonly [label: string, rankOrder: RankOrder, options: unknown]>([
      ["a rank order that lacks a rank", ["9", "J", "Q", "K", "10", "A"], {}],
      ["a rank order that lists a rank twice", ["A", "A"], {}],
      [
        "a suit order that lacks a suit",
        RankOrder.ACE_HIGH,
        { suitOrder: ["S"] },
      ],
      ["options that aren't an object", RankOrder.ACE_HIGH, null],
    ])(
      "throws what the function throws for %s",
      (_label, rankOrder, options) => {
        const chained = chain(standard52());
        const given = options as { suitOrder?: SuitOrder };
        expect(thrownBy(() => chained.sort(rankOrder, given))).toStrictEqual(
          thrownBy(() => sort(standard52(), rankOrder, given)),
        );
        expect(chained.value()).toBe(standard52());
      },
    );

    it("returns a new frozen chain, leaving the old one holding its stack", () => {
      const deck = standard52();
      const before = chain(deck);
      const after = before.sort(RankOrder.ACE_LOW);
      expect(after).not.toBe(before);
      expect(Object.isFrozen(after)).toBe(true);
      expect(before.value()).toBe(deck);
      expect(after.value()[0]?.rank).toBe("A");
    });

    it("carries on, so a sorted deck can be grouped or dealt", () => {
      const deck = standard52();
      const sorted = chain(deck).sort(RankOrder.ACE_HIGH);
      expect(sorted.groupBySuit(SuitOrder.BRIDGE).value()).toStrictEqual(
        groupBySuit(sort(deck, RankOrder.ACE_HIGH), SuitOrder.BRIDGE),
      );
      expect(sorted.deal(4, 2).value()).toStrictEqual(
        deal(sort(deck, RankOrder.ACE_HIGH), 4, 2),
      );
    });
  });

  describe.each<
    readonly [
      name: "groupByRank" | "groupBySuit",
      method: (chained: Chain) => TerminatedChain<unknown>,
      operation: (stack: CardStack) => unknown,
      bad: (chained: Chain) => unknown,
      badOperation: (stack: CardStack) => unknown,
    ]
  >([
    [
      "groupByRank",
      (chained) => chained.groupByRank(RankOrder.ACE_LOW),
      (stack) => groupByRank(stack, RankOrder.ACE_LOW),
      (chained) => chained.groupByRank(["A", "K"]),
      (stack) => groupByRank(stack, ["A", "K"]),
    ],
    [
      "groupBySuit",
      (chained) => chained.groupBySuit(SuitOrder.BRIDGE),
      (stack) => groupBySuit(stack, SuitOrder.BRIDGE),
      (chained) => chained.groupBySuit(["S", "S"]),
      (stack) => groupBySuit(stack, ["S", "S"]),
    ],
  ])("%s", (_name, method, operation, bad, badOperation) => {
    it("gives what the function gives", () => {
      fc.assert(
        fc.property(stacks(), (stack) => {
          expect(method(chain(stack)).value()).toStrictEqual(operation(stack));
        }),
      );
    });

    it("throws what the function throws", () => {
      const chained = chain(standard52());
      expect(thrownBy(() => bad(chained))).toStrictEqual(
        thrownBy(() => badOperation(standard52())),
      );
      expect(chained.value()).toBe(standard52());
    });

    it("leaves the chain it's called on holding its stack", () => {
      const deck = standard52();
      const before = chain(deck);
      method(before);
      expect(before.value()).toBe(deck);
    });

    it("returns a frozen chain that can only be unwrapped", () => {
      const terminated = method(chain(standard52()));
      expect(Object.isFrozen(terminated)).toBe(true);
      expect(terminated.value()).toBe(terminated.value());
      for (const name of STACK_METHODS) {
        expect(terminated).not.toHaveProperty(name);
      }
    });
  });

  describe("deal", () => {
    it("gives what the function gives, with named values and either runOut", () => {
      fc.assert(
        fc.property(
          deals(),
          fc.boolean(),
          fc.boolean(),
          fc.constantFrom(undefined, RunOut.STOP, RunOut.THROW),
          fc.nat({ max: 3 }),
          (dealt, maximize, wholeHands, runOut, extra) => {
            const { deck, handCount } = dealt;
            // Only RunOut.STOP can ask for more cards than the deck holds.
            const handSize = maximize
              ? HandSize.MAXIMIZE
              : dealt.handSize + (runOut === RunOut.STOP ? extra : 0);
            const options = {
              packetSize: wholeHands ? PacketSize.HAND : dealt.packetSize,
              runOut,
            };
            expect(
              chain(deck).deal(handCount, handSize, options).value(),
            ).toStrictEqual(deal(deck, handCount, handSize, options));
          },
        ),
      );
    });

    it("uses the function's defaults when the options are left out or undefined", () => {
      const deck = standard52();
      expect(chain(deck).deal(4, 13).value()).toStrictEqual(deal(deck, 4, 13));
      expect(chain(deck).deal(4, 13, undefined).value()).toStrictEqual(
        deal(deck, 4, 13),
      );
      expect(
        chain(deck).deal(5, 11, { runOut: RunOut.STOP }).value(),
      ).toStrictEqual(deal(deck, 5, 11, { runOut: RunOut.STOP }));
    });

    it.each([
      ["more cards than the stack holds", 4, 14],
      ["no hands", 0, 1],
      ["a hand size of 0", 1, 0],
    ])(
      "throws what the function throws for %s",
      (_label, handCount, handSize) => {
        const chained = chain(standard52());
        expect(thrownBy(() => chained.deal(handCount, handSize))).toStrictEqual(
          thrownBy(() => deal(standard52(), handCount, handSize)),
        );
        expect(chained.value()).toBe(standard52());
      },
    );

    it("leaves the chain it's called on holding its stack", () => {
      const deck = standard52();
      const before = chain(deck);
      before.deal(4, 5);
      expect(before.value()).toBe(deck);
    });

    it("returns a frozen chain that can only be unwrapped", () => {
      const terminated = chain(standard52()).deal(4, 5);
      expect(Object.isFrozen(terminated)).toBe(true);
      expect(terminated.value()).toBe(terminated.value());
      for (const method of STACK_METHODS) {
        expect(terminated).not.toHaveProperty(method);
      }
    });
  });

  it("carries on after a deal by wrapping the remainder again", () => {
    const deck = standard52();
    const { remainder } = chain(deck).deal(4, 5).value();
    expect(chain(remainder).draw().value()).toStrictEqual(
      draw(deal(deck, 4, 5).remainder),
    );
  });

  it("carries on after a draw by wrapping the remainder again", () => {
    const deck = standard52();
    const { remainder } = chain(deck).draw(2).value();
    expect(chain(remainder).draw().value()).toStrictEqual(
      draw(draw(deck, 2).remainder),
    );
  });

  it("carries on after a peek from the chain it was called on", () => {
    const shuffled = chain(standard52()).shuffle({ random: seededRandom(42) });
    const peeked = shuffled.peek(2).value();
    expect(shuffled.draw(2).value().cards).toStrictEqual(peeked);
  });

  it("returns a frozen chain, before and after an operation", () => {
    const chained = chain(standard52());
    expect(Object.isFrozen(chained)).toBe(true);
    expect(Object.isFrozen(chained.shuffle({ random: seededRandom(1) }))).toBe(
      true,
    );
  });

  it.each(nonArrays())("rejects %s as the stack", (_label, stack) => {
    expect(thrownBy(() => chain(asStack(stack)))).toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });
});
