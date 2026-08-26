import { describe, expect, it, vi } from "vitest";

import {
  buildCurlCommand,
  resolveConvexSiteUrl,
  resolveShareEndpoint,
  shareHtml,
} from "./api";

describe("resolveConvexSiteUrl", () => {
  it("derives the HTTP action URL from the Convex deployment URL", () => {
    expect(
      resolveConvexSiteUrl({
        VITE_CONVEX_URL: "https://steady-otter-123.convex.cloud",
      }),
    ).toBe("https://steady-otter-123.convex.site");
  });

  it("prefers an explicit site URL", () => {
    expect(
      resolveConvexSiteUrl({
        VITE_CONVEX_URL: "https://ignored.convex.cloud",
        VITE_CONVEX_SITE_URL: "https://html.example.com/",
      }),
    ).toBe("https://html.example.com");
  });

  it("allows the loopback URL written by local Convex", () => {
    expect(
      resolveConvexSiteUrl({
        VITE_CONVEX_SITE_URL: "http://127.0.0.1:3211",
      }),
    ).toBe("http://127.0.0.1:3211");
  });

  it("rejects plain HTTP outside local development", () => {
    expect(() =>
      resolveConvexSiteUrl({
        VITE_CONVEX_SITE_URL: "http://example.com",
      }),
    ).toThrow("must use HTTPS");
  });

  it("rejects missing configuration", () => {
    expect(() => resolveConvexSiteUrl({})).toThrow("Convex is not configured");
  });
});

describe("resolveShareEndpoint", () => {
  it("uses the service-domain proxy in production", () => {
    expect(
      resolveShareEndpoint({}, "https://shtml.example.com"),
    ).toBe("https://shtml.example.com/api/share");
  });

  it("uses Convex directly during local development", () => {
    expect(
      resolveShareEndpoint(
        { VITE_CONVEX_SITE_URL: "http://127.0.0.1:3211" },
        "http://localhost:5173",
      ),
    ).toBe("http://127.0.0.1:3211/share");
  });
});

describe("shareHtml", () => {
  it("returns the link from the API", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "page-id",
          slug: "aB3x9Q",
          url: "https://site.test/aB3x9Q",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(
      shareHtml("https://site.test/api/share", "<h1>Hello</h1>", request),
    ).resolves.toEqual({
      id: "page-id",
      slug: "aB3x9Q",
      url: "https://site.test/aB3x9Q",
    });
    expect(request).toHaveBeenCalledWith("https://site.test/api/share", {
      method: "POST",
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: "<h1>Hello</h1>",
    });
  });

  it("uses the API error message", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: "HTML is too large." }), {
          status: 413,
        }),
      );

    await expect(
      shareHtml("https://site.test/api/share", "<p>large</p>", request),
    ).rejects.toThrow("HTML is too large.");
  });

  it("rejects a malformed success response", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("{}", { status: 201 }));

    await expect(
      shareHtml("https://site.test/api/share", "<p>Hi</p>", request),
    ).rejects.toThrow("invalid response");
  });

  it("rejects a success response with an invalid slug", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "page-id",
          slug: "too-long",
          url: "https://site.test/too-long",
        }),
        { status: 201 },
      ),
    );

    await expect(
      shareHtml("https://site.test/api/share", "<p>Hi</p>", request),
    ).rejects.toThrow("invalid response");
  });
});

describe("buildCurlCommand", () => {
  it("builds a command that sends the file unchanged", () => {
    expect(buildCurlCommand("https://site.test/api/share")).toContain(
      "--data-binary @page.html",
    );
  });
});
