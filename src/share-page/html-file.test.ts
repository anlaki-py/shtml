import { describe, expect, it } from "vitest";

import { isHtmlFile } from "./html-file";

describe("isHtmlFile", () => {
  it("accepts HTML MIME types and file extensions", () => {
    expect(isHtmlFile({ name: "page", type: "text/html" })).toBe(true);
    expect(isHtmlFile({ name: "page.HTML", type: "" })).toBe(true);
    expect(isHtmlFile({ name: "page.htm", type: "text/plain" })).toBe(true);
  });

  it("rejects other files", () => {
    expect(isHtmlFile({ name: "notes.txt", type: "text/plain" })).toBe(false);
  });
});
