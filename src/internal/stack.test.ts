import { describe, expect, it } from "vitest";

import { copyStack } from "./stack.ts";

describe("copyStack", () => {
  it("reads a hole as undefined", () => {
    const sparse: (string | undefined)[] = [];
    sparse[1] = "b";
    expect(copyStack(sparse)).toStrictEqual([undefined, "b"]);
    expect(copyStack(sparse, 0, 1)).toStrictEqual([undefined]);
  });
});
