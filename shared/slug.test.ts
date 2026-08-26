import { describe, expect, it } from "vitest";

import { createSlug, isSlug } from "./slug";

describe("createSlug", () => {
  it("creates a six-character base62 slug", () => {
    const values = [0, 0.17, 0.34, 0.51, 0.68, 0.99];
    let index = 0;

    const slug = createSlug(() => values[index++] ?? 0);

    expect(slug).toHaveLength(6);
    expect(isSlug(slug)).toBe(true);
  });

  it("rejects an invalid random source", () => {
    expect(() => createSlug(() => 1)).toThrow("random source");
  });
});

describe("isSlug", () => {
  it("rejects the wrong length and punctuation", () => {
    expect(isSlug("abc12")).toBe(false);
    expect(isSlug("abc-12")).toBe(false);
  });
});
