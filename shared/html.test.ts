import { describe, expect, it } from "vitest";

import { MAX_HTML_BYTES, getHtmlByteLength, validateHtml } from "./html";

describe("validateHtml", () => {
  it("accepts an HTML document", () => {
    expect(validateHtml("<!doctype html><h1>Hello</h1>")).toEqual({
      ok: true,
      byteLength: 29,
    });
  });

  it("rejects empty input", () => {
    expect(validateHtml(" \n\t ")).toEqual({
      ok: false,
      code: "empty",
      message: "Paste some HTML first.",
    });
  });

  it("counts UTF-8 bytes instead of JavaScript characters", () => {
    expect(getHtmlByteLength("é")).toBe(2);
  });

  it("rejects input above the storage limit", () => {
    const result = validateHtml("x".repeat(MAX_HTML_BYTES + 1));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("5 MiB");
    }
  });
});
