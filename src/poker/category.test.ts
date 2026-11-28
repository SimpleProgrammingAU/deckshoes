import { describe, expect, it } from "vitest";

import { Category } from "./category.ts";

describe("Category", () => {
  it("is frozen, with each key its value in capitals", () => {
    expect(Object.isFrozen(Category)).toBe(true);
    expect(Object.keys(Category)).toHaveLength(9);
    for (const [key, value] of Object.entries(Category)) {
      expect(key).toBe(value.toUpperCase().replaceAll(" ", "_"));
    }
  });
});
